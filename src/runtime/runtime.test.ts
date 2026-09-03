import Ajv from "ajv";
import { describe, expect, it, vi } from "vitest";
import { WEB_MCP_TOOL_DEFINITIONS } from "../contract/tool-definitions";
import { MockAgentPlayService } from "../mock/mock-play-service";
import { FakeModelContext } from "../testing/fake-model-context";
import { WebMcpDiagnosticsController } from "./diagnostics";
import { PageBoundPlaySession } from "./page-bound-session";
import {
  getPlayWebMcpToolSchemas,
  registerPlayWebMcpTools,
} from "./register-tools";
import { WebMcpReleaseGate } from "./release-gate";

describe("public WebMCP runtime", () => {
  it("exposes the reviewed seven-tool contract without private transport inputs", () => {
    expect(WEB_MCP_TOOL_DEFINITIONS.map(({ name }) => name)).toEqual([
      "game_guide",
      "join_agent_seat",
      "observe",
      "list_actions",
      "act",
      "wait_until_acting",
      "close_match",
    ]);
    const schemas = getPlayWebMcpToolSchemas();
    expect(getPlayWebMcpToolSchemas()).toEqual(schemas);
    for (const { inputSchema } of schemas) {
      const serialized = JSON.stringify(inputSchema);
      expect(serialized).not.toContain('"sessionId"');
      expect(serialized).not.toContain('"server"');
      expect(serialized).not.toContain('"invitation"');
      expect(
        new Ajv({
          strict: true,
          strictRequired: false,
          strictTypes: false,
        }).compile(inputSchema),
      ).toBeTypeOf("function");
    }
    const ajv = new Ajv({
      strict: true,
      strictRequired: false,
      strictTypes: false,
    });
    const join = ajv.compile(
      schemas.find(({ name }) => name === "join_agent_seat")!.inputSchema,
    );
    expect(join({ displayName: "Grok", playerDifficulty: "hard" })).toBe(true);
    expect(join({ invitation: "must-stay-private" })).toBe(false);
    const list = ajv.compile(
      schemas.find(({ name }) => name === "list_actions")!.inputSchema,
    );
    expect(
      list({
        cursor: { seq: 1, state: "state", tag: "tag" },
        movementQuery: { towardTileKey: "0,0" },
        scope: "movement",
      }),
    ).toBe(true);
    expect(
      list({
        cursor: { seq: 1, state: "state", tag: "tag" },
        movementQuery: { towardTileKey: "0,0" },
        scope: "combat",
      }),
    ).toBe(false);
  });

  it("registers and executes a complete page-bound turn", async () => {
    const context = new FakeModelContext();
    const session = new PageBoundPlaySession(new MockAgentPlayService(), {
      expiresAt: Date.now() + 1_000,
      kind: "invitation",
    });
    const registration = new AbortController();
    await registerPlayWebMcpTools({
      modelContext: context as WebMCP.ModelContext,
      session,
      signal: registration.signal,
    });

    expect((await context.getTools()).map(({ name }) => name)).toHaveLength(7);
    await expect(context.executeTool("game_guide", {})).resolves.toMatchObject({
      schemaVersion: 10,
    });
    const joined = await context.executeTool("join_agent_seat", {
      displayName: "Web Agent",
    });
    expect(joined).toMatchObject({ contractVersion: "10", schemaVersion: 10 });
    const listed = await context.executeTool("list_actions", {
      cursor: (joined as { cursor: object }).cursor,
    });
    await expect(
      context.executeTool("act", {
        actionId: "end-turn",
        catalogId: (listed as { catalogId: string }).catalogId,
        knownCursor: (joined as { cursor: object }).cursor,
      }),
    ).resolves.toMatchObject({ status: "accepted" });
    await expect(
      context.executeTool("wait_until_acting", {}),
    ).resolves.toMatchObject({ status: "acting" });
    await expect(context.executeTool("observe", {})).resolves.toMatchObject({
      schemaVersion: 10,
    });
    await expect(context.executeTool("close_match", {})).resolves.toMatchObject(
      { closed: true },
    );
    registration.abort();
    expect(await context.getTools()).toEqual([]);
  });

  it("rejects concurrent joins and keeps unexpected failures private", async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const service = new MockAgentPlayService();
    const originalJoin = service.join.bind(service);
    service.join = async (...args) => {
      await pending;
      return originalJoin(...args);
    };
    const session = new PageBoundPlaySession(service, {
      expiresAt: null,
      kind: "invitation",
    });
    const first = session.execute("join_agent_seat", {});
    await expect(session.execute("join_agent_seat", {})).rejects.toMatchObject({
      code: "join-in-progress",
    });
    release();
    await first;

    const context = new FakeModelContext();
    const broken = new MockAgentPlayService();
    broken.gameGuide = async () => {
      throw new Error("secret backend detail");
    };
    await registerPlayWebMcpTools({
      modelContext: context as WebMCP.ModelContext,
      session: new PageBoundPlaySession(broken, { kind: "none" }),
      signal: new AbortController().signal,
    });
    await expect(context.executeTool("game_guide", {})).rejects.toEqual(
      expect.objectContaining({
        code: "server-refused",
        message: expect.not.stringContaining("secret"),
        name: "WebMcpToolError",
        retryable: true,
      }),
    );
  });

  it("shares release refreshes and fails closed on an incompatible contract", async () => {
    const load = vi.fn(async () => ({
      enabled: true,
      minimumContractVersion: "10",
    }));
    const gate = new WebMcpReleaseGate({ currentContractVersion: "10", load });
    await Promise.all([gate.initialize(), gate.initialize()]);
    expect(load).toHaveBeenCalledTimes(1);

    const disabled = new WebMcpReleaseGate({
      currentContractVersion: "10",
      load: async () => ({ enabled: true, minimumContractVersion: "11" }),
    });
    await expect(disabled.initialize()).rejects.toEqual(
      expect.objectContaining({
        code: "webmcp-disabled",
        name: "AgentPlayError",
      }),
    );
  });

  it("reports only the host-provided public source revision", () => {
    expect(
      new WebMcpDiagnosticsController(true, "4661631").snapshot(),
    ).toMatchObject({
      adapterVersion: "0.1.2",
      contractVersion: "10",
      sourceRevision: "4661631",
    });
  });
});
