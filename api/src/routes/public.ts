import { Hono } from "hono";
import { computePublicLeaderboard } from "../db/leaderboard.js";
import { getOpenParties, getListedParties, getMemberCount, getMembers } from "../db/parties.js";
import { getUser as getUserProfile } from "../db/users.js";
import { param } from "../middleware/params.js";

const app = new Hono();

// Public leaderboard — no auth required
app.get("/events/:eventId/leaderboard", async (c) => {
  const eventId = param(c, "eventId");
  const leaderboard = await computePublicLeaderboard(eventId);
  return c.json(leaderboard);
});

// List open parties — no auth required
app.get("/parties/public", async (c) => {
  const eventId = c.req.query("eventId") || "oscars_2026";
  const parties = await getOpenParties(eventId);

  const enriched = await Promise.all(
    parties.map(async (party) => ({
      partyId: party.partyId,
      name: party.name,
      eventId: party.eventId,
      memberCount: await getMemberCount(party.partyId),
    }))
  );

  return c.json(enriched);
});

// List discoverable parties (isListed=true) — no auth required
app.get("/parties/listed", async (c) => {
  const eventId = c.req.query("eventId") || "oscars_2026";
  const parties = await getListedParties(eventId);

  const enriched = await Promise.all(
    parties.map(async (party) => {
      const members = await getMembers(party.partyId);
      const host = members.find((m) => m.role === "host");
      const hostProfile = host ? await getUserProfile(host.userId) : null;
      return {
        partyId: party.partyId,
        name: party.name,
        eventId: party.eventId,
        hostDisplayName: hostProfile?.displayName || host?.displayName || "Host",
        memberCount: members.filter((m) => m.status === "active").length,
        isOpen: party.isOpen === true,
      };
    })
  );

  return c.json(enriched);
});

export default app;
