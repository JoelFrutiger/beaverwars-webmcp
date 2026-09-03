import "../src/page/agent-console.css";
import { mountAgentPage } from "../src/page/page-controller";
import { MockAgentPlayService } from "../src/mock/mock-play-service";
import { FakeModelContext } from "../src/testing/fake-model-context";

const context = new FakeModelContext();
Object.defineProperty(document, "modelContext", {
  configurable: true,
  value: context,
});
Object.defineProperty(window, "originAgentCluster", {
  configurable: true,
  value: true,
});
const root = document.querySelector<HTMLElement>("#agent-root");
if (!root) throw new Error("Missing demo root.");

await mountAgentPage({
  host: {
    launch: { expiresAt: Date.now() + 15 * 60_000, kind: "invitation" },
    launchMessage:
      "Safe demo invitation loaded. No credential is present in this standalone example.",
    runtimeGate: {
      initialize: async () => undefined,
      revalidate: async () => undefined,
    },
    service: new MockAgentPlayService(),
  },
  root,
});

Object.assign(window, {
  __beaverWarsWebMcpDemo: {
    execute: (name: string, input: Record<string, unknown> = {}) =>
      context.executeTool(name, input),
    tools: () => context.getTools(),
  },
});
