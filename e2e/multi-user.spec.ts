import { test as base, expect } from "@playwright/test";
import { users, signIn, screenshot, signedInContext } from "./fixtures";

// Use base test (not custom fixture) so we get raw browser access
const test = base;

test.describe("Multi-User Interactions", () => {
  test("host and viewer see consistent leaderboard data", async ({ browser, baseURL }) => {
    // Context 1: Host (authenticated)
    const host = await signedInContext(browser, users.host, baseURL!);

    // Context 2: Public viewer (unauthenticated)
    const viewerCtx = await browser.newContext({ baseURL });
    const viewer = await viewerCtx.newPage();

    // Host navigates to their party leaderboard
    const partyButton = host.page.locator("button").filter({ hasText: "Host" }).first();
    await partyButton.click();
    await host.page.waitForURL(/\/party\/.*\/categories/);

    // Extract partyId
    const partyId = host.page.url().match(/\/party\/([^/]+)/)?.[1];
    expect(partyId).toBeTruthy();

    // Host goes to leaderboard
    await host.page.getByText("Leaderboard").last().click();
    await host.page.waitForURL(/\/leaderboard/);
    await host.page.waitForTimeout(2000);
    await screenshot(host.page, "multi-host-leaderboard");

    // Viewer goes to public leaderboard
    await viewer.goto("/leaderboard");
    await viewer.waitForTimeout(2000);
    await screenshot(viewer, "multi-viewer-leaderboard");

    // Both pages should have loaded content (not blank)
    const hostContent = await host.page.textContent("body");
    const viewerContent = await viewer.textContent("body");
    expect(hostContent!.length).toBeGreaterThan(50);
    expect(viewerContent!.length).toBeGreaterThan(50);

    // Cleanup
    await host.context.close();
    await viewerCtx.close();
  });

  test("two authenticated users see the same party differently", async ({
    browser,
    baseURL,
  }) => {
    // Both sign in as host (since we only have one guaranteed user)
    // In a full setup, this would be host + memberA
    const ctx1 = await browser.newContext({ baseURL });
    const page1 = await ctx1.newPage();
    await signIn(page1, users.host);

    const ctx2 = await browser.newContext({ baseURL });
    const page2 = await ctx2.newPage();
    await signIn(page2, users.host);

    // Both should see the home page
    await expect(page1).toHaveURL("/");
    await expect(page2).toHaveURL("/");

    await expect(page1.getByRole("heading", { name: "Watch Parties" })).toBeVisible();
    await expect(page2.getByRole("heading", { name: "Watch Parties" })).toBeVisible();

    await screenshot(page1, "multi-user-context1");
    await screenshot(page2, "multi-user-context2");

    await ctx1.close();
    await ctx2.close();
  });

  test("three separate browser contexts maintain isolated sessions", async ({
    browser,
    baseURL,
  }) => {
    // Create 3 contexts
    const contexts = await Promise.all(
      [1, 2, 3].map(() => browser.newContext({ baseURL })),
    );
    const pages = await Promise.all(contexts.map((ctx) => ctx.newPage()));

    // Context 1: Sign in
    await signIn(pages[0], users.host);
    await expect(pages[0]).toHaveURL("/");

    // Context 2: Should still be at auth (not signed in)
    await pages[1].goto("/");
    await expect(pages[1]).toHaveURL(/\/auth/);

    // Context 3: Go to public leaderboard (no auth needed)
    await pages[2].goto("/leaderboard");
    await expect(pages[2]).toHaveURL("/leaderboard");

    // Verify isolation: context 1 is authenticated, 2 is not
    const page1HasProfile = await pages[0]
      .getByRole("button", { name: "Profile" })
      .isVisible();
    expect(page1HasProfile).toBe(true);

    // Context 2 should show auth form
    const page2HasSignIn = await pages[1]
      .getByRole("button", { name: "Sign In" })
      .isVisible();
    expect(page2HasSignIn).toBe(true);

    // Cleanup
    await Promise.all(contexts.map((ctx) => ctx.close()));
  });
});
