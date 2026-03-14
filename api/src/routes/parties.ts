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
  deleteParty,
  updatePartySettings,
  updateMemberPublicOptOut,
} from "../db/parties.js";
import {
  createInvite,
  validateAndConsumeCode,
  setUniversalCode,
  deleteUniversalCode,
  getUniversalCode,
  listActiveInvites,
  deleteInvite,
} from "../db/invites.js";
import { getUser } from "../middleware/auth.js";
import { ensureUser, getUser as getUserProfile } from "../db/users.js";
import { isEmcee, getEvent } from "../db/events.js";
import { getBonusEvents, createBonusEvent } from "../db/bonus.js";
import { getUserPicks, setPick } from "../db/picks.js";
import { getCategories } from "../db/categories.js";
import { memberGuard, hostGuard } from "../middleware/party-access.js";
import { param } from "../middleware/params.js";
import type { Party, Pick } from "../types/index.js";

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
    allLocked: false,
    publicParticipation: false,
    createdAt: new Date().toISOString(),
  };

  await createParty(party, user.displayName);

  // Copy bonus events from the template party
  const event = await getEvent(party.eventId);
  if (event?.templatePartyId) {
    const templateBonuses = await getBonusEvents(event.templatePartyId);
    await Promise.all(
      templateBonuses.map((bonus) =>
        createBonusEvent(party.partyId, {
          eventId: randomUUID(),
          question: bonus.question,
          options: bonus.options,
          correctAnswer: null,
          minWager: bonus.minWager,
          maxWager: bonus.maxWager,
          status: "open",
          upNext: false,
          createdAt: new Date().toISOString(),
          resolvedAt: null,
        })
      )
    );
  }

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
  const { userId } = getUser(c);
  const party = await getParty(param(c, "partyId"));
  if (!party) return c.json({ error: "Not found" }, 404);

  const { isEmcee } = await import("../db/events.js");
  const { getEvent: getEvt } = await import("../db/events.js");
  const [emcee, event] = await Promise.all([
    isEmcee(party.eventId, userId),
    getEvt(party.eventId),
  ]);

  return c.json({
    ...party,
    isEmcee: emcee,
    isTemplateParty: event?.templatePartyId === party.partyId,
    templatePartyId: event?.templatePartyId || null,
  });
});

