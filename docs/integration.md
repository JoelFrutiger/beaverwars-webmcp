# Integration

Install this repository as a pinned source dependency or Git submodule, then implement `AgentPlayService` and `AgentPageHost`.

```ts
import { mountAgentPage, type AgentPageHost } from "@beaverwars/webmcp";
import "@beaverwars/webmcp/agent-console.css";

const host: AgentPageHost = await createApplicationHost();
await mountAgentPage({ host, root: document.getElementById("agent-root")! });
```

The host must scrub any credential-bearing URL fragment synchronously before its first asynchronous operation. It must retain the real session ID, endpoint, invitation, and reconnect credential internally. Translate all expected failures to `AgentPlayError`; unexpected errors are deliberately reduced to `server-refused` by the public adapter.

The embedding document must provide the browser's real `document.modelContext`, be origin-isolated, allow the same-origin `tools` Permissions Policy, and dispose the returned controller when its page lifecycle ends. Do not ship the test `FakeModelContext` in production.

The runtime gate is host supplied. `WebMcpReleaseGate` implements the shared polling and fail-closed algorithm; its `load` callback should fetch application-owned same-origin configuration.
