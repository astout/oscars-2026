import { Hono } from "hono";
import { setPick, getUserPicks, getAllPicks } from "../db/picks.js";
import { getCategory } from "../db/categories.js";
import { getAcademy } from "../db/academies.js";
import { getUser } from "../middleware/auth.js";
import { memberGuard } from "../middleware/academy-access.js";
import { param } from "../middleware/params.js";
import type { Pick } from "../types/index.js";

const app = new Hono();

// Get current user's picks
app.get("/:academyId/picks", memberGuard, async (c) => {
  const { userId } = getUser(c);
  const picks = await getUserPicks(param(c, "academyId"), userId);
  return c.json(picks);
});

// Set pick for a category
app.put("/:academyId/picks/:categoryId", memberGuard, async (c) => {
  const { userId } = getUser(c);
  const academyId = param(c, "academyId");
  const categoryId = param(c, "categoryId");
  const { pick1NomineeId, pick2NomineeId } = await c.req.json();

  if (!pick1NomineeId || !pick2NomineeId) {
    return c.json({ error: "Both picks are required" }, 400);
  }
  if (pick1NomineeId === pick2NomineeId) {
    return c.json({ error: "Picks must be different" }, 400);
  }

  const [category, academy] = await Promise.all([
    getCategory(categoryId),
    getAcademy(academyId),
  ]);

  if (!category) return c.json({ error: "Category not found" }, 404);
  if (category.locked || academy?.allLocked) {
    return c.json({ error: "Picks are locked" }, 403);
  }

  const pick: Pick = {
    userId,
    categoryId,
    pick1NomineeId,
    pick2NomineeId,
    updatedAt: new Date().toISOString(),
  };

  await setPick(academyId, pick);
  return c.json(pick);
});

// Get all picks (for leaderboard detail views)
app.get("/:academyId/picks/all", memberGuard, async (c) => {
  const picks = await getAllPicks(param(c, "academyId"));
  return c.json(picks);
});

export default app;
