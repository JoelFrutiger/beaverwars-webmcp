import {
  WEBMCP_ADAPTER_VERSION,
  WEBMCP_PLAY_CONTRACT_VERSION,
} from "../contract/tool-definitions";
import type { WebMcpExecutionEvent } from "./register-tools";

const MAX_DIAGNOSTIC_EVENTS = 100;
type SafeDiagnosticEvent = Omit<
  WebMcpExecutionEvent,
  "completedTurn" | "retryable"
>;

export class WebMcpDiagnosticsController {
  private callsInCurrentTurn = 0;
  private readonly completedTurnToolCalls: number[] = [];
  private readonly events: SafeDiagnosticEvent[] = [];

  constructor(
    private readonly browserApiAvailable: boolean,
    private readonly sourceRevision?: string,
  ) {}

  record(event: WebMcpExecutionEvent): void {
    const { completedTurn, retryable, ...safeEvent } = event;
    void retryable;
    this.events.push(structuredClone(safeEvent));
    if (this.events.length > MAX_DIAGNOSTIC_EVENTS) this.events.shift();
    this.callsInCurrentTurn += 1;
    if (!completedTurn) return;
    this.completedTurnToolCalls.push(this.callsInCurrentTurn);
    if (this.completedTurnToolCalls.length > MAX_DIAGNOSTIC_EVENTS)
      this.completedTurnToolCalls.shift();
    this.callsInCurrentTurn = 0;
  }

  snapshot(): object {
    return {
      adapterVersion: WEBMCP_ADAPTER_VERSION,
      browserApiAvailable: this.browserApiAvailable,
      completedTurnToolCalls: [...this.completedTurnToolCalls],
      contractVersion: WEBMCP_PLAY_CONTRACT_VERSION,
      events: this.events.map((event) => ({ ...event })),
      ...(this.sourceRevision ? { sourceRevision: this.sourceRevision } : {}),
    };
  }
}
