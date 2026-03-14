import { Hono } from "hono";
import { setWinner, clearWinner, setCategoryLocked, setCategoryUpNext, getCategory, getNominees, getCategories, setCategoryOverride, getCategoryOverrides } from "../db/categories.js";
import { emceeGuard, globalEmceeGuard } from "../middleware/emcee-access.js";
import { param } from "../middleware/params.js";
import { createNotification } from "../db/notifications.js";
import { getAllPicks } from "../db/picks.js";
import { getMembers, getParty } from "../db/parties.js";

const app = new Hono();

// Get all party IDs for the event (lightweight scan, <50 parties expected)
async function getAllPartyIds(): Promise<string[]> {
  const { ScanCommand } = await import("@aws-sdk/lib-dynamodb");
  const { db, TABLE_NAME } = await import("../db/client.js");

  const result = await db.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: "SK = :sk AND eventId = :eid",
      ExpressionAttributeValues: {
        ":sk": "METADATA",
        ":eid": "oscars_2026",
      },
      ProjectionExpression: "partyId",
    })
  );
  return (result.Items || []).map((i: any) => i.partyId).filter(Boolean);
}

async function notifyAllParties(
  type: "category-awarded" | "category-up-next" | "leaderboard-change",
  message: string,
  linkTo?: string,
) {
  const partyIds = await getAllPartyIds();
  await Promise.all(
    partyIds.map((pid) => createNotification(pid, type, message, linkTo))
  );
}

// Set winner for a category (global emcee only — event-level action)
app.post("/:partyId/categories/:categoryId/winner", globalEmceeGuard, async (c) => {
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
  await setCategoryUpNext(categoryId, false);

  // Personalized notifications per user
  const [cat, nominees] = await Promise.all([
    getCategory(categoryId),
    getNominees(categoryId),
  ]);
  const winner = nominees.find((n) => n.nomineeId === winnerId);
  if (cat && winner) {
    const partyIds = await getAllPartyIds();
    const notifyWork = partyIds.map(async (pid) => {
      const [picks, members] = await Promise.all([
        getAllPicks(pid),
        getMembers(pid),
      ]);
      const picksByUser = new Map(
        picks.filter((p) => p.categoryId === categoryId).map((p) => [p.userId, p])
      );
      await Promise.all(
        members
          .filter((m) => m.status === "active")
          .map((m) => {
            const pick = picksByUser.get(m.userId);
            let pts = 0;
            if (pick?.pick1NomineeId === winnerId) pts = 5;
            else if (pick?.pick2NomineeId === winnerId) pts = 3;
            const ptsText = pts > 0 ? `You earned +${pts} pts!` : pick ? "No points this time." : "You didn't pick this one.";
            return createNotification(pid, "category-awarded", `${winner.name} wins ${cat.name}! ${ptsText}`, "/categories", m.userId);
          })
      );
    });
    Promise.all(notifyWork).catch(() => {});
  }

  return c.json({ categoryId, winnerId });
});

// Set category as "up next" (emcee only)
app.post("/:partyId/categories/:categoryId/up-next", globalEmceeGuard, async (c) => {
  const categoryId = param(c, "categoryId");

  // Clear any other up-next categories
  const allCats = await getCategories();
  await Promise.all(
    allCats
      .filter((cat) => cat.upNext && cat.categoryId !== categoryId)
      .map((cat) => setCategoryUpNext(cat.categoryId, false))
  );

  await setCategoryUpNext(categoryId, true);

  const cat = await getCategory(categoryId);
  if (cat) {
    notifyAllParties("category-up-next", `${cat.name} is up next — make your picks!`, `/categories`).catch(() => {});
  }

  return c.json({ categoryId, upNext: true });
});

// Clear up-next (emcee only)
app.delete("/:partyId/categories/:categoryId/up-next", globalEmceeGuard, async (c) => {
  await setCategoryUpNext(param(c, "categoryId"), false);
  return c.json({ upNext: false });
});

