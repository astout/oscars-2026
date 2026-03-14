import { test, expect, screenshot, publicApiGet } from "./fixtures";

test.describe("Public Leaderboard", () => {
  test("loads without authentication", async ({ page }) => {
    await page.goto("/leaderboard");
    await expect(page).toHaveURL("/leaderboard");
    await page.waitForTimeout(2000);
    await screenshot(page, "public-leaderboard-no-auth");
  });

  test("shows participant and party counts", async ({ page }) => {
    await page.goto("/leaderboard");
    await page.waitForTimeout(2000);
    const text = await page.textContent("body");
    expect(text).toBeTruthy();
    await screenshot(page, "public-leaderboard-stats");
  });

  test("API returns valid leaderboard data", async () => {
    const data = await publicApiGet<any[]>("/events/oscars_2026/leaderboard");
    expect(Array.isArray(data)).toBe(true);

    if (data.length > 0) {
      const entry = data[0];
      expect(entry).toHaveProperty("userId");
      expect(entry).toHaveProperty("displayName");
      expect(entry).toHaveProperty("partyName");
      expect(entry).toHaveProperty("totalPoints");
      expect(entry).toHaveProperty("rank");
      expect(entry.rank).toBe(1);
    }

    for (let i = 1; i < data.length; i++) {
      expect(data[i].totalPoints).toBeLessThanOrEqual(data[i - 1].totalPoints);
    }
  });

  test("public parties API returns open parties", async () => {
    const data = await publicApiGet<any[]>("/parties/public");
    expect(Array.isArray(data)).toBe(true);

    for (const party of data) {
      expect(party).toHaveProperty("partyId");
      expect(party).toHaveProperty("name");
      expect(party).toHaveProperty("memberCount");
      expect(party.memberCount).toBeGreaterThan(0);
    }
  });
});
