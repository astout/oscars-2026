import { Hono } from "hono";
import { setPick, getUserPicks, getAllPicks } from "../db/picks.js";
import { getCategory } from "../db/categories.js";
import { getParty } from "../db/parties.js";
import { getUser } from "../middleware/auth.js";
import { memberGuard } from "../middleware/party-access.js";
import { param } from "../middleware/params.js";
import type { Pick } from "../types/index.js";

const app = new Hono();

// Get current user's picks
app.get("/:partyId/picks", memberGuard, async (c) => {
  const { userId } = getUser(c);
  const picks = await getUserPicks(param(c, "partyId"), userId);
  return c.json(picks);
});

// Set pick for a category
app.put("/:partyId/picks/:categoryId", memberGuard, async (c) => {
  const { userId } = getUser(c);
  const partyId = param(c, "partyId");
  const categoryId = param(c, "categoryId");
  const { pick1NomineeId, pick2NomineeId } = await c.req.json();

  if (!pick1NomineeId || !pick2NomineeId) {
    return c.json({ error: "Both picks are required" }, 400);
  }
  if (pick1NomineeId === pick2NomineeId) {
    return c.json({ error: "Picks must be different" }, 400);
  }

  const [category, party] = await Promise.all([
    getCategory(categoryId),
    getParty(partyId),
  ]);

  if (!category) return c.json({ error: "Category not found" }, 404);
  if (category.locked || party?.allLocked) {
    return c.json({ error: "Picks are locked" }, 403);
  }

  const pick: Pick = {
    userId,
    categoryId,
    pick1NomineeId,
    pick2NomineeId,
    updatedAt: new Date().toISOString(),
  };

  await setPick(partyId, pick);
  return c.json(pick);
});

// Get all picks (for leaderboard detail views)
app.get("/:partyId/picks/all", memberGuard, async (c) => {
  const picks = await getAllPicks(param(c, "partyId"));
  return c.json(picks);
});

export default app;
