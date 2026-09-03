import * as z from "zod/v4";
import { AgentPlayError } from "../contract/errors";
import {
  PAGE_BOUND_INPUT_SCHEMAS,
  PAGE_BOUND_OUTPUT_SCHEMAS,
  type PageBoundToolName,
  type WebMcpGameplayToolName,
} from "../contract/tool-definitions";
import type { PlayCompactStateV8 } from "../contract/schemas";
import { applyPlayStatePatch } from "../contract/state-patch";
import type {
  AgentLaunchDescriptor,
  AgentPlayService,
  JoinResult,
} from "../contract/types";

export type PageBoundPlayLifecycle =
  "idle" | "joining" | "active" | "closing" | "disposed";
export type PageBoundPlaySnapshot = {
  active: boolean;
  currentState: PlayCompactStateV8 | null;
  joinReady: boolean;
  joinTarget: "invitation" | "resume" | null;
  lastActionLabel: string | null;
  lastActionStatus: "accepted" | "partial" | "rejected" | null;
  lastTool: PageBoundToolName | null;
  lifecycle: PageBoundPlayLifecycle;
  roundTimer:
    | z.output<
        (typeof PAGE_BOUND_OUTPUT_SCHEMAS)["join_agent_seat"]
      >["roundTimer"]
    | null;
};

export class PageBoundPlaySession {
  private currentState: PlayCompactStateV8 | null = null;
  private joinTarget: "invitation" | "resume" | null;
  private lastActionLabel: string | null = null;
  private lastActionStatus: "accepted" | "partial" | "rejected" | null = null;
  private lastClose: z.output<
    (typeof PAGE_BOUND_OUTPUT_SCHEMAS)["close_match"]
  > | null = null;
  private lastTool: PageBoundToolName | null = null;
  private lifecycle: PageBoundPlayLifecycle = "idle";
  private roundTimer: PageBoundPlaySnapshot["roundTimer"] = null;
  private closePromise: Promise<
    z.output<(typeof PAGE_BOUND_OUTPUT_SCHEMAS)["close_match"]>
  > | null = null;
  private joinGeneration = 0;
  private readonly listeners = new Set<
    (snapshot: PageBoundPlaySnapshot) => void
  >();

  constructor(
    private readonly service: AgentPlayService,
    launch: AgentLaunchDescriptor,
    private readonly onJoined?: (result: JoinResult) => Promise<void> | void,
  ) {
    this.joinTarget = launch.kind === "none" ? null : launch.kind;
  }

  snapshot(): PageBoundPlaySnapshot {
    return {
      active: this.lifecycle === "active" || this.lifecycle === "closing",
      currentState: this.currentState
        ? structuredClone(this.currentState)
        : null,
      joinReady: this.joinTarget !== null,
      joinTarget: this.joinTarget,
      lastActionLabel: this.lastActionLabel,
      lastActionStatus: this.lastActionStatus,
      lastTool: this.lastTool,
      lifecycle: this.lifecycle,
      roundTimer: this.roundTimer ? structuredClone(this.roundTimer) : null,
    };
  }

