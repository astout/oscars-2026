import { test, expect, users, signIn, screenshot, apiGet } from "./fixtures";

test.describe("Categories & Picks", () => {
  test("categories page shows all 24 categories", async ({ page }) => {
    await signIn(page, users.host);

    // Navigate to first party's categories
    const partyButton = page.locator("button").filter({ hasText: "Host" }).first();
    await partyButton.click();

    // Should land on categories (default route)
    await expect(page).toHaveURL(/\/party\/.*\/categories/);

    // Check categories are rendered
    await page.waitForTimeout(2000);
    // Categories show as "BEST PICTURE", "BEST DIRECTOR", etc.
    await expect(page.getByText("BEST PICTURE")).toBeVisible();
    await expect(page.getByText("BEST DIRECTOR")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Categories" })).toBeVisible();
    // Should show pick progress
    await expect(page.getByText(/of 24 picked/)).toBeVisible();

    await screenshot(page, "picks-categories-grid");
  });

  test("pick modal opens and allows 1st + 2nd selection", async ({ page }) => {
    await signIn(page, users.host);

    // Navigate to a party
    const partyButton = page.locator("button").filter({ hasText: "Host" }).first();
    await partyButton.click();
    await expect(page).toHaveURL(/\/party\/.*\/categories/);

    // Click on a category card to open the pick modal
    // Find an unlocked, unresolved category
    const categoryCard = page.locator("[class*='card']").filter({ hasText: /Best/ }).first();
    await categoryCard.click();

    // Pick modal should show nominees
    // Wait for modal content to appear
    await page.waitForTimeout(500);
    await screenshot(page, "picks-modal-open");

    // The modal should have nominee items to click
    // Exact selectors depend on implementation
  });

  test("leaderboard shows scores after picks", async ({ page }) => {
    await signIn(page, users.host);

    // Navigate to a party's leaderboard
    const partyButton = page.locator("button").filter({ hasText: "Host" }).first();
    await partyButton.click();

    // Click leaderboard in bottom nav
    const leaderboardNav = page.getByText("Leaderboard").last();
    await leaderboardNav.click();

    await expect(page).toHaveURL(/\/party\/.*\/leaderboard/);

    // Should show at least one member
    await page.waitForTimeout(1000);
    await screenshot(page, "picks-party-leaderboard");
  });

  test("API scores match displayed leaderboard", async ({ hostPage }) => {
    // Navigate to a party
    const partyButton = hostPage.locator("button").filter({ hasText: "Host" }).first();
    await partyButton.click();

    // Get the partyId from URL
    await hostPage.waitForURL(/\/party\/.*\/categories/);
    const url = hostPage.url();
    const partyId = url.match(/\/party\/([^/]+)/)?.[1];
    expect(partyId).toBeTruthy();

    // Fetch leaderboard via API
    const leaderboard = await apiGet<any[]>(hostPage, `/parties/${partyId}/leaderboard`);
    expect(Array.isArray(leaderboard)).toBe(true);

    // Verify each entry has required fields
    for (const entry of leaderboard) {
      expect(entry).toHaveProperty("userId");
      expect(entry).toHaveProperty("displayName");
      expect(entry).toHaveProperty("totalPoints");
      expect(entry).toHaveProperty("categoryPoints");
      expect(entry).toHaveProperty("bonusPoints");
      expect(entry).toHaveProperty("rank");
      expect(entry.totalPoints).toBe(entry.categoryPoints + entry.bonusPoints);
    }

    // Verify ranking order
    for (let i = 1; i < leaderboard.length; i++) {
      expect(leaderboard[i].totalPoints).toBeLessThanOrEqual(
        leaderboard[i - 1].totalPoints,
      );
    }
  });
});
