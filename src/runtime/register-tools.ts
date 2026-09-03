/// <reference types="webmcp-types" />

import * as z from "zod/v4";
import { AgentPlayError, type AgentPlaySafeError } from "../contract/errors";
import {
  WEB_MCP_TOOL_DEFINITIONS,
  type PageBoundToolName,
} from "../contract/tool-definitions";
import { toWebMcpJsonSchema } from "./json-schema";
import type { PageBoundPlaySession } from "./page-bound-session";

export class WebMcpToolError extends Error {
  constructor(
    readonly code: string,
    readonly retryable: boolean,
    message: string,
  ) {
    super(`[${code}] ${message}`);
    this.name = "WebMcpToolError";
  }
}

export type WebMcpExecutionEvent = {
  completedTurn: boolean;
  durationMs: number;
  errorCode: string | null;
  fullSnapshot: boolean;
  inputCharacters: number;
  name: PageBoundToolName;
  outputCharacters: number;
  paginated: boolean;
  patch: boolean;
  readOnly: boolean;
  resetRequired: boolean;
  retryable: boolean | null;
  success: boolean;
};

export async function registerPlayWebMcpTools(options: {
  beforeExecution?: (signal: AbortSignal) => Promise<void>;
  executionSignal?: AbortSignal;
  includeSeatTools?: boolean;
  modelContext: WebMCP.ModelContext;
  onExecution?: (event: WebMcpExecutionEvent) => void;
  onExecutionStart?: (name: PageBoundToolName) => void;
  session: PageBoundPlaySession;
  signal: AbortSignal;
}): Promise<void> {
  const definitions =
    options.includeSeatTools === false
      ? WEB_MCP_TOOL_DEFINITIONS.filter(({ name }) => name === "game_guide")
      : WEB_MCP_TOOL_DEFINITIONS;
  for (const definition of definitions) {
    await options.modelContext.registerTool(
      {
        annotations: definition.annotations,
        description: definition.description,
        execute: async (
          rawInput,
          executionOptions?: WebMCP.ToolExecuteCallbackOptions,
        ) => {
          const browserSignal =
            executionOptions?.signal ?? new AbortController().signal;
          const signal = options.executionSignal
            ? AbortSignal.any([browserSignal, options.executionSignal])
            : browserSignal;
          options.onExecutionStart?.(definition.name);
          const startedAt = performance.now();
          const inputCharacters = safeJsonLength(rawInput);
          try {
            await options.beforeExecution?.(signal);
            const input = definition.inputSchema.parse(rawInput);
            const output = definition.outputSchema.parse(
              await options.session.execute(definition.name, input, signal),
            );
            options.onExecution?.({
              durationMs: performance.now() - startedAt,
              errorCode: null,
              ...inspectOutputShape(output),
              inputCharacters,
              name: definition.name,
              outputCharacters: safeJsonLength(output),
              readOnly: definition.annotations.readOnlyHint,
              retryable: null,
              success: true,
            });
            return output;
          } catch (error) {
            const safe = sanitizeWebMcpError(error);
            options.onExecution?.({
              completedTurn: false,
              durationMs: performance.now() - startedAt,
              errorCode: safe.code,
              fullSnapshot: false,
              inputCharacters,
              name: definition.name,
              outputCharacters: safeJsonLength(safe),
              paginated: false,
              patch: false,
              readOnly: definition.annotations.readOnlyHint,
              resetRequired: false,
              retryable: safe.retryable,
              success: false,
            });
            throw new WebMcpToolError(safe.code, safe.retryable, safe.message);
          }
        },
        inputSchema: toWebMcpJsonSchema(
          definition.inputSchema,
          definition.name,
        ),
        name: definition.name,
        title: definition.title,
      },
      { signal: options.signal },
    );
  }
}

export function getPlayWebMcpToolSchemas(): Array<{
  inputSchema: object;
  name: PageBoundToolName;
}> {
  return WEB_MCP_TOOL_DEFINITIONS.map((definition) => ({
    inputSchema: toWebMcpJsonSchema(definition.inputSchema, definition.name),
    name: definition.name,
  }));
}

export function sanitizeWebMcpError(error: unknown): AgentPlaySafeError {
  if (error instanceof AgentPlayError)
    return {
      code: error.code,
      message: error.safeMessage,
      retryable: error.retryable,
    };
  if (error instanceof z.ZodError)
    return {
      code: "invalid-arguments",
      message: "The tool arguments are invalid.",
      retryable: false,
    };
  if (
    error &&
    typeof error === "object" &&
    "name" in error &&
    error.name === "AbortError"
  )
    return {
      code: "aborted",
      message: "The tool execution was cancelled.",
      retryable: true,
    };
  return {
    code: "server-refused",
    message: "Beaver Wars could not complete this tool call.",
    retryable: true,
  };
}

function safeJsonLength(value: unknown): number {
  try {
    return JSON.stringify(value).length;
  } catch {
    return 0;
  }
}

function inspectOutputShape(output: unknown) {
  const value =
    output && typeof output === "object"
      ? (output as Record<string, unknown>)
      : {};
  return {
    completedTurn: value.consumedSeatAction === true,
    fullSnapshot: "currentState" in value,
    paginated: typeof value.nextPageToken === "string",
    patch: "patch" in value,
    resetRequired: value.resetRequired === true,
  };
}
