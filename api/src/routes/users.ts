import { Hono } from "hono";
import { getUser } from "../middleware/auth.js";
import { ensureUser, updateDisplayName } from "../db/users.js";

const app = new Hono();

// Get or create current user profile
app.get("/me", async (c) => {
  const { userId, email, displayName } = getUser(c);
  const user = await ensureUser(userId, email, displayName);
  return c.json(user);
});

// Update display name
app.patch("/me", async (c) => {
  const { userId } = getUser(c);
  const { displayName } = await c.req.json();

  if (!displayName?.trim()) {
    return c.json({ error: "displayName is required" }, 400);
  }

  await updateDisplayName(userId, displayName.trim());
  return c.json({ displayName: displayName.trim() });
});

export default app;
