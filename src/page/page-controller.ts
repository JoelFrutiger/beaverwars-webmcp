/// <reference types="webmcp-types" />

import type { AgentPageController, AgentPageHost } from "../contract/types";
import { WEB_MCP_CONFIG_POLL_MS } from "../runtime/release-gate";
import { WebMcpDiagnosticsController } from "../runtime/diagnostics";
import {
  PageBoundPlaySession,
  type PageBoundPlaySnapshot,
} from "../runtime/page-bound-session";
import {
  registerPlayWebMcpTools,
  sanitizeWebMcpError,
  type WebMcpExecutionEvent,
} from "../runtime/register-tools";
import {
  getWebMcpModelContext,
  isWebMcpOriginIsolated,
} from "../runtime/platform";
import { AgentConsole } from "./agent-console";
import { mountAgentPageTemplate } from "./agent-template";

export async function mountAgentPage(options: {
  document?: Document;
  host: AgentPageHost;
  root: HTMLElement;
  window?: Window;
}): Promise<AgentPageController> {
  const documentRef = options.document ?? document;
  const windowRef = options.window ?? window;
  mountAgentPageTemplate(options.root);
  const ui = new AgentConsole(documentRef);
  presentLaunch(ui, options.host);

  const registration = new AbortController();
  const session = new PageBoundPlaySession(
    options.host.service,
    options.host.launch,
    options.host.onJoined,
  );
  let lastSnapshot: PageBoundPlaySnapshot | null = null;
  let lastExecution: WebMcpExecutionEvent | null = null;
  let toolsReady = false;
  let disposed = false;
  let runtimeDisabled = false;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  const unsubscribe = session.subscribe((snapshot) => {
    lastSnapshot = snapshot;
    ui.render(snapshot);
  });

  ui.bindControls({
    copyDiagnostics: () => void copyDiagnostics(),
    disconnect: () => void disconnect(),
    forget: () => void forget(),
    reconnect: () => void reconnect(),
  });

  try {
    await options.host.runtimeGate.initialize(registration.signal);
  } catch (error) {
    const safe = sanitizeWebMcpError(error);
    const disabled = safe.code === "webmcp-disabled";
    ui.setPlatform(
      "blocked",
      disabled ? "WebMCP disabled" : "WebMCP configuration unavailable",
      "Site tools offline",
    );
    ui.setStatus(
      disabled
        ? "WebMCP disabled by release configuration"
        : "Tool registration paused",
      disabled
        ? "Use the installed Agent Connector while browser-agent access is disabled."
        : "The release configuration could not be verified. The informational page remains available.",
      "blocked",
    );
    return { dispose };
  }

  const modelContext = getWebMcpModelContext(documentRef);
  if (!modelContext) {
    ui.setPlatform("blocked", "WebMCP unavailable", "Site tools offline");
    ui.setStatus(
      "This browser does not expose WebMCP",
      "Open the link in a supported site-tools browser, or use the installed Agent Connector.",
      "blocked",
    );
    return { dispose };
  }
  if (!isWebMcpOriginIsolated(windowRef)) {
    ui.setPlatform("blocked", "WebMCP found", "Origin isolation required");
    ui.setStatus(
      "The page is not origin-isolated",
      "Browser-agent tools stay offline until the origin returns the required isolation header.",
      "blocked",
    );
    return { dispose };
  }

  const diagnostics = new WebMcpDiagnosticsController(
    true,
    options.host.diagnostics?.sourceRevision,
  );
  try {
    await registerPlayWebMcpTools({
      beforeExecution: async (signal) => {
        try {
          await options.host.runtimeGate.revalidate(signal);
        } catch (error) {
          disableRuntime(sanitizeWebMcpError(error).message);
          throw error;
        }
      },
      executionSignal: registration.signal,
      includeSeatTools: session.snapshot().joinReady,
      modelContext,
      onExecution: (event) => {
        lastExecution = event;
        diagnostics.record(event);
        ui.toolFinished(event);
      },
      onExecutionStart: (name) => ui.toolStarted(name),
      session,
      signal: registration.signal,
    });
    toolsReady = true;
    ui.setPlatform("ready", "WebMCP supported", "Site tools ready");
    if (!session.snapshot().joinReady)
      ui.setStatus(
        "No agent seat supplied",
        "The game guide is available. Ask a host for a seat-specific browser-agent link to play.",
        "waiting",
      );
  } catch {
    registration.abort();
    ui.setPlatform(
      "blocked",
      "WebMCP registration failed",
      "Site tools offline",
    );
    ui.setStatus(
      "Site tools could not register",
      "Reload this page or use the installed Agent Connector.",
      "blocked",
    );
    return { dispose };
  }

  if (session.snapshot().joinTarget === "resume") void reconnect(true);
  pollTimer = setInterval(
    () => void revalidateRelease(),
    WEB_MCP_CONFIG_POLL_MS,
  );
  documentRef.addEventListener("visibilitychange", onVisibilityChange);
  windowRef.addEventListener("pagehide", dispose, { once: true });
  return { dispose };

  async function reconnect(automatic = false): Promise<void> {
    if (
      session.snapshot().lifecycle !== "idle" ||
      session.snapshot().joinTarget !== "resume"
    )
      return;
    ui.setStatus("Connecting", "Reclaiming the saved agent seat.", "waiting");
    ui.setControlStatus(automatic ? "Resuming saved seat…" : "Reconnecting…");
    try {
      await options.host.runtimeGate.revalidate(registration.signal);
      await session.execute("join_agent_seat", {}, registration.signal);
      ui.setControlStatus("Seat connected.");
    } catch (error) {
      const safe = sanitizeWebMcpError(error);
      ui.setStatus(
        safe.code === "credential-stale"
          ? "Saved seat unavailable"
          : "Reconnect failed",
        safe.message,
        "blocked",
      );
      ui.setControlStatus(
        safe.retryable
          ? "Retry is available."
          : "Forget this seat and request a new invitation.",
      );
    }
  }

  async function disconnect(): Promise<void> {
    if (session.snapshot().lifecycle !== "active") return;
    try {
      await session.execute("close_match", {});
      ui.setControlStatus(
        "Disconnected. The reconnect credential is preserved.",
      );
    } catch (error) {
      ui.setControlStatus(sanitizeWebMcpError(error).message);
    }
  }

  async function forget(): Promise<void> {
    if (
      session.snapshot().lifecycle !== "idle" ||
      session.snapshot().joinTarget !== "resume"
    )
      return;
    if (
      !windowRef.confirm(
        "Forget this saved agent seat? The server may keep it reserved until the match expires.",
      )
    )
      return;
    await options.host.forgetSavedTarget?.();
    session.forgetTarget();
    ui.setInvitationStatus("No invitation supplied.");
    ui.setStatus(
      "Seat forgotten",
      "Ask the host for a new browser-agent link to join again.",
      "waiting",
    );
    ui.setControlStatus(
      "Local reconnect data removed. The server seat was not forcibly released.",
    );
  }

  async function copyDiagnostics(): Promise<void> {
    const value = JSON.stringify(
      {
        active: lastSnapshot?.active ?? false,
        diagnostics: diagnostics.snapshot(),
        lastErrorCode: lastExecution?.errorCode ?? null,
        lastTool: lastExecution?.name ?? lastSnapshot?.lastTool ?? null,
        originIsolated: isWebMcpOriginIsolated(windowRef),
        seatTarget: lastSnapshot?.joinTarget ?? null,
        toolsReady,
      },
      null,
      2,
    );
    try {
      await windowRef.navigator.clipboard.writeText(value);
      ui.setControlStatus("Redacted diagnostics copied.");
    } catch {
      ui.setControlStatus("Could not access the clipboard.");
    }
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    registration.abort();
    if (pollTimer !== null) clearInterval(pollTimer);
    documentRef.removeEventListener("visibilitychange", onVisibilityChange);
    windowRef.removeEventListener("pagehide", dispose);
    unsubscribe();
    session.dispose();
    ui.dispose();
  }

  function onVisibilityChange(): void {
    if (documentRef.visibilityState === "visible") void revalidateRelease();
  }

  async function revalidateRelease(): Promise<void> {
    if (disposed || runtimeDisabled) return;
    try {
      await options.host.runtimeGate.revalidate();
    } catch (error) {
      disableRuntime(sanitizeWebMcpError(error).message);
    }
  }

  function disableRuntime(message: string): void {
    if (runtimeDisabled) return;
    runtimeDisabled = true;
    toolsReady = false;
    if (pollTimer !== null) clearInterval(pollTimer);
    pollTimer = null;
    registration.abort();
    session.dispose();
    ui.setPlatform("blocked", "WebMCP disabled", "Site tools offline");
    ui.setStatus(
      "WebMCP disabled by release configuration",
      message,
      "blocked",
    );
  }
}

function presentLaunch(ui: AgentConsole, host: AgentPageHost): void {
  if (host.launchMessage) ui.setInvitationStatus(host.launchMessage);
  else if (host.launch.kind === "invitation")
    ui.setInvitationStatus(
      "Invitation loaded. Its secret is held privately by the host application.",
    );
  else if (host.launch.kind === "resume")
    ui.setInvitationStatus(
      "Saved seat selected. Reconnect will start automatically.",
    );
  else ui.setInvitationStatus("No invitation supplied.");
  ui.setExpiry(
    host.launch.kind === "invitation" ? host.launch.expiresAt : null,
  );
}
