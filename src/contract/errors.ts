export const AGENT_PLAY_ERROR_CODES = [
  "aborted",
  "credential-stale",
  "invalid-arguments",
  "invitation-expired",
  "invitation-already-redeemed",
  "invitation-invalid",
  "invitation-missing",
  "invitation-unavailable",
  "join-in-progress",
  "join-timeout",
  "match-not-started",
  "no-active-session",
  "offline",
  "server-refused",
  "settlement-timeout",
  "session-already-active",
  "webmcp-disabled",
  "webmcp-unavailable",
  "waiting-for-host-approval",
] as const;

export type AgentPlayErrorCode = (typeof AGENT_PLAY_ERROR_CODES)[number];

export class AgentPlayError extends Error {
  constructor(
    readonly code: AgentPlayErrorCode,
    readonly retryable: boolean,
    readonly safeMessage: string,
  ) {
    super(safeMessage);
    this.name = "AgentPlayError";
  }
}

export type AgentPlaySafeError = {
  code: AgentPlayErrorCode;
  message: string;
  retryable: boolean;
};
