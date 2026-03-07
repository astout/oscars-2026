import { Hono } from "hono";
import { setWinner, setCategoryLocked } from "../db/categories.js";
import { hostGuard } from "../middleware/academy-access.js";
import { param } from "../middleware/params.js";

const app = new Hono();

// Set winner for a category
app.post("/:academyId/categories/:categoryId/winner", hostGuard, async (c) => {
  const categoryId = param(c, "categoryId");
  const { winnerId } = await c.req.json();

  if (!winnerId) {
    return c.json({ error: "winnerId is required" }, 400);
  }

  await setWinner(categoryId, winnerId);
  return c.json({ categoryId, winnerId });
});

// Lock single category
app.post("/:academyId/categories/:categoryId/lock", hostGuard, async (c) => {
  await setCategoryLocked(param(c, "categoryId"), true);
  return c.json({ locked: true });
});

// Unlock single category
app.post(
  "/:academyId/categories/:categoryId/unlock",
  hostGuard,
  async (c) => {
    await setCategoryLocked(param(c, "categoryId"), false);
    return c.json({ locked: false });
  }
);

export default app;
