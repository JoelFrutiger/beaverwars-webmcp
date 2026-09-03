/* global console, window */
import { chromium } from "playwright";
import { createServer } from "vite";

const server = await createServer({
  configFile: "vite.config.ts",
  server: { host: "127.0.0.1", port: 0 },
});
await server.listen();
const address = server.httpServer.address();
if (!address || typeof address === "string")
  throw new Error("Vite did not expose a TCP port.");
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
  });
  await page.goto(`http://127.0.0.1:${address.port}/demo/`);
  await page.waitForFunction(() => "__beaverWarsWebMcpDemo" in window);
  const result = await page.evaluate(async () => {
    const demo = window.__beaverWarsWebMcpDemo;
    const tools = await demo.tools();
    const joined = await demo.execute("join_agent_seat", {});
    const listed = await demo.execute("list_actions", {
      cursor: joined.cursor,
    });
    const acted = await demo.execute("act", {
      actionId: "end-turn",
      catalogId: listed.catalogId,
      knownCursor: joined.cursor,
    });
    const waited = await demo.execute("wait_until_acting", {});
    await demo.execute("close_match", {});
    return {
      acted: acted.status,
      tools: tools.map(({ name }) => name),
      waited: waited.status,
    };
  });
  if (
    result.tools.length !== 7 ||
    result.acted !== "accepted" ||
    result.waited !== "acting"
  )
    throw new Error(JSON.stringify(result));
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
  await server.close();
}
