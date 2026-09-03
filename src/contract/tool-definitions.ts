import * as z from "zod/v4";
import {
  actInputSchema,
  actOutputSchema,
  closeMatchOutputSchema,
  gameGuideInputSchema,
  gameGuideOutputSchema,
  listActionsInputSchema,
  listActionsOutputSchema,
  observeInputSchema,
  observeOutputSchema,
  startMatchOutputSchema,
  waitUntilActingInputSchema,
  waitUntilActingOutputSchema,
} from "./schemas";

export const WEBMCP_ADAPTER_VERSION = "0.1.0";
export const WEBMCP_PLAY_CONTRACT_VERSION = "10";
export const WEB_MCP_GAMEPLAY_TOOL_NAMES = [
  "observe",
  "list_actions",
  "act",
  "wait_until_acting",
] as const;
export type WebMcpGameplayToolName =
  (typeof WEB_MCP_GAMEPLAY_TOOL_NAMES)[number];
export type PageBoundToolName =
  "game_guide" | "join_agent_seat" | WebMcpGameplayToolName | "close_match";

export const joinAgentSeatInputSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(1)
      .max(32)
      .refine(validDisplayName, "Choose a valid Beaver Wars display name.")
      .optional()
      .describe(
        "Optional public agent name. Omit it to use the seat's deterministic Agent name.",
      ),
    playerDifficulty: z
      .enum(["easy", "normal", "hard", "expert", "heroic"])
      .optional()
      .describe(
        "Requested generated shooting difficulty. The human host must approve it.",
      ),
  })
  .strict();

const pageListActionsShape = omitSessionId(listActionsInputSchema.shape);
const pageListActionsInputSchema = z
  .object(pageListActionsShape)
  .strict()
  .superRefine((value, context) => {
    const parsed = listActionsInputSchema.safeParse({
      ...value,
      sessionId: "page-bound",
    });
    if (parsed.success) return;
    parsed.error.issues.forEach((issue) =>
      context.addIssue({
        code: "custom",
        message: issue.message,
        path: issue.path,
      }),
    );
  });

export const PAGE_BOUND_INPUT_SCHEMAS = {
  act: actInputSchema.omit({ sessionId: true }),
  close_match: z.object({}).strict(),
  game_guide: gameGuideInputSchema,
  join_agent_seat: joinAgentSeatInputSchema,
  list_actions: pageListActionsInputSchema,
  observe: observeInputSchema.omit({ sessionId: true }),
  wait_until_acting: waitUntilActingInputSchema.omit({ sessionId: true }),
} as const;

export const PAGE_BOUND_OUTPUT_SCHEMAS = {
  act: actOutputSchema,
  close_match: closeMatchOutputSchema,
  game_guide: gameGuideOutputSchema,
  join_agent_seat: startMatchOutputSchema,
  list_actions: listActionsOutputSchema,
  observe: observeOutputSchema,
  wait_until_acting: waitUntilActingOutputSchema,
} as const;

export type WebMcpPageToolDefinition = {
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  description: string;
  inputSchema: z.ZodType;
  name: PageBoundToolName;
  outputSchema: z.ZodType;
  title: string;
};

export const WEB_MCP_TOOL_DEFINITIONS: readonly WebMcpPageToolDefinition[] = [
  tool(
    "game_guide",
    "Beaver Wars Guide",
    "Read concise reviewed Beaver Wars rules and canonical reference entries. Defaults to overview; request detailed topics only when needed.",
    true,
    false,
  ),
  tool(
    "join_agent_seat",
    "Join Agent Seat",
    "Redeem the invitation held privately by this page, choose an optional display name and shooting difficulty, and join the reserved agent seat. The human host must approve the difficulty and start the match.",
    false,
    true,
  ),
  tool(
    "observe",
    "Observe Match",
    "Read state or changes since a cursor. Cursor mismatch returns recovery state.",
    true,
    true,
  ),
  tool(
    "list_actions",
    "List Legal Actions",
    "List executable choices for one cursor and optional focused scope.",
    true,
    true,
  ),
  tool(
    "act",
    "Take Action",
    "Execute an issued catalog choice and return its authoritative outcome.",
    false,
    true,
  ),
  tool(
    "wait_until_acting",
    "Wait Until Acting",
    "Wait until this seat can act, the match ends, or timeoutMs elapses. Read-only. Cancelled waits do not mutate the match.",
    true,
    true,
  ),
  tool(
    "close_match",
    "Close Match",
    "Dispose this page's match session. Closing an already-closed session still succeeds.",
    false,
    false,
  ),
];

function tool(
  name: PageBoundToolName,
  title: string,
  description: string,
  readOnlyHint: boolean,
  untrustedContentHint: boolean,
): WebMcpPageToolDefinition {
  return {
    annotations: { readOnlyHint, untrustedContentHint },
    description,
    inputSchema: PAGE_BOUND_INPUT_SCHEMAS[name],
    name,
    outputSchema: PAGE_BOUND_OUTPUT_SCHEMAS[name],
    title,
  };
}

function validDisplayName(value: string): boolean {
  const normalized = value.normalize("NFC").trim().replace(/\s+/gu, " ");
  if (!normalized || new TextEncoder().encode(normalized).length > 128)
    return false;
  /* eslint-disable no-control-regex -- display names explicitly exclude controls and bidi format characters */
  if (
    /[\u0000-\u001F\u007F-\u009F\u200B-\u200D\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/u.test(
      normalized,
    )
  )
    return false;
  /* eslint-enable no-control-regex */
  return (
    /^[\p{Script=Latin}\p{M}\p{Nd} .'_-]+$/u.test(normalized) &&
    /[\p{Script=Latin}\p{Nd}]/u.test(normalized)
  );
}

function omitSessionId<T extends { sessionId: unknown }>({
  sessionId,
  ...rest
}: T): Omit<T, "sessionId"> {
  void sessionId;
  return rest;
}
