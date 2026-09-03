# Architecture

This package is the production browser-facing WebMCP layer for Beaver Wars. It is intentionally an inversion-of-control boundary: a private host supplies one `AgentPlayService`, while this package owns the page-bound session, validation, tool registration, browser lifecycle, diagnostics, and visible console.

```text
document.modelContext
        │
        ▼
registerPlayWebMcpTools
        │
        ▼
PageBoundPlaySession ──► AgentPlayService (host implementation)
        │
        └──────────────► AgentConsole
```

The service is already bound to one invitation or saved seat. The public layer has no API for selecting a server, passing a credential, or switching sessions. Production Beaver Wars compiles this source from a pinned Git submodule commit.

The compact play DTOs are public because they are the exact data exposed to the browser agent. Simulation, authoritative rules, network transport, credentials, and invitation parsing remain outside this repository.
