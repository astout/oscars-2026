import { Hono } from "hono";
import { randomUUID } from "node:crypto";
import {
  createBonusEvent,
  getBonusEvents,
  resolveBonusEvent,
  updateBonusEvent,
  deleteBonusEvent,
  lockBonusEvent,
  unlockBonusEvent,
  placeWager,
  deleteWager,
  getUserWagers,
  setBonusUpNext,
  unresolveBonusEvent,
} from "../db/bonus.js";
import { getEvent } from "../db/events.js";
import { getAllEventParties, getMembers } from "../db/parties.js";
import { createNotification } from "../db/notifications.js";
import { getUser } from "../middleware/auth.js";
import { memberGuard, hostGuard } from "../middleware/party-access.js";
import { emceeGuard } from "../middleware/emcee-access.js";
import { param } from "../middleware/params.js";
import type { BonusEvent, Wager } from "../types/index.js";

// Helper: broadcast a bonus action from template party to all event parties
async function broadcastBonusAction(
  templatePartyId: string,
  eventId: string,
  question: string,
  action: (partyId: string, bonusEventId: string) => Promise<void>
): Promise<number> {
  const parties = await getAllEventParties(eventId);
  let count = 0;
  await Promise.all(
    parties
      .filter((p) => p.partyId !== templatePartyId && p.emceeSync !== false)
      .map(async (party) => {
        const bonuses = await getBonusEvents(party.partyId);
        const match = bonuses.find((b) => b.question.toLowerCase() === question.toLowerCase());
        if (match) {
          await action(party.partyId, match.eventId);
          count++;
        }
      })
  );
  return count;
}

const app = new Hono();

// List bonus events + user's wagers
app.get("/:partyId/bonus", memberGuard, async (c) => {
  const { userId } = getUser(c);
  const partyId = param(c, "partyId");

  const [events, wagers] = await Promise.all([
    getBonusEvents(partyId),
    getUserWagers(partyId, userId),
  ]);

  const wagerMap = new Map(wagers.map((w) => [w.eventId, w]));

  return c.json(
    events.map((e) => ({
      ...e,
      userWager: wagerMap.get(e.eventId) || null,
    }))
  );
});

// Create bonus event (host only)
app.post("/:partyId/bonus", hostGuard, async (c) => {
  const partyId = param(c, "partyId");
  const { question, options, maxWager, minWager } = await c.req.json();

  if (!question?.trim()) {
    return c.json({ error: "Question is required" }, 400);
  }
  if (!Array.isArray(options) || options.length < 1) {
    return c.json({ error: "At least 1 option required" }, 400);
  }

  const clampedMax = Math.min(Math.max(1, maxWager || 3), 7);
  const clampedMin = Math.min(Math.max(1, minWager || 1), clampedMax);

  const event: BonusEvent = {
    eventId: randomUUID(),
    question: question.trim(),
    options,
    correctAnswer: null,
    minWager: clampedMin,
    maxWager: clampedMax,
    status: "open",
    upNext: false,
    createdAt: new Date().toISOString(),
    resolvedAt: null,
  };

  await createBonusEvent(partyId, event);
  return c.json(event, 201);
});

// Resolve bonus event (host only)
app.patch("/:partyId/bonus/:eventId", hostGuard, async (c) => {
  const partyId = param(c, "partyId");
  const eventId = param(c, "eventId");
  const { correctAnswer } = await c.req.json();

  if (!correctAnswer) {
    return c.json({ error: "correctAnswer is required" }, 400);
  }

  await resolveBonusEvent(partyId, eventId, correctAnswer);

  // Personalized notifications
  const bonuses = await getBonusEvents(partyId);
  const bonus = bonuses.find((b) => b.eventId === eventId);
  if (bonus) {
    const { getWagers } = await import("../db/bonus.js");
    const [allWagers, members] = await Promise.all([getWagers(partyId), getMembers(partyId)]);
    const wagersByUser = new Map(allWagers.filter((w) => w.eventId === eventId).map((w) => [w.userId, w]));
    const q = bonus.question.length > 50 ? bonus.question.slice(0, 47) + "..." : bonus.question;
    Promise.all(
      members.filter((m) => m.status === "active").map((m) => {
        const wager = wagersByUser.get(m.userId);
        let ptsText: string;
        if (!wager) ptsText = "You didn't wager.";
        else if (correctAnswer === "__none__") ptsText = `You lost ${wager.wagerAmount} pts.`;
        else if (wager.prediction === correctAnswer) ptsText = `You earned +${wager.wagerAmount} pts!`;
        else ptsText = `You lost ${wager.wagerAmount} pts.`;
        return createNotification(partyId, "wager-resolved", `Wager resolved: ${q} ${ptsText}`, "/bonus", m.userId);
      })
    ).catch(() => {});
  }

  return c.json({ status: "resolved", correctAnswer });
});

