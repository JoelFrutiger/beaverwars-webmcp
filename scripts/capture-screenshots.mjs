/* global console, document */
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
const url = `http://127.0.0.1:${address.port}/demo/`;
const captures = [
  {
    file: "screenshots/desktop.png",
    hasTouch: false,
    height: 1080,
    isMobile: false,
    width: 1920,
  },
  {
    file: "screenshots/ipad-landscape.png",
    hasTouch: true,
    height: 768,
    isMobile: false,
    width: 1024,
  },
  {
    file: "screenshots/phone-portrait.png",
    hasTouch: true,
    height: 892,
    isMobile: true,
    width: 412,
  },
];
try {
  for (const capture of captures) {
    const context = await browser.newContext({
      deviceScaleFactor: 1,
      hasTouch: capture.hasTouch,
      isMobile: capture.isMobile,
      viewport: { height: capture.height, width: capture.width },
    });
    const page = await context.newPage();
    await page.goto(url);
    await page.waitForFunction(
      () =>
        document.querySelector("#siteToolsBadge")?.textContent ===
        "Site tools ready",
    );
    await page.screenshot({ fullPage: false, path: capture.file });
    await context.close();
  }
  console.log(
    "Captured desktop, iPad landscape, and phone portrait screenshots.",
  );
} finally {
  await browser.close();
  await server.close();
}
