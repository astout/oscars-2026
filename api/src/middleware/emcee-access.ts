import type { Context, Next } from "hono";
import { isEmcee } from "../db/events.js";
import { getUser } from "./auth.js";

const DEFAULT_EVENT_ID = "oscars_2026";

// Ensures the requesting user is an emcee for the event
export async function emceeGuard(c: Context, next: Next) {
  const { userId } = getUser(c);

  const authorized = await isEmcee(DEFAULT_EVENT_ID, userId);
  if (!authorized) {
    return c.json({ error: "Emcee access required" }, 403);
  }

  await next();
}
