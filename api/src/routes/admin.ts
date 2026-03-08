import { Hono } from "hono";
import { setWinner, clearWinner, setCategoryLocked } from "../db/categories.js";
import { emceeGuard } from "../middleware/emcee-access.js";
import { param } from "../middleware/params.js";

const app = new Hono();

// Set winner for a category (emcee only)
app.post("/:partyId/categories/:categoryId/winner", emceeGuard, async (c) => {
  const categoryId = param(c, "categoryId");
  const { winnerId } = await c.req.json();

  if (winnerId === null) {
    await clearWinner(categoryId);
    return c.json({ categoryId, winnerId: null });
  }

  if (!winnerId) {
    return c.json({ error: "winnerId is required" }, 400);
  }

  await setWinner(categoryId, winnerId);
  return c.json({ categoryId, winnerId });
});

// Lock single category (emcee only)
app.post("/:partyId/categories/:categoryId/lock", emceeGuard, async (c) => {
  await setCategoryLocked(param(c, "categoryId"), true);
  return c.json({ locked: true });
});

// Unlock single category (emcee only)
app.post("/:partyId/categories/:categoryId/unlock", emceeGuard, async (c) => {
  await setCategoryLocked(param(c, "categoryId"), false);
  return c.json({ locked: false });
});

export default app;