// Unresolve bonus event (host only) — reset to open
app.post("/:partyId/bonus/:eventId/unresolve", hostGuard, async (c) => {
  const partyId = param(c, "partyId");
  const eventId = param(c, "eventId");
  await unresolveBonusEvent(partyId, eventId);
  return c.json({ status: "open" });
});

// Update bonus event (host only)
app.put("/:partyId/bonus/:eventId", hostGuard, async (c) => {
  const partyId = param(c, "partyId");
  const eventId = param(c, "eventId");
  const { question, options, maxWager, minWager } = await c.req.json();

  if (question !== undefined && !question?.trim()) {
    return c.json({ error: "Question cannot be empty" }, 400);
  }
  if (options !== undefined && (!Array.isArray(options) || options.length < 1)) {
    return c.json({ error: "At least 1 option required" }, 400);
  }

  const clampedMax = maxWager !== undefined ? Math.min(Math.max(1, maxWager), 7) : undefined;
  const clampedMin = minWager !== undefined ? Math.min(Math.max(1, minWager), clampedMax ?? 7) : undefined;

  await updateBonusEvent(partyId, eventId, {
    ...(question !== undefined && { question: question.trim() }),
    ...(options !== undefined && { options }),
    ...(clampedMax !== undefined && { maxWager: clampedMax }),
    ...(clampedMin !== undefined && { minWager: clampedMin }),
  });

  return c.json({ updated: true });
});

// Delete bonus event (host only)
app.delete("/:partyId/bonus/:eventId", hostGuard, async (c) => {
  const partyId = param(c, "partyId");
  const eventId = param(c, "eventId");
  await deleteBonusEvent(partyId, eventId);
  return c.json({ deleted: true });
});

// Lock bonus event (host only)
app.post("/:partyId/bonus/:eventId/lock", hostGuard, async (c) => {
  const partyId = param(c, "partyId");
  const eventId = param(c, "eventId");
  await lockBonusEvent(partyId, eventId);
  await setBonusUpNext(partyId, eventId, false);
  return c.json({ status: "locked" });
});

// Unlock bonus event (host only)
app.post("/:partyId/bonus/:eventId/unlock", hostGuard, async (c) => {
  const partyId = param(c, "partyId");
  const eventId = param(c, "eventId");
  await unlockBonusEvent(partyId, eventId);
  return c.json({ status: "open" });
});

// Get template bonus suggestions for this party's event
app.get("/:partyId/bonus/suggestions", hostGuard, async (c) => {
  const partyId = param(c, "partyId");

  const { getParty } = await import("../db/parties.js");
  const partyData = await getParty(partyId);
  if (!partyData) return c.json([]);

  const event = await getEvent(partyData.eventId);
  if (!event || event.templatePartyId === partyId) {
    // This IS the template party, no suggestions
    return c.json([]);
  }

  const templateBonuses = await getBonusEvents(event.templatePartyId);
  const myBonuses = await getBonusEvents(partyId);
  const myQuestions = new Set(myBonuses.map((b) => b.question.toLowerCase()));

  // Return template bonuses the host hasn't already added
  return c.json(
    templateBonuses
      .filter((b) => !myQuestions.has(b.question.toLowerCase()))
      .map((b) => ({
        eventId: b.eventId,
        question: b.question,
        options: b.options,
        minWager: b.minWager,
        maxWager: b.maxWager,
      }))
  );
});

// Place wager
app.post("/:partyId/bonus/:eventId/wager", memberGuard, async (c) => {
  const { userId } = getUser(c);
  const partyId = param(c, "partyId");
  const eventId = param(c, "eventId");
  const { prediction, wagerAmount } = await c.req.json();

  if (!prediction) {
    return c.json({ error: "prediction is required" }, 400);
  }

  // Fetch the event to get maxWager for validation
  const events = await getBonusEvents(partyId);
  const event = events.find((e) => e.eventId === eventId);
  if (!event) {
    return c.json({ error: "Bonus event not found" }, 404);
  }
  if (event.status !== "open") {
    return c.json({ error: "Wagering is closed" }, 400);
  }

  const eventMax = event.maxWager || 7;
  const eventMin = event.minWager || 1;
  const amount = Math.min(Math.max(eventMin, wagerAmount || eventMin), eventMax);

  const wager: Wager = {
    userId,
    eventId,
    prediction,
    wagerAmount: amount,
    createdAt: new Date().toISOString(),
  };

  await placeWager(partyId, wager);
  return c.json(wager);
});