// Lock single category (emcee — global writes shared, self-emcee writes override)
app.post("/:partyId/categories/:categoryId/lock", emceeGuard, async (c) => {
  const partyId = param(c, "partyId");
  const categoryId = param(c, "categoryId");
  const party = await getParty(partyId);
  if (party?.emceeSync === false) {
    await setCategoryOverride(partyId, categoryId, { locked: true });
  } else {
    await setCategoryLocked(categoryId, true);
  }
  return c.json({ locked: true });
});

// Unlock single category
app.post("/:partyId/categories/:categoryId/unlock", emceeGuard, async (c) => {
  const partyId = param(c, "partyId");
  const categoryId = param(c, "categoryId");
  const party = await getParty(partyId);
  if (party?.emceeSync === false) {
    await setCategoryOverride(partyId, categoryId, { locked: false });
  } else {
    await setCategoryLocked(categoryId, false);
  }
  return c.json({ locked: false });
});

// Self-emcee: set winner (writes to party override, not shared category)
app.post("/:partyId/categories/:categoryId/party-winner", emceeGuard, async (c) => {
  const partyId = param(c, "partyId");
  const categoryId = param(c, "categoryId");
  const { winnerId } = await c.req.json();

  const party = await getParty(partyId);
  if (!party || party.emceeSync !== false) {
    return c.json({ error: "This route is for self-emceed parties only" }, 400);
  }

  if (winnerId === null) {
    await setCategoryOverride(partyId, categoryId, { winnerId: null, resolvedAt: null, locked: true });
    return c.json({ categoryId, winnerId: null });
  }

  await setCategoryOverride(partyId, categoryId, {
    winnerId,
    resolvedAt: new Date().toISOString(),
    upNext: false,
  });

  // Personalized notifications for this party only
  const [cat, nominees] = await Promise.all([getCategory(categoryId), getNominees(categoryId)]);
  const winner = nominees.find((n) => n.nomineeId === winnerId);
  if (cat && winner) {
    const [picks, members] = await Promise.all([getAllPicks(partyId), getMembers(partyId)]);
    const picksByUser = new Map(picks.filter((p) => p.categoryId === categoryId).map((p) => [p.userId, p]));
    Promise.all(
      members.filter((m) => m.status === "active").map((m) => {
        const pick = picksByUser.get(m.userId);
        let pts = 0;
        if (pick?.pick1NomineeId === winnerId) pts = 5;
        else if (pick?.pick2NomineeId === winnerId) pts = 3;
        const ptsText = pts > 0 ? `You earned +${pts} pts!` : pick ? "No points this time." : "You didn't pick this one.";
        return createNotification(partyId, "category-awarded", `${winner.name} wins ${cat.name}! ${ptsText}`, "/categories", m.userId);
      })
    ).catch(() => {});
  }

  return c.json({ categoryId, winnerId });
});

// Self-emcee: set up-next (party override)
app.post("/:partyId/categories/:categoryId/party-up-next", emceeGuard, async (c) => {
  const partyId = param(c, "partyId");
  const categoryId = param(c, "categoryId");

  const party = await getParty(partyId);
  if (!party || party.emceeSync !== false) {
    return c.json({ error: "This route is for self-emceed parties only" }, 400);
  }

  // Clear other up-next overrides
  const overrides = await getCategoryOverrides(partyId);
  await Promise.all(
    overrides.filter((o) => o.upNext && o.categoryId !== categoryId)
      .map((o) => setCategoryOverride(partyId, o.categoryId, { upNext: false }))
  );

  await setCategoryOverride(partyId, categoryId, { upNext: true });

  const cat = await getCategory(categoryId);
  if (cat) {
    createNotification(partyId, "category-up-next", `${cat.name} is up next — make your picks!`, "/categories").catch(() => {});
  }

  return c.json({ categoryId, upNext: true });
});

// Self-emcee: clear up-next (party override)
app.delete("/:partyId/categories/:categoryId/party-up-next", emceeGuard, async (c) => {
  const partyId = param(c, "partyId");
  const categoryId = param(c, "categoryId");

  const party = await getParty(partyId);
  if (!party || party.emceeSync !== false) {
    return c.json({ error: "This route is for self-emceed parties only" }, 400);
  }

  await setCategoryOverride(partyId, categoryId, { upNext: false });
  return c.json({ upNext: false });
});

export default app;
