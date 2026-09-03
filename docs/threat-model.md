# Threat model

## Protected data

Invitation secrets, reconnect credentials, multiplayer endpoints, complete diagnostic payloads, and private service errors are outside this package's public contracts.

## Trust boundaries

- Model-generated tool arguments are untrusted and are validated twice: by emitted JSON Schema and by Zod immediately before dispatch.
- Tool outputs are validated before they reach the browser agent. Match-state tools are annotated as untrusted content because player-controlled names and remote state may be present.
- `AgentPlayService` is trusted to retain transport credentials and its real session ID. It cannot be replaced through a tool argument.
- Unexpected exceptions are not inspected or echoed. They become a generic `server-refused` error.
- Registrations are page-bound. Aborting the registration signal removes tools, and page disposal aborts pending executions and disposes the service.

## Explicit non-goals

This package is not an authentication system, multiplayer client, MCP-over-HTTP server, game simulator, or cross-origin tool bridge. It never uses WebMCP `exposedTo` and provides no arbitrary network target.

Report vulnerabilities privately as described in [SECURITY.md](../SECURITY.md). Never paste a live credential into an issue or test fixture.
