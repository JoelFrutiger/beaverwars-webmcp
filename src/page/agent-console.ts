import type { PageBoundPlaySnapshot } from "../runtime/page-bound-session";
import type { WebMcpExecutionEvent } from "../runtime/register-tools";
import type { PageBoundToolName } from "../contract/tool-definitions";

type AgentConsoleControls = {
  copyDiagnostics: () => void;
  disconnect: () => void;
  forget: () => void;
  reconnect: () => void;
};

export class AgentConsole {
  private expiryAt: number | null = null;
  private expiryTimer: ReturnType<typeof setInterval> | null = null;
  private readonly supportBadge: HTMLElement;
  private readonly toolsBadge: HTMLElement;

  constructor(private readonly documentRef: Document) {
    this.supportBadge = required(documentRef, "webMcpSupportBadge");
    this.toolsBadge = required(documentRef, "siteToolsBadge");
  }

  bindControls(controls: AgentConsoleControls): void {
    requiredButton(this.documentRef, "reconnectButton").addEventListener(
      "click",
      controls.reconnect,
    );
    requiredButton(this.documentRef, "disconnectButton").addEventListener(
      "click",
      controls.disconnect,
    );
    requiredButton(this.documentRef, "forgetButton").addEventListener(
      "click",
      controls.forget,
    );
    requiredButton(this.documentRef, "copyDiagnosticsButton").addEventListener(
      "click",
      controls.copyDiagnostics,
    );
  }

  dispose(): void {
    if (this.expiryTimer !== null) clearInterval(this.expiryTimer);
  }

  render(snapshot: PageBoundPlaySnapshot): void {
    const state = snapshot.currentState;
    text(this.documentRef, "lastTool", displayTool(snapshot.lastTool));
    text(
      this.documentRef,
      "lastAction",
      snapshot.lastActionStatus
        ? `${snapshot.lastActionLabel ?? "Unknown action"} · ${snapshot.lastActionStatus}`
        : "None",
    );
    text(
      this.documentRef,
      "matchRound",
      state?.match.mode === "lobby"
        ? "Lobby"
        : String(state?.match.round ?? "—"),
    );
    const player = state?.players.find(
      (candidate) => candidate.relation === "you",
    );
    text(
      this.documentRef,
      "matchSeat",
      state
        ? `${state.seat.seatId + 1}${player ? ` / ${player.teamId + 1}` : ""}`
        : "—",
    );
    text(
      this.documentRef,
      "matchCanAct",
      state ? (state.seat.canAct ? "Yes" : "No") : "—",
    );
    text(
      this.documentRef,
      "matchClock",
      snapshot.roundTimer?.remainingSeconds == null
        ? "—"
        : `${snapshot.roundTimer.remainingSeconds}s`,
    );
    text(
      this.documentRef,
      "matchUnits",
      state
        ? String(
            state.board.units.filter((unit) => unit.relation === "you").length,
          )
        : "—",
    );
    text(
      this.documentRef,
      "matchLodges",
      state
        ? String(
            state.board.buildings.filter(
              (building) =>
                building.relation === "you" && building.type === "lodge",
            ).length,
          )
        : "—",
    );
    this.updateConnection(snapshot);
    requiredButton(this.documentRef, "reconnectButton").disabled =
      snapshot.lifecycle !== "idle" || snapshot.joinTarget !== "resume";
    requiredButton(this.documentRef, "disconnectButton").disabled =
      snapshot.lifecycle !== "active";
    requiredButton(this.documentRef, "forgetButton").disabled =
      snapshot.lifecycle !== "idle" || snapshot.joinTarget !== "resume";
  }

  setControlStatus(message: string): void {
    text(this.documentRef, "controlStatus", message);
  }

  setExpiry(expiresAt: number | null): void {
    this.expiryAt = expiresAt;
    required(this.documentRef, "expiryWrap").hidden = expiresAt === null;
    if (expiresAt === null) return;
    this.updateExpiry();
    this.expiryTimer ??= setInterval(() => this.updateExpiry(), 1_000);
  }

  setInvitationStatus(message: string): void {
    text(this.documentRef, "invitationStatus", message);
  }

