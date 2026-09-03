/// <reference types="webmcp-types" />

export class FakeModelContext extends EventTarget {
  ontoolchange: ((this: WebMCP.ModelContext, event: Event) => unknown) | null =
    null;
  readonly tools = new Map<string, WebMCP.ModelContextTool>();

  async registerTool(
    tool: WebMCP.ModelContextTool,
    options: WebMCP.ModelContextRegisterToolOptions = {},
  ): Promise<void> {
    if (this.tools.has(tool.name))
      throw new Error(`Duplicate tool ${tool.name}.`);
    this.tools.set(tool.name, tool);
    options.signal?.addEventListener(
      "abort",
      () => {
        this.tools.delete(tool.name);
        this.dispatchEvent(new Event("toolchange"));
      },
      { once: true },
    );
    this.dispatchEvent(new Event("toolchange"));
  }

  async getTools(): Promise<WebMCP.RegisteredTool[]> {
    return [...this.tools.values()].map((tool) => ({
      annotations: tool.annotations,
      description: tool.description,
      inputSchema: tool.inputSchema,
      name: tool.name,
      title: tool.title,
    })) as WebMCP.RegisteredTool[];
  }

  async executeTool(
    name: string,
    input: Record<string, unknown>,
    signal = new AbortController().signal,
  ): Promise<unknown> {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Unknown tool ${name}.`);
    return tool.execute(input, { signal });
  }
}
