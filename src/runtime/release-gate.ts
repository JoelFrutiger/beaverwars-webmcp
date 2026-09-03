import { AgentPlayError } from "../contract/errors";

export const WEB_MCP_CONFIG_POLL_MS = 30_000;
export const WEB_MCP_CONFIG_GRACE_MS = 120_000;
export const WEB_MCP_CONFIG_TIMEOUT_MS = 3_000;

export type WebMcpReleaseConfig = {
  enabled: boolean;
  minimumContractVersion: string;
};

type ActiveRefresh = {
  controller: AbortController;
  promise: Promise<WebMcpReleaseConfig>;
  settled: boolean;
  waiters: number;
};

export class WebMcpReleaseGate {
  private disabled = false;
  private inFlight: ActiveRefresh | null = null;
  private lastAttemptAt: number | null = null;
  private lastValidAt: number | null = null;

  constructor(
    private readonly options: {
      currentContractVersion: string;
      load(signal: AbortSignal): Promise<WebMcpReleaseConfig>;
      now?: () => number;
      timeoutMs?: number;
    },
  ) {}

  async initialize(signal?: AbortSignal): Promise<void> {
    try {
      const config = await this.fetchConfig(signal);
      this.requireEnabled(config);
      this.lastValidAt = this.now();
    } catch (error) {
      if (signal?.aborted || error instanceof AgentPlayError) throw error;
      throw unavailableError();
    }
  }

  async revalidate(signal?: AbortSignal): Promise<void> {
    if (this.disabled) throw disabledError();
    if (signal?.aborted) throw abortError();
    const checkedAt = this.now();
    if (
      this.lastValidAt !== null &&
      checkedAt - this.lastValidAt < WEB_MCP_CONFIG_POLL_MS
    )
      return;
    if (
      this.lastValidAt !== null &&
      checkedAt - this.lastValidAt <= WEB_MCP_CONFIG_GRACE_MS
    ) {
      if (
        !this.inFlight &&
        (this.lastAttemptAt === null ||
          checkedAt - this.lastAttemptAt >= WEB_MCP_CONFIG_POLL_MS)
      )
        void this.refresh().catch(() => undefined);
      return;
    }
    try {
      await this.refresh(signal);
    } catch (error) {
      if (signal?.aborted) throw abortError();
      if (error instanceof AgentPlayError) throw error;
      if (
        this.lastValidAt !== null &&
        this.now() - this.lastValidAt <= WEB_MCP_CONFIG_GRACE_MS
      )
        return;
      this.disabled = true;
      throw unavailableError();
    }
  }

  private now(): number {
    return (this.options.now ?? Date.now)();
  }

  private async refresh(signal?: AbortSignal): Promise<WebMcpReleaseConfig> {
    const config = await this.fetchConfig(signal);
    this.requireEnabled(config);
    this.lastValidAt = this.now();
    return config;
  }

  private fetchConfig(signal?: AbortSignal): Promise<WebMcpReleaseConfig> {
    if (signal?.aborted) return Promise.reject(abortError());
    let active = this.inFlight;
    if (!active) {
      const controller = new AbortController();
      const timeout = AbortSignal.timeout(
        this.options.timeoutMs ?? WEB_MCP_CONFIG_TIMEOUT_MS,
      );
      const created: ActiveRefresh = {
        controller,
        promise: Promise.resolve(null as never),
        settled: false,
        waiters: 0,
      };
      created.promise = this.options
        .load(AbortSignal.any([controller.signal, timeout]))
        .finally(() => {
          created.settled = true;
          if (this.inFlight === created) this.inFlight = null;
        });
      this.lastAttemptAt = this.now();
      this.inFlight = active = created;
    }
    active.waiters += 1;
    return waitForSignal(active.promise, signal).finally(() => {
      active.waiters -= 1;
      if (!active.settled && active.waiters === 0) active.controller.abort();
    });
  }

  private requireEnabled(config: WebMcpReleaseConfig): void {
    const minimum = Number(config.minimumContractVersion);
    const current = Number(this.options.currentContractVersion);
    if (
      config.enabled &&
      Number.isSafeInteger(minimum) &&
      Number.isSafeInteger(current) &&
      current >= minimum
    )
      return;
    this.disabled = true;
    throw disabledError();
  }
}

export function parseWebMcpReleaseConfig(
  value: unknown,
): WebMcpReleaseConfig | null {
  if (!value || typeof value !== "object") return null;
  const config = value as Partial<WebMcpReleaseConfig>;
  if (
    typeof config.enabled !== "boolean" ||
    !/^\d+$/.test(config.minimumContractVersion ?? "")
  )
    return null;
  return {
    enabled: config.enabled,
    minimumContractVersion: config.minimumContractVersion!,
  };
}

function waitForSignal<T>(
  promise: Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(abortError());
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(abortError());
    signal.addEventListener("abort", abort, { once: true });
    promise
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", abort));
  });
}

function abortError(): DOMException {
  return new DOMException("The operation was aborted.", "AbortError");
}

function disabledError(): AgentPlayError {
  return new AgentPlayError(
    "webmcp-disabled",
    false,
    "WebMCP is disabled or requires a newer play contract.",
  );
}

function unavailableError(): AgentPlayError {
  return new AgentPlayError(
    "webmcp-unavailable",
    true,
    "WebMCP release configuration could not be verified.",
  );
}
