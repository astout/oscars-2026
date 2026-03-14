import { test, expect, users, signIn, screenshot } from "./fixtures";

test.describe("Home — Watch Parties", () => {
  test("host sees parties with host badge and all sections", async ({ page }) => {
    await signIn(page, users.host);

    // Header
    await expect(page.getByRole("heading", { name: "Watch Parties" })).toBeVisible();

    // Public Leaderboard card
    const leaderboardCard = page.getByText("Public Leaderboard");
    await expect(leaderboardCard).toBeVisible();

    // Open party card with member count
    const openPartyCard = page.getByText(/participants/);
    await expect(openPartyCard.first()).toBeVisible();

    // At least one party with "Host" role
    await expect(page.getByText("Host").first()).toBeVisible();

    // Create + Join buttons
    await expect(page.getByRole("button", { name: "Create" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Join", exact: true })).toBeVisible();

    await screenshot(page, "home-host-view");
  });

  test("public leaderboard link navigates correctly", async ({ page }) => {
    await signIn(page, users.host);

    await page.getByText("Public Leaderboard").click();
    await expect(page).toHaveURL("/leaderboard");
    await screenshot(page, "home-to-public-leaderboard");
  });

  test("profile button navigates to profile", async ({ page }) => {
    await signIn(page, users.host);

    await page.getByRole("button", { name: "Profile" }).click();
    await expect(page).toHaveURL("/profile");
    await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
    await screenshot(page, "profile-page");
  });
});
