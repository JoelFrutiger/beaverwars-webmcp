// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import { MockAgentPlayService } from "../mock/mock-play-service";
import { FakeModelContext } from "../testing/fake-model-context";
import { mountAgentPage } from "./page-controller";

describe("agent page", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("mounts a reviewable console and unregisters tools on disposal", async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const context = new FakeModelContext();
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: context,
    });
    Object.defineProperty(window, "originAgentCluster", {
      configurable: true,
      value: true,
    });
    const controller = await mountAgentPage({
      document,
      host: {
        launch: { expiresAt: Date.now() + 60_000, kind: "invitation" },
        runtimeGate: {
          initialize: async () => undefined,
          revalidate: async () => undefined,
        },
        service: new MockAgentPlayService(),
      },
      root: document.querySelector<HTMLElement>("#root")!,
      window,
    });

    expect(document.querySelector("h1")?.textContent).toContain("One page");
    expect(document.querySelector("#siteToolsBadge")?.textContent).toBe(
      "Site tools ready",
    );
    await context.executeTool("join_agent_seat", {});
    expect(document.querySelector("#connectionHeading")?.textContent).toBe(
      "Match active",
    );
    controller.dispose();
    expect(await context.getTools()).toEqual([]);
  });
});
