import { Hono } from "hono";
import { getNotificationsSince } from "../db/notifications.js";
import { getUser } from "../middleware/auth.js";
import { memberGuard } from "../middleware/party-access.js";
import { param } from "../middleware/params.js";

const app = new Hono();

// Poll for notifications since a given timestamp
app.get("/:partyId/notifications", memberGuard, async (c) => {
  const { userId } = getUser(c);
  const partyId = param(c, "partyId");
  const since = c.req.query("since") || new Date(Date.now() - 5 * 60_000).toISOString();

  const notifications = await getNotificationsSince(partyId, since, userId);
  return c.json(notifications);
});

export default app;
