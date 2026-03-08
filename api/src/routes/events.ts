import { Hono } from "hono";
import { getEmcees, addEmcee, removeEmcee } from "../db/events.js";
import { getUser as getUserFromDb } from "../db/users.js";
import { getUserByEmail } from "../db/users.js";
import { getUser } from "../middleware/auth.js";
import { emceeGuard } from "../middleware/emcee-access.js";
import { param } from "../middleware/params.js";

const DEFAULT_EVENT_ID = "oscars_2026";

const app = new Hono();

// List emcees (enriched with display names)
app.get("/emcees", emceeGuard, async (c) => {
  const emcees = await getEmcees(DEFAULT_EVENT_ID);

  const enriched = await Promise.all(
    emcees.map(async (e) => {
      const user = await getUserFromDb(e.userId);
      return {
        userId: e.userId,
        displayName: user?.displayName || "Unknown",
        email: user?.email || "",
        addedAt: e.addedAt,
      };
    })
  );

  return c.json(enriched);
});

// Add emcee by email
app.post("/emcees", emceeGuard, async (c) => {
  const { email } = await c.req.json();

  if (!email?.trim()) {
    return c.json({ error: "Email is required" }, 400);
  }

  const user = await getUserByEmail(email.trim().toLowerCase());
  if (!user) {
    return c.json({ error: "No user found with that email" }, 404);
  }

  await addEmcee(DEFAULT_EVENT_ID, user.userId);

  return c.json({
    userId: user.userId,
    displayName: user.displayName,
    email: user.email,
    addedAt: new Date().toISOString(),
  }, 201);
});

// Remove emcee
app.delete("/emcees/:userId", emceeGuard, async (c) => {
  const targetUserId = param(c, "userId");
  const { userId: callerUserId } = getUser(c);

  if (targetUserId === callerUserId) {
    return c.json({ error: "Cannot remove yourself" }, 400);
  }

  await removeEmcee(DEFAULT_EVENT_ID, targetUserId);
  return c.json({ removed: true });
});

export default app;
