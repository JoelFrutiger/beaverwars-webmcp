# Tool contract

The production page exposes one static tool set for a bound invitation or resume target:

| Tool                | Read-only | Untrusted output | Purpose                                    |
| ------------------- | --------- | ---------------- | ------------------------------------------ |
| `game_guide`        | yes       | no               | Read concise reviewed rules.               |
| `join_agent_seat`   | no        | yes              | Join the target already held by the host.  |
| `observe`           | yes       | yes              | Read state or a cursor-based update.       |
| `list_actions`      | yes       | yes              | Enumerate exact legal catalog actions.     |
| `act`               | no        | yes              | Submit one issued catalog action.          |
| `wait_until_acting` | yes       | yes              | Wait for this seat, match end, or timeout. |
| `close_match`       | no        | no               | Close this page's active session.          |

A page without a target registers only `game_guide`. Inputs intentionally omit `sessionId`, `server`, endpoint, invitation, and credential fields. Outputs preserve Beaver Wars compact play contract v10, including cursors, patches, action receipts, recovery snapshots, combat forecasts, pagination, and round timers.

The source of truth is [`src/contract/tool-definitions.ts`](../src/contract/tool-definitions.ts). `npm run check:schemas` compiles every emitted JSON Schema and enforces the public boundary.
