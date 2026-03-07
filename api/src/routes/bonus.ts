import { Hono } from "hono";
import { ulid } from "ulid";
import {
  createBonusEvent,
  getBonusEvents,
  resolveBonusEvent,
  placeWager,
  getUserWagers,
} from "../db/bonus.js";
import { getUser } from "../middleware/auth.js";
import { memberGuard, hostGuard } from "../middleware/academy-access.js";
import { param } from "../middleware/params.js";
import type { BonusEvent, Wager } from "../types/index.js";

const app = new Hono();

// List bonus events + user's wagers
app.get("/:academyId/bonus", memberGuard, async (c) => {
  const { userId } = getUser(c);
  const academyId = param(c, "academyId");

  const [events, wagers] = await Promise.all([
    getBonusEvents(academyId),
    getUserWagers(academyId, userId),
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
app.post("/:academyId/bonus", hostGuard, async (c) => {
  const academyId = param(c, "academyId");
  const { question, eventType, options, basePoints } = await c.req.json();

  if (!question?.trim()) {
    return c.json({ error: "Question is required" }, 400);
  }

  const event: BonusEvent = {
    eventId: ulid(),
    question: question.trim(),
    eventType: eventType || "yes-no",
    options: options || ["Yes", "No"],
    correctAnswer: null,
    basePoints: basePoints || 2,
    status: "open",
    createdAt: new Date().toISOString(),
    resolvedAt: null,
  };

  await createBonusEvent(academyId, event);
  return c.json(event, 201);
});

// Resolve bonus event (host only)
app.patch("/:academyId/bonus/:eventId", hostGuard, async (c) => {
  const academyId = param(c, "academyId");
  const eventId = param(c, "eventId");
  const { correctAnswer } = await c.req.json();

  if (!correctAnswer) {
    return c.json({ error: "correctAnswer is required" }, 400);
  }

  await resolveBonusEvent(academyId, eventId, correctAnswer);
  return c.json({ status: "resolved", correctAnswer });
});

// Place wager
app.post("/:academyId/bonus/:eventId/wager", memberGuard, async (c) => {
  const { userId } = getUser(c);
  const academyId = param(c, "academyId");
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

  await placeWager(academyId, wager);
  return c.json(wager);
});

export default app;
