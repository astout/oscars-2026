import { Hono } from "hono";
import { randomUUID } from "node:crypto";
import {
  createParty,
  getParty,
  getPartiesForUser,
  getMembers,
  getMember,
  addMember,
  updateMemberStatus,
  removeMember,
  setAllLocked,
  renameParty,
} from "../db/parties.js";
import { getUser } from "../middleware/auth.js";
import { ensureUser, getUser as getUserProfile } from "../db/users.js";
import { memberGuard, hostGuard } from "../middleware/party-access.js";
import { param } from "../middleware/params.js";
import type { Party } from "../types/index.js";

const app = new Hono();

// Create party
app.post("/", async (c) => {
  const { userId, email } = getUser(c);
  const { name } = await c.req.json();

  if (!name?.trim()) {
    return c.json({ error: "Name is required" }, 400);
  }

  const user = await ensureUser(userId, email);

  const party: Party = {
    partyId: randomUUID(),
    eventId: "oscars_2026",
    name: name.trim(),
    hostUserId: userId,
    inviteCode: randomUUID().slice(0, 8),
    allLocked: false,
    createdAt: new Date().toISOString(),
  };

  await createParty(party, user.displayName);
  return c.json(party, 201);
});

// List user's parties
app.get("/", async (c) => {
  const { userId } = getUser(c);
  const memberships = await getPartiesForUser(userId);

  const parties = await Promise.all(
    memberships
      .filter((m: any) => m.status === "active")
      .map(async (m: any) => {
        const partyId = m.GSI1SK?.replace("PARTY#", "") || m.partyId;
        const party = await getParty(partyId);
        return party ? { ...party, role: m.role } : null;
      })
  );

  return c.json(parties.filter(Boolean));
});

// Get party details
app.get("/:partyId", memberGuard, async (c) => {
  const party = await getParty(param(c, "partyId"));
  if (!party) return c.json({ error: "Not found" }, 404);
  return c.json(party);
});

// List members
app.get("/:partyId/members", memberGuard, async (c) => {
  const members = await getMembers(param(c, "partyId"));

  // Resolve actual display names from user profiles
  const profiles = await Promise.all(
    members.map((m) => getUserProfile(m.userId))
  );
  const enriched = members.map((m, i) => ({
    ...m,
    displayName: profiles[i]?.displayName || m.displayName,
  }));

  return c.json(enriched);
});

// Join via invite code
app.get("/:partyId/join/:code", async (c) => {
  const { userId, email } = getUser(c);
  const partyId = param(c, "partyId");
  const code = param(c, "code");

  const party = await getParty(partyId);
  if (!party || party.inviteCode !== code) {
    return c.json({ error: "Invalid invite link" }, 404);
  }

  const existing = await getMember(partyId, userId);
  if (existing) {
    if (existing.status === "active") {
      return c.json({ status: "active", partyId });
    }
    if (existing.status === "left") {
      await updateMemberStatus(partyId, userId, "pending");
      return c.json({ status: "pending", partyId });
    }
    return c.json({ status: "pending", partyId });
  }

  const user = await ensureUser(userId, email);

  try {
    await addMember(partyId, userId, user.displayName, "pending");
  } catch (e: any) {
    if (e.name === "ConditionalCheckFailedException") {
      return c.json({ error: "Already a member or pending" }, 409);
    }
    throw e;
  }

  return c.json({ status: "pending", partyId });
});

// Leave party (self)
app.post("/:partyId/leave", memberGuard, async (c) => {
  const { userId } = getUser(c);
  const partyId = param(c, "partyId");

  const party = await getParty(partyId);
  if (party?.hostUserId === userId) {
    return c.json({ error: "Host cannot leave the party" }, 400);
  }

  await updateMemberStatus(partyId, userId, "left");
  return c.json({ status: "left" });
});

// Approve or remove member (host only)
app.patch("/:partyId/members/:userId", hostGuard, async (c) => {
  const partyId = param(c, "partyId");
  const targetUserId = param(c, "userId");
  const { action } = await c.req.json();

  if (action === "approve") {
    await updateMemberStatus(partyId, targetUserId, "active");
    return c.json({ status: "active" });
  } else if (action === "remove") {
    await removeMember(partyId, targetUserId);
    return c.json({ status: "removed" });
  }

  return c.json({ error: "Invalid action" }, 400);
});

// Rename party (host only)
app.patch("/:partyId", hostGuard, async (c) => {
  const partyId = param(c, "partyId");
  const { name } = await c.req.json();

  if (!name?.trim()) {
    return c.json({ error: "Name is required" }, 400);
  }

  await renameParty(partyId, name.trim());
  return c.json({ name: name.trim() });
});

// Lock/unlock all
app.post("/:partyId/lock", hostGuard, async (c) => {
  await setAllLocked(param(c, "partyId"), true);
  return c.json({ allLocked: true });
});

app.post("/:partyId/unlock", hostGuard, async (c) => {
  await setAllLocked(param(c, "partyId"), false);
  return c.json({ allLocked: false });
});

export default app;