  setPlatform(
    status: "blocked" | "ready",
    support: string,
    tools: string,
  ): void {
    this.supportBadge.className = `status-badge status-badge--${status}`;
    this.supportBadge.textContent = support;
    this.toolsBadge.className = `status-badge status-badge--${status}`;
    this.toolsBadge.textContent = tools;
  }

  setStatus(
    title: string,
    message: string,
    tone: "blocked" | "ready" | "waiting" = "waiting",
  ): void {
    text(this.documentRef, "connectionHeading", title);
    text(this.documentRef, "connectionMessage", message);
    required(this.documentRef, "connectionDot").dataset.tone = tone;
  }

  toolStarted(name: PageBoundToolName): void {
    text(this.documentRef, "lastTool", displayTool(name));
    text(this.documentRef, "lastExecution", "Running…");
  }

  toolFinished(event: WebMcpExecutionEvent): void {
    text(this.documentRef, "lastTool", displayTool(event.name));
    text(
      this.documentRef,
      "lastExecution",
      event.success
        ? `Succeeded · ${Math.round(event.durationMs)}ms`
        : `${event.errorCode ?? "failed"} · ${event.retryable ? "retry available" : "terminal"}`,
    );
    text(
      this.documentRef,
      "recoveryStatus",
      event.resetRequired ? "Snapshot reset supplied" : "Not needed",
    );
  }

  private updateConnection(snapshot: PageBoundPlaySnapshot): void {
    const state = snapshot.currentState;
    if (snapshot.lifecycle === "joining")
      return this.setStatus(
        "Connecting",
        "Beaver Wars is establishing the agent session.",
        "waiting",
      );
    if (snapshot.lifecycle === "closing")
      return this.setStatus(
        "Disconnecting",
        "Beaver Wars is closing the agent session.",
        "waiting",
      );
    if (!snapshot.active) {
      if (snapshot.joinTarget === "invitation")
        return this.setStatus(
          "Ready for agent to join",
          "Ask the browser agent to call join_agent_seat. Opening this page did not consume the invitation.",
          "ready",
        );
      if (snapshot.joinTarget === "resume")
        return this.setStatus(
          "Disconnected; reconnect available",
          "Resume the saved seat from this browser profile.",
          "waiting",
        );
      return this.setStatus(
        "No agent seat available",
        "Ask the host for a new browser-agent link or return to Agent Setup.",
        "blocked",
      );
    }
    if (!state)
      return this.setStatus(
        "Connecting",
        "Beaver Wars is establishing the agent session.",
        "waiting",
      );
    if (state.match.over)
      return this.setStatus(
        "Match over",
        "The authoritative match has ended.",
        "ready",
      );
    if (state.match.mode === "lobby") {
      const seat = state.lobbySeats?.find(
        (candidate) => candidate.seatId === state.seat.seatId,
      );
      if (seat?.requestedDifficulty && !seat.approvedDifficulty)
        return this.setStatus(
          "Waiting for host approval",
          `Difficulty requested: ${seat.requestedDifficulty}. The host must approve it before starting.`,
          "waiting",
        );
      return this.setStatus(
        "Waiting for match start",
        "The seat is connected. The human host controls match start.",
        "waiting",
      );
    }
    this.setStatus(
      "Match active",
      state.seat.canAct
        ? "This seat can act now."
        : "This seat is waiting for another turn or settlement.",
      "ready",
    );
  }

  private updateExpiry(): void {
    if (this.expiryAt === null) return;
    const remaining = Math.max(0, this.expiryAt - Date.now());
    text(
      this.documentRef,
      "expiryCountdown",
      remaining === 0
        ? "Expired"
        : `${Math.floor(remaining / 60_000)}:${String(Math.floor((remaining % 60_000) / 1_000)).padStart(2, "0")}`,
    );
  }
}

function displayTool(name: PageBoundToolName | null): string {
  return name?.replaceAll("_", " ") ?? "None";
}
function required(documentRef: Document, id: string): HTMLElement {
  const element = documentRef.getElementById(id);
  if (!element) throw new Error(`Missing agent console element #${id}.`);
  return element;
}
function requiredButton(documentRef: Document, id: string): HTMLButtonElement {
  return required(documentRef, id) as HTMLButtonElement;
}
function text(documentRef: Document, id: string, value: string): void {
  required(documentRef, id).textContent = value;
}
