# Release process

1. Run `npm ci && npm run check` from a fresh clone.
2. Review `npm pack --dry-run`, the emitted browser graph, and the public-surface scan.
3. Capture the demo at desktop, iPad landscape, and phone portrait sizes. Confirm that no address bar, credential, or account data appears.
4. Merge the reviewed public commit and tag it with the package version, such as `v0.1.0`.
5. In Beaver Wars, check out that tag in `packages/beaverwars-webmcp` and commit the changed gitlink.
6. Run the private parity, bridge, browser, production-build, and integrated graph gates before deploying.

Never update production from the public repository's moving branch. Roll back by restoring the previous submodule gitlink. The host application's runtime gate is the emergency kill switch.

Package versions and play contract versions are independent. A UI or documentation release can increment the package version while `WEBMCP_PLAY_CONTRACT_VERSION` remains unchanged.