// Emcee: broadcast up-next (closing soon) to all parties
app.post("/:partyId/bonus/:eventId/broadcast-up-next", emceeGuard, async (c) => {
  const partyId = param(c, "partyId");
  const eventId = param(c, "eventId");

  const bonuses = await getBonusEvents(partyId);
  const bonus = bonuses.find((b) => b.eventId === eventId);
  if (!bonus) return c.json({ error: "Bonus event not found" }, 404);

  // Clear upNext on all other bonus events in this party
  await Promise.all(
    bonuses
      .filter((b) => b.upNext && b.eventId !== eventId)
      .map((b) => setBonusUpNext(partyId, b.eventId, false))
  );
  await setBonusUpNext(partyId, eventId, true);

  // Broadcast to all other parties
  const allParties = await getAllEventParties("oscars_2026");
  await Promise.all(
    allParties
      .filter((p) => p.partyId !== partyId && p.emceeSync !== false)
      .map(async (party) => {
        const partyBonuses = await getBonusEvents(party.partyId);
        // Clear other upNext
        await Promise.all(
          partyBonuses
            .filter((b) => b.upNext)
            .map((b) => setBonusUpNext(party.partyId, b.eventId, false))
        );
        const match = partyBonuses.find((b) => b.question.toLowerCase() === bonus.question.toLowerCase());
        if (match) await setBonusUpNext(party.partyId, match.eventId, true);
      })
  );

  // Notify all parties
  await Promise.all(
    allParties.map((p) => createNotification(p.partyId, "wager-locked", `Wager closing soon: ${bonus.question}`, "/bonus"))
  ).catch(() => {});

  return c.json({ upNext: true });
});

// Emcee: clear up-next on a bonus event
app.delete("/:partyId/bonus/:eventId/broadcast-up-next", emceeGuard, async (c) => {
  const partyId = param(c, "partyId");
  const eventId = param(c, "eventId");

  await setBonusUpNext(partyId, eventId, false);

  // Broadcast to all other parties
  const bonuses = await getBonusEvents(partyId);
  const bonus = bonuses.find((b) => b.eventId === eventId);
  if (bonus) {
    const allParties = await getAllEventParties("oscars_2026");
    await Promise.all(
      allParties
        .filter((p) => p.partyId !== partyId && p.emceeSync !== false)
        .map(async (party) => {
          const partyBonuses = await getBonusEvents(party.partyId);
          const match = partyBonuses.find((b) => b.question.toLowerCase() === bonus.question.toLowerCase());
          if (match) await setBonusUpNext(party.partyId, match.eventId, false);
        })
    );
  }

  return c.json({ upNext: false });
});

// Emcee: broadcast lock bonus to all parties
app.post("/:partyId/bonus/:eventId/broadcast-lock", emceeGuard, async (c) => {
  const partyId = param(c, "partyId");
  const eventId = param(c, "eventId");

  const bonuses = await getBonusEvents(partyId);
  const bonus = bonuses.find((b) => b.eventId === eventId);
  if (!bonus) return c.json({ error: "Bonus event not found" }, 404);

  // Lock on the source party + clear upNext
  await lockBonusEvent(partyId, eventId);
  if (bonus.upNext) await setBonusUpNext(partyId, eventId, false);

  // Broadcast to all other parties
  const event = await getEvent("oscars_2026");
  const count = event
    ? await broadcastBonusAction(partyId, "oscars_2026", bonus.question, lockBonusEvent)
    : 0;

  // Notify all parties
  const allParties = await getAllEventParties("oscars_2026");
  await Promise.all(
    allParties.map((p) => createNotification(p.partyId, "wager-locked", `Wager locked: ${bonus.question}`, "/bonus"))
  ).catch(() => {});

  return c.json({ status: "locked", broadcastCount: count });
});

// Emcee: broadcast unlock bonus to all parties
app.post("/:partyId/bonus/:eventId/broadcast-unlock", emceeGuard, async (c) => {
  const partyId = param(c, "partyId");
  const eventId = param(c, "eventId");

  const bonuses = await getBonusEvents(partyId);
  const bonus = bonuses.find((b) => b.eventId === eventId);
  if (!bonus) return c.json({ error: "Bonus event not found" }, 404);

  await unlockBonusEvent(partyId, eventId);

  const event = await getEvent("oscars_2026");
  const count = event
    ? await broadcastBonusAction(partyId, "oscars_2026", bonus.question, unlockBonusEvent)
    : 0;

  const allParties = await getAllEventParties("oscars_2026");
  await Promise.all(
    allParties.map((p) => createNotification(p.partyId, "wager-unlocked", `Wager reopened: ${bonus.question}`, "/bonus"))
  ).catch(() => {});

  return c.json({ status: "open", broadcastCount: count });
});

