import { Hono } from "hono";
import { computeLeaderboard } from "../db/leaderboard.js";
import { memberGuard } from "../middleware/party-access.js";
import { param } from "../middleware/params.js";

const app = new Hono();

app.get("/:partyId/leaderboard", memberGuard, async (c) => {
  const leaderboard = await computeLeaderboard(param(c, "partyId"));
  return c.json(leaderboard);
});

export default app;
