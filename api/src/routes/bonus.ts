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
  getUserWagers,
} from "../db/bonus.js";
import { getEvent } from "../db/events.js";
import { getUser } from "../middleware/auth.js";
import { memberGuard, hostGuard } from "../middleware/party-access.js";
import { param } from "../middleware/params.js";
import type { BonusEvent, Wager } from "../types/index.js";

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
  const { question, eventType, options, basePoints } = await c.req.json();

  if (!question?.trim()) {
    return c.json({ error: "Question is required" }, 400);
  }

  const event: BonusEvent = {
    eventId: randomUUID(),
    question: question.trim(),
    eventType: eventType || "yes-no",
    options: options || ["Yes", "No"],
    correctAnswer: null,
    basePoints: basePoints || 2,
    status: "open",
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
  return c.json({ status: "resolved", correctAnswer });
});

// Update bonus event (host only)
app.put("/:partyId/bonus/:eventId", hostGuard, async (c) => {
  const partyId = param(c, "partyId");
  const eventId = param(c, "eventId");
  const { question, options, basePoints } = await c.req.json();

  if (question !== undefined && !question?.trim()) {
    return c.json({ error: "Question cannot be empty" }, 400);
  }
  if (options !== undefined && (!Array.isArray(options) || options.length < 2)) {
    return c.json({ error: "At least 2 options required" }, 400);
  }

  await updateBonusEvent(partyId, eventId, {
    ...(question !== undefined && { question: question.trim() }),
    ...(options !== undefined && { options }),
    ...(basePoints !== undefined && { basePoints }),
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
        eventType: b.eventType,
        options: b.options,
        basePoints: b.basePoints,
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

  const amount = Math.min(Math.max(0, wagerAmount || 0), 5);

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

export default app;
