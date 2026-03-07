import { Hono } from "hono";
import { computeLeaderboard } from "../db/leaderboard.js";
import { memberGuard } from "../middleware/academy-access.js";
import { param } from "../middleware/params.js";

const app = new Hono();

app.get("/:academyId/leaderboard", memberGuard, async (c) => {
  const leaderboard = await computeLeaderboard(param(c, "academyId"));
  return c.json(leaderboard);
});

export default app;
