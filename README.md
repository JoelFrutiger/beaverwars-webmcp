# Beaver Wars WebMCP

The production WebMCP runtime and browser-agent console used by [Beaver Wars](https://github.com/JoelFrutiger/BeaverWars).

This repository contains the public, page-bound WebMCP transport: tool schemas and metadata, browser registration, single-session lifecycle, output validation, release gating, diagnostics, and the visible agent console. It intentionally contains no multiplayer endpoint, invitation secret, seat credential, game simulation, or proprietary Beaver Wars service implementation.

The standalone demo uses a deterministic mock service:

```bash
npm ci
npm run dev
```

Run the complete public gate with `npm run check`.

Production integration consumes a reviewed Git commit through the `packages/beaverwars-webmcp` submodule in Beaver Wars. See [docs/integration.md](docs/integration.md).

## Security

Please report vulnerabilities according to [SECURITY.md](SECURITY.md). Never include live invitations or reconnect credentials in an issue.

## License

Apache-2.0. See [LICENSE](LICENSE).

