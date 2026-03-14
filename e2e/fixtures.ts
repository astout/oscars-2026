import { test as base, expect, type BrowserContext, type Page } from "@playwright/test";

// ── Test user credentials ──────────────────────────────────────────
export const users = {
  host: {
    email: "astoutj@gmail.com",
    password: "hugcyg-zimxu6-Wawwih",
    displayName: "Alex",
  },
  memberA: {
    email: "oscars-test-a@mailinator.com",
    password: "TestPass123!",
    displayName: "TestMemberA",
  },
  memberB: {
    email: "oscars-test-b@mailinator.com",
    password: "TestPass123!",
    displayName: "TestMemberB",
  },
} as const;

export type UserKey = keyof typeof users;

// ── Helpers ────────────────────────────────────────────────────────

/** Sign in a user on a given page. Expects page to be at /auth. */
export async function signIn(page: Page, user: (typeof users)[UserKey]) {
  await page.goto("/auth");
  await page.getByRole("textbox", { name: "Email" }).fill(user.email);
  await page.getByRole("textbox", { name: "Password" }).fill(user.password);
  await page.getByRole("button", { name: "Sign In" }).click();
  // Wait for navigation away from /auth (hard redirect)
  await page.waitForURL((url) => !url.pathname.startsWith("/auth"), {
    timeout: 15_000,
  });
}

/** Sign out from any page by going to profile. */
export async function signOut(page: Page) {
  await page.goto("/profile");
  await page.getByRole("button", { name: "Sign Out" }).click();
  await expect(page).toHaveURL(/\/auth/);
}

/** Create a fresh browser context with a signed-in user. */
export async function signedInContext(
  browser: { newContext: () => Promise<BrowserContext> },
  user: (typeof users)[UserKey],
  baseURL: string,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  await signIn(page, user);
  return { context, page };
}

/** Take a named screenshot and save to e2e/screenshots/. */
export async function screenshot(page: Page, name: string) {
  await page.screenshot({
    path: `e2e/screenshots/${name}.png`,
    fullPage: true,
  });
}

/** Wait for page to be in a stable state (no pending fetches). */
export async function waitForStable(page: Page) {
  await page.waitForLoadState("networkidle");
}

// The actual API Gateway URL (CloudFront proxies /api/* to this)
const API_ORIGIN = process.env.API_URL || "https://lum55uif7j.execute-api.us-east-1.amazonaws.com";

/** Fetch from the public API (no auth). */
export async function publicApiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_ORIGIN}/api/public/v1${path}`);
  if (!res.ok) throw new Error(`Public API ${path}: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

/** Fetch from the authenticated API. Extracts token from page, calls API Gateway directly. */
export async function apiGet<T>(page: Page, path: string): Promise<T> {
  const token = await page.evaluate(() => localStorage.getItem("idToken"));
  if (!token) throw new Error("No idToken in localStorage");
  const res = await fetch(`${API_ORIGIN}/api/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`API ${path}: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

// ── Extended test fixture ──────────────────────────────────────────

type Fixtures = {
  hostPage: Page;
  hostContext: BrowserContext;
};

export const test = base.extend<Fixtures>({
  hostContext: async ({ browser }, use) => {
    const context = await browser.newContext();
    await use(context);
    await context.close();
  },
  hostPage: async ({ hostContext, baseURL }, use) => {
    const page = await hostContext.newPage();
    await page.goto(baseURL + "/auth");
    await page.getByRole("textbox", { name: "Email" }).fill(users.host.email);
    await page.getByRole("textbox", { name: "Password" }).fill(users.host.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/auth"), {
      timeout: 15_000,
    });
    await use(page);
  },
});

export { expect };
