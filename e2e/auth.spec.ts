import { test, expect, users, signIn, signOut, screenshot } from "./fixtures";

test.describe("Auth Flow", () => {
  test("fresh sign-in navigates to home", async ({ page }) => {
    await signIn(page, users.host);

    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: "Watch Parties" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Profile" })).toBeVisible();
    await screenshot(page, "auth-home-after-signin");
  });

  test("sign-out and re-sign-in works (no blank page)", async ({ page }) => {
    await signIn(page, users.host);
    await expect(page).toHaveURL("/");

    // Sign out
    await signOut(page);

    // Sign back in
    await signIn(page, users.host);
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: "Watch Parties" })).toBeVisible();
    await screenshot(page, "auth-re-signin");
  });

  test("third consecutive sign-in also works", async ({ page }) => {
    // Reproduces the intermittent blank page bug (3 cycles)
    for (let i = 0; i < 3; i++) {
      await signIn(page, users.host);
      await expect(page).toHaveURL("/");
      await expect(page.getByRole("heading", { name: "Watch Parties" })).toBeVisible();
      await signOut(page);
    }
  });

  test("protected route stores pendingRedirect", async ({ page }) => {
    // Go directly to a protected route while unauthenticated
    await page.goto("/profile");

    // Should redirect to /auth
    await expect(page).toHaveURL(/\/auth/);

    // Sign in
    await signIn(page, users.host);

    // Should redirect back to /profile (pendingRedirect)
    await expect(page).toHaveURL("/profile");
    await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
  });
});