// Emcee: broadcast resolve bonus to all parties
app.post("/:partyId/bonus/:eventId/broadcast-resolve", emceeGuard, async (c) => {
  const partyId = param(c, "partyId");
  const eventId = param(c, "eventId");
  const { correctAnswer } = await c.req.json();

  if (!correctAnswer) return c.json({ error: "correctAnswer is required" }, 400);

  const bonuses = await getBonusEvents(partyId);
  const bonus = bonuses.find((b) => b.eventId === eventId);
  if (!bonus) return c.json({ error: "Bonus event not found" }, 404);

  await resolveBonusEvent(partyId, eventId, correctAnswer);

  const event = await getEvent("oscars_2026");
  const count = event
    ? await broadcastBonusAction(
        partyId,
        "oscars_2026",
        bonus.question,
        (pid, eid) => resolveBonusEvent(pid, eid, correctAnswer)
      )
    : 0;

  // Personalized notifications per user
  const allParties = await getAllEventParties("oscars_2026");
  const notifyWork = allParties.map(async (party) => {
    const [partyBonuses, partyWagers, members] = await Promise.all([
      getBonusEvents(party.partyId),
      getUserWagers(party.partyId, "").catch(() => []), // fallback
      getMembers(party.partyId),
    ]);
    // Get all wagers for this bonus event across all users
    const { getWagers } = await import("../db/bonus.js");
    const allWagers = await getWagers(party.partyId);
    const matchingBonus = partyBonuses.find((b) => b.question.toLowerCase() === bonus.question.toLowerCase());
    if (!matchingBonus) return;
    const wagersByUser = new Map(
      allWagers.filter((w) => w.eventId === matchingBonus.eventId).map((w) => [w.userId, w])
    );
    await Promise.all(
      members
        .filter((m) => m.status === "active")
        .map((m) => {
          const wager = wagersByUser.get(m.userId);
          let ptsText: string;
          if (!wager) {
            ptsText = "You didn't wager.";
          } else if (correctAnswer === "__none__") {
            ptsText = `You lost ${wager.wagerAmount} pts.`;
          } else if (wager.prediction === correctAnswer) {
            ptsText = `You earned +${wager.wagerAmount} pts!`;
          } else {
            ptsText = `You lost ${wager.wagerAmount} pts.`;
          }
          const q = bonus.question.length > 50 ? bonus.question.slice(0, 47) + "..." : bonus.question;
          return createNotification(party.partyId, "wager-resolved", `Wager resolved: ${q} ${ptsText}`, "/bonus", m.userId);
        })
    );
  });
  Promise.all(notifyWork).catch(() => {});

  return c.json({ status: "resolved", correctAnswer, broadcastCount: count });
});

// Emcee: broadcast unresolve bonus to all parties
app.post("/:partyId/bonus/:eventId/broadcast-unresolve", emceeGuard, async (c) => {
  const partyId = param(c, "partyId");
  const eventId = param(c, "eventId");

  const bonuses = await getBonusEvents(partyId);
  const bonus = bonuses.find((b) => b.eventId === eventId);
  if (!bonus) return c.json({ error: "Bonus event not found" }, 404);

  await unresolveBonusEvent(partyId, eventId);

  const count = await broadcastBonusAction(
    partyId, "oscars_2026", bonus.question,
    (pid, eid) => unresolveBonusEvent(pid, eid)
  );

  return c.json({ status: "open", broadcastCount: count });
});

// Cancel wager (while event is open)
app.delete("/:partyId/bonus/:eventId/wager", memberGuard, async (c) => {
  const { userId } = getUser(c);
  const partyId = param(c, "partyId");
  const eventId = param(c, "eventId");

  const events = await getBonusEvents(partyId);
  const event = events.find((e) => e.eventId === eventId);
  if (!event) {
    return c.json({ error: "Bonus event not found" }, 404);
  }
  if (event.status !== "open") {
    return c.json({ error: "Cannot cancel wager — event is locked or resolved" }, 400);
  }

  await deleteWager(partyId, userId, eventId);
  return c.json({ deleted: true });
});

export default app;
