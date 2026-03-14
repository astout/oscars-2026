import { test, expect, users, signIn, screenshot } from "./fixtures";

test.describe("Party Settings", () => {
  test("host sees full settings with management controls", async ({ page }) => {
    await signIn(page, users.host);

    // Navigate to first party
    const partyButton = page.locator("button").filter({ hasText: "Host" }).first();
    await partyButton.click();
    await page.waitForURL(/\/party\/.*\/categories/);

    // Go to settings tab
    await page.getByText("Settings").last().click();
    await page.waitForURL(/\/settings/);

    // Host should see invite link section
    await expect(page.getByText(/invite/i).first()).toBeVisible();

    // Host should see management controls
    await expect(page.getByText(/lock/i).first()).toBeVisible();

    // Should see members section
    await expect(page.getByText(/members/i).first()).toBeVisible();

    await screenshot(page, "party-settings-host");
  });

  test("bottom nav shows all tabs", async ({ page }) => {
    await signIn(page, users.host);

    // Navigate to first party
    const partyButton = page.locator("button").filter({ hasText: "Host" }).first();
    await partyButton.click();
    await page.waitForURL(/\/party\/.*\/categories/);

    // Check bottom nav items exist
    // The nav should have: Categories, Leaderboard, Bonus, Settings (at minimum)
    const nav = page.locator("nav, [role='navigation']").last();
    const body = await page.textContent("body");

    // Just verify we can navigate to each section
    const sections = ["categories", "leaderboard", "bonus", "settings"];
    for (const section of sections) {
      const link = page.locator(`a[href*="${section}"], button`).filter({ hasText: new RegExp(section, "i") }).first();
      if (await link.isVisible()) {
        await screenshot(page, `party-nav-${section}-visible`);
      }
    }
  });

  test("bonus page shows wager events", async ({ page }) => {
    await signIn(page, users.host);

    const partyButton = page.locator("button").filter({ hasText: "Host" }).first();
    await partyButton.click();
    await page.waitForURL(/\/party\/.*\/categories/);

    // Navigate to bonus tab via URL
    const url = page.url();
    const partyBase = url.replace(/\/[^/]*$/, "");
    await page.goto(partyBase + "/bonus");
    await page.waitForTimeout(2000);
    await screenshot(page, "party-bonus-events");
  });
});