  subscribe(listener: (snapshot: PageBoundPlaySnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  async execute(
    name: PageBoundToolName,
    rawInput: unknown,
    signal?: AbortSignal,
  ): Promise<unknown> {
    if (name === "game_guide") {
      const input = PAGE_BOUND_INPUT_SCHEMAS.game_guide.parse(rawInput);
      const output = PAGE_BOUND_OUTPUT_SCHEMAS.game_guide.parse(
        await this.service.gameGuide(input, signal),
      );
      this.remember(name);
      return output;
    }
    if (name === "join_agent_seat") return this.join(rawInput, signal);
    if (name === "close_match") return this.close(rawInput, signal);
    return this.executeGameplay(name, rawInput, signal);
  }

  forgetTarget(): void {
    if (this.lifecycle !== "idle") return;
    this.joinTarget = null;
    this.emit();
  }

  dispose(): void {
    if (this.lifecycle === "disposed") return;
    this.joinGeneration += 1;
    this.lifecycle = "disposed";
    this.service.dispose();
    this.joinTarget = null;
    this.currentState = null;
    this.roundTimer = null;
    this.emit();
  }

  private async join(
    rawInput: unknown,
    signal?: AbortSignal,
  ): Promise<JoinResult> {
    if (this.lifecycle === "joining")
      throw new AgentPlayError(
        "join-in-progress",
        true,
        "This page is already joining an agent seat.",
      );
    if (this.lifecycle === "active" || this.lifecycle === "closing")
      throw new AgentPlayError(
        "session-already-active",
        false,
        "This page already owns an active agent seat.",
      );
    if (this.lifecycle === "disposed")
      throw new AgentPlayError(
        "no-active-session",
        false,
        "This agent page has been closed.",
      );
    if (!this.joinTarget)
      throw new AgentPlayError(
        "invitation-missing",
        false,
        "Open the seat-specific browser agent link supplied by the host.",
      );

    const input = PAGE_BOUND_INPUT_SCHEMAS.join_agent_seat.parse(rawInput);
    if (
      this.joinTarget === "resume" &&
      (input.displayName !== undefined || input.playerDifficulty !== undefined)
    )
      throw new AgentPlayError(
        "invalid-arguments",
        false,
        "A saved seat resumes with its existing settings.",
      );

    const generation = ++this.joinGeneration;
    this.lifecycle = "joining";
    this.emit();
    let output: JoinResult;
    try {
      output = PAGE_BOUND_OUTPUT_SCHEMAS.join_agent_seat.parse(
        await this.service.join(input, signal),
      );
      if (generation !== this.joinGeneration || this.lifecycle !== "joining") {
        await this.service.close().catch(() => undefined);
        throw new AgentPlayError(
          "aborted",
          true,
          "The agent-seat join was cancelled.",
        );
      }
      this.lifecycle = "active";
      this.joinTarget = "resume";
      this.lastClose = null;
      this.currentState = structuredClone(output.currentState);
      this.roundTimer = structuredClone(output.roundTimer);
      await this.onJoined?.(output);
      if (generation !== this.joinGeneration || this.isDisposed()) {
        await this.service.close().catch(() => undefined);
        throw new AgentPlayError(
          "aborted",
          true,
          "The agent-seat join was cancelled.",
        );
      }
      this.remember("join_agent_seat");
      return output;
    } catch (error) {
      if (generation === this.joinGeneration && this.lifecycle === "joining") {
        this.lifecycle = "idle";
        if (isTerminalInvitationError(error)) this.joinTarget = null;
        this.emit();
      }
      throw error;
    }
  }

  private async executeGameplay(
    name: WebMcpGameplayToolName,
    rawInput: unknown,
    signal?: AbortSignal,
  ): Promise<unknown> {
    this.requireSession();
    const input = PAGE_BOUND_INPUT_SCHEMAS[name].parse(rawInput);
    const output = PAGE_BOUND_OUTPUT_SCHEMAS[name].parse(
      await callGameplay(this.service, name, input, signal),
    );
    this.updateCurrentState(output);
    this.remember(name);
    return output;
  }

  private async close(
    rawInput: unknown,
    signal?: AbortSignal,
  ): Promise<z.output<(typeof PAGE_BOUND_OUTPUT_SCHEMAS)["close_match"]>> {
    PAGE_BOUND_INPUT_SCHEMAS.close_match.parse(rawInput);
    if (this.lifecycle === "joining")
      throw new AgentPlayError(
        "join-in-progress",
        true,
        "Wait for the agent-seat join to finish.",
      );
    if (this.lifecycle === "closing" && this.closePromise)
      return this.closePromise;
    if (this.lifecycle !== "active") {
      if (this.lastClose) return structuredClone(this.lastClose);
      throw new AgentPlayError(
        "no-active-session",
        false,
        "Join or resume an agent seat first.",
      );
    }
    this.lifecycle = "closing";
    this.emit();
    const closing = (async () => {
      const closed = PAGE_BOUND_OUTPUT_SCHEMAS.close_match.parse(
        await this.service.close(signal),
      );
      this.lastClose = structuredClone(closed);
      this.currentState = null;
      this.roundTimer = null;
      if (!this.isDisposed()) this.lifecycle = "idle";
      this.remember("close_match");
      return closed;
    })();
    this.closePromise = closing;
    try {
      return await closing;
    } catch (error) {
      if (!this.isDisposed()) {
        this.lifecycle = "active";
        this.emit();
      }
      throw error;
    } finally {
      if (this.closePromise === closing) this.closePromise = null;
    }
  }

  private requireSession(): void {
    if (this.lifecycle !== "active")
      throw new AgentPlayError(
        "no-active-session",
        false,
        "Join or resume an agent seat first.",
      );
  }

  private isDisposed(): boolean {
    return this.lifecycle === "disposed";
  }

  private updateCurrentState(output: unknown): void {
    if (!output || typeof output !== "object") return;
    const result = output as {
      action?: { label?: string };
      currentState?: PlayCompactStateV8;
      patch?: Parameters<typeof applyPlayStatePatch>[1];
      roundTimer?: NonNullable<PageBoundPlaySnapshot["roundTimer"]>;
      status?: string;
    };
    if (result.currentState)
      this.currentState = structuredClone(result.currentState);
    else if (result.patch && this.currentState)
      this.currentState = applyPlayStatePatch(this.currentState, result.patch);
    if (result.roundTimer) this.roundTimer = structuredClone(result.roundTimer);
    if (
      result.status === "accepted" ||
      result.status === "partial" ||
      result.status === "rejected"
    ) {
      this.lastActionLabel = result.action?.label ?? "Unknown action";
      this.lastActionStatus = result.status;
    }
  }

  private remember(name: PageBoundToolName): void {
    this.lastTool = name;
    this.emit();
  }

  private emit(): void {
    const snapshot = this.snapshot();
    this.listeners.forEach((listener) => listener(snapshot));
  }
}

function callGameplay(
  service: AgentPlayService,
  name: WebMcpGameplayToolName,
  input: unknown,
  signal?: AbortSignal,
): Promise<unknown> {
  if (name === "observe")
    return service.observe(
      PAGE_BOUND_INPUT_SCHEMAS.observe.parse(input),
      signal,
    );
  if (name === "list_actions")
    return service.listActions(
      PAGE_BOUND_INPUT_SCHEMAS.list_actions.parse(input),
      signal,
    );
  if (name === "act")
    return service.act(PAGE_BOUND_INPUT_SCHEMAS.act.parse(input), signal);
  return service.waitUntilActing(
    PAGE_BOUND_INPUT_SCHEMAS.wait_until_acting.parse(input),
    signal,
  );
}

function isTerminalInvitationError(error: unknown): boolean {
  return (
    error instanceof AgentPlayError &&
    [
      "invitation-expired",
      "invitation-invalid",
      "invitation-unavailable",
    ].includes(error.code)
  );
}