// Get categories for a party (merges overrides for self-emceed parties)
app.get("/:partyId/categories", memberGuard, async (c) => {
  const partyId = param(c, "partyId");
  const party = await getParty(partyId);

  const { getCategories, getNominees, getPartyCategoriesWithOverrides } = await import("../db/categories.js");

  const categories = party?.emceeSync === false
    ? await getPartyCategoriesWithOverrides(partyId)
    : await getCategories();

  const withNominees = await Promise.all(
    categories.map(async (cat) => ({
      ...cat,
      nominees: await getNominees(cat.categoryId),
    }))
  );

  return c.json(withNominees);
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

// Unified join endpoint
app.post("/:partyId/join", async (c) => {
  const { userId, email } = getUser(c);
  const partyId = param(c, "partyId");
  const body = await c.req.json().catch(() => ({}));
  const code = body.code ? (body.code as string).toLowerCase() : undefined;

  const party = await getParty(partyId);
  if (!party) return c.json({ error: "Party not found" }, 404);

  // Determine join behavior
  let autoJoin = false;

  if (code) {
    // Validate invite code (ephemeral or universal)
    const valid = await validateAndConsumeCode(partyId, code, userId);
    if (!valid) return c.json({ error: "Invalid or expired invite code" }, 403);
    autoJoin = true;
  } else if (party.isOpen) {
    autoJoin = true;
  } else if (party.isListed) {
    autoJoin = false; // pending approval
  } else {
    return c.json({ error: "This party requires an invite code to join" }, 403);
  }

  const joinStatus = autoJoin ? "active" : "pending";

  const existing = await getMember(partyId, userId);
  if (existing) {
    if (existing.status === "active") {
      return c.json({ status: "active", partyId });
    }
    if (existing.status === "left" || (autoJoin && existing.status === "pending")) {
      await updateMemberStatus(partyId, userId, joinStatus);
      return c.json({ status: joinStatus, partyId });
    }
    return c.json({ status: existing.status, partyId });
  }

  const user = await ensureUser(userId, email);

  try {
    await addMember(partyId, userId, user.displayName, joinStatus);
  } catch (e: any) {
    if (e.name === "ConditionalCheckFailedException") {
      return c.json({ status: joinStatus, partyId });
    }
    throw e;
  }

  return c.json({ status: joinStatus, partyId });
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

// Delete party (host or emcee)
app.delete("/:partyId", async (c) => {
  const { userId } = getUser(c);
  const partyId = param(c, "partyId");

  const party = await getParty(partyId);
  if (!party) return c.json({ error: "Not found" }, 404);

  const isHost = party.hostUserId === userId;
  const isAdmin = await isEmcee("oscars_2026", userId);

  if (!isHost && !isAdmin) {
    return c.json({ error: "Host or emcee access required" }, 403);
  }

  await deleteParty(partyId);
  return c.json({ deleted: true });
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

// Update party settings (host only)
app.patch("/:partyId/settings", hostGuard, async (c) => {
  const partyId = param(c, "partyId");
  const body = await c.req.json();

  const settings: {
    publicParticipation?: boolean;
    isListed?: boolean;
    isOpen?: boolean;
    emceeSync?: boolean;
  } = {};
  if (typeof body.publicParticipation === "boolean") {
    settings.publicParticipation = body.publicParticipation;
  }
  if (typeof body.isListed === "boolean") {
    settings.isListed = body.isListed;
  }
  if (typeof body.isOpen === "boolean") {
    settings.isOpen = body.isOpen;
  }
  if (typeof body.emceeSync === "boolean") {
    settings.emceeSync = body.emceeSync;
    // Self-emceeing: force private and remove from public leaderboard
    if (body.emceeSync === false) {
      settings.publicParticipation = false;
      settings.isOpen = false;
    }
  }

  await updatePartySettings(partyId, settings);

  const updated = await getParty(partyId);
  return c.json(updated);
});

// --- Invite management (host only) ---

// Generate ephemeral invite code
app.post("/:partyId/invites", hostGuard, async (c) => {
  const partyId = param(c, "partyId");
  const { userId } = getUser(c);
  const invite = await createInvite(partyId, userId);
  return c.json(invite, 201);
});

// List active invites
app.get("/:partyId/invites", hostGuard, async (c) => {
  const invites = await listActiveInvites(param(c, "partyId"));
  return c.json(invites);
});

// Revoke an invite
app.delete("/:partyId/invites/:code", hostGuard, async (c) => {
  await deleteInvite(param(c, "partyId"), param(c, "code"));
  return c.json({ deleted: true });
});

// Set universal code
app.put("/:partyId/invites/universal", hostGuard, async (c) => {
  const partyId = param(c, "partyId");
  const { userId } = getUser(c);
  const { code } = await c.req.json();

  if (!code || typeof code !== "string") {
    return c.json({ error: "code is required" }, 400);
  }

  const cleaned = code.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  if (cleaned.length < 4 || cleaned.length > 20) {
    return c.json({ error: "Code must be 4-20 alphanumeric characters" }, 400);
  }

  await setUniversalCode(partyId, cleaned, userId);
  return c.json({ code: cleaned });
});

// Remove universal code
app.delete("/:partyId/invites/universal", hostGuard, async (c) => {
  await deleteUniversalCode(param(c, "partyId"));
  return c.json({ deleted: true });
});

// Toggle public leaderboard opt-out (member)
app.patch("/:partyId/members/me/public", memberGuard, async (c) => {
  const { userId } = getUser(c);
  const partyId = param(c, "partyId");
  const { optOut } = await c.req.json();

  if (typeof optOut !== "boolean") {
    return c.json({ error: "optOut must be a boolean" }, 400);
  }

  const party = await getParty(partyId);
  if (party && party.publicParticipation === false) {
    return c.json({ error: "Public participation is disabled for this party" }, 403);
  }

  await updateMemberPublicOptOut(partyId, userId, optOut);
  return c.json({ publicOptOut: optOut });
});

// Copy picks from another party
app.post("/:partyId/picks/copy", memberGuard, async (c) => {
  const { userId } = getUser(c);
  const targetPartyId = param(c, "partyId");
  const { sourcePartyId } = await c.req.json();

  if (!sourcePartyId) {
    return c.json({ error: "sourcePartyId is required" }, 400);
  }

  // Verify membership in source party
  const sourceMember = await getMember(sourcePartyId, userId);
  if (!sourceMember || sourceMember.status !== "active") {
    return c.json({ error: "Not a member of source party" }, 403);
  }

  const [sourcePicks, categories, targetParty] = await Promise.all([
    getUserPicks(sourcePartyId, userId),
    getCategories(),
    getParty(targetPartyId),
  ]);

  if (!targetParty) return c.json({ error: "Party not found" }, 404);

  const lockedCategoryIds = new Set(
    categories
      .filter((cat) => cat.locked || targetParty.allLocked)
      .map((cat) => cat.categoryId)
  );

  const results = await Promise.all(
    sourcePicks.map(async (pick) => {
      if (lockedCategoryIds.has(pick.categoryId)) return "skipped" as const;

      await setPick(targetPartyId, {
        userId,
        categoryId: pick.categoryId,
        pick1NomineeId: pick.pick1NomineeId,
        pick2NomineeId: pick.pick2NomineeId,
        updatedAt: new Date().toISOString(),
      });
      return "copied" as const;
    })
  );

  return c.json({
    copied: results.filter((r) => r === "copied").length,
    skipped: results.filter((r) => r === "skipped").length,
  });
});

export default app;
