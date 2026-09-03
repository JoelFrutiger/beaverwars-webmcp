import { defineConfig } from "vitest/config";

export default defineConfig({
  build: { sourcemap: false, rollupOptions: { input: "demo/index.html" } },
  server: {
    headers: {
      "Origin-Agent-Cluster": "?1",
      "Permissions-Policy": "tools=(self)"
    }
  },
  test: { environment: "node", restoreMocks: true, unstubGlobals: true }
});

