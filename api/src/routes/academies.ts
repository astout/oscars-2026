import { Hono } from "hono";
import { ulid } from "ulid";
import {
  createAcademy,
  getAcademy,
  getAcademiesForUser,
  getMembers,
  addMember,
  updateMemberStatus,
  removeMember,
  setAllLocked,
} from "../db/academies.js";
import { getUser } from "../middleware/auth.js";
import { memberGuard, hostGuard } from "../middleware/academy-access.js";
import { param } from "../middleware/params.js";
import type { Academy } from "../types/index.js";

const app = new Hono();

// Create academy
app.post("/", async (c) => {
  const { userId, email } = getUser(c);
  const { name, displayName } = await c.req.json();

  if (!name?.trim()) {
    return c.json({ error: "Name is required" }, 400);
  }

  const academy: Academy = {
    academyId: ulid(),
    name: name.trim(),
    hostUserId: userId,
    inviteCode: ulid().slice(-8).toLowerCase(),
    allLocked: false,
    createdAt: new Date().toISOString(),
  };

  await createAcademy(academy, displayName || email);
  return c.json(academy, 201);
});

// List user's academies
app.get("/", async (c) => {
  const { userId } = getUser(c);
  const memberships = await getAcademiesForUser(userId);

  const academies = await Promise.all(
    memberships
      .filter((m: any) => m.status === "active")
      .map(async (m: any) => {
        const academyId = m.GSI1SK?.replace("ACADEMY#", "") || m.academyId;
        const academy = await getAcademy(academyId);
        return academy ? { ...academy, role: m.role } : null;
      })
  );

  return c.json(academies.filter(Boolean));
});

// Get academy details
app.get("/:academyId", memberGuard, async (c) => {
  const academy = await getAcademy(param(c, "academyId"));
  if (!academy) return c.json({ error: "Not found" }, 404);
  return c.json(academy);
});

// List members
app.get("/:academyId/members", memberGuard, async (c) => {
  const members = await getMembers(param(c, "academyId"));
  return c.json(members);
});

// Join via invite code
app.get("/:academyId/join/:code", async (c) => {
  const { userId, email } = getUser(c);
  const academyId = param(c, "academyId");
  const code = param(c, "code");

  const academy = await getAcademy(academyId);
  if (!academy || academy.inviteCode !== code) {
    return c.json({ error: "Invalid invite link" }, 404);
  }

  try {
    await addMember(academyId, userId, email, "pending");
  } catch (e: any) {
    if (e.name === "ConditionalCheckFailedException") {
      return c.json({ error: "Already a member or pending" }, 409);
    }
    throw e;
  }

  return c.json({ status: "pending", academyId });
});

// Approve or remove member (host only)
app.patch("/:academyId/members/:userId", hostGuard, async (c) => {
  const academyId = param(c, "academyId");
  const targetUserId = param(c, "userId");
  const { action } = await c.req.json();

  if (action === "approve") {
    await updateMemberStatus(academyId, targetUserId, "active");
    return c.json({ status: "active" });
  } else if (action === "remove") {
    await removeMember(academyId, targetUserId);
    return c.json({ status: "removed" });
  }

  return c.json({ error: "Invalid action" }, 400);
});

// Lock/unlock all
app.post("/:academyId/lock", hostGuard, async (c) => {
  await setAllLocked(param(c, "academyId"), true);
  return c.json({ allLocked: true });
});

app.post("/:academyId/unlock", hostGuard, async (c) => {
  await setAllLocked(param(c, "academyId"), false);
  return c.json({ allLocked: false });
});

export default app;
