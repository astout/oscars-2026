import type { Context, Next } from "hono";
import { isEmcee } from "../db/events.js";
import { getParty } from "../db/parties.js";
import { getUser } from "./auth.js";

const DEFAULT_EVENT_ID = "oscars_2026";

// Ensures the requesting user is an emcee for the event,
// OR the host of a self-emceed party (emceeSync: false)
// Sets c.set("emceeType", "global" | "self") for downstream route logic
export async function emceeGuard(c: Context, next: Next) {
  const { userId } = getUser(c);

  const authorized = await isEmcee(DEFAULT_EVENT_ID, userId);
  if (authorized) {
    c.set("emceeType", "global");
    await next();
    return;
  }

  // Check if user is host of a self-emceed party
  const partyId = c.req.param("partyId");
  if (partyId) {
    const party = await getParty(partyId);
    if (party && party.hostUserId === userId && party.emceeSync === false) {
      c.set("emceeType", "self");
      await next();
      return;
    }
  }

  return c.json({ error: "Emcee access required" }, 403);
}

// Stricter guard: only global emcees (not self-emcee hosts)
// Use for event-level actions like setting winners and up-next
export async function globalEmceeGuard(c: Context, next: Next) {
  const { userId } = getUser(c);

  const authorized = await isEmcee(DEFAULT_EVENT_ID, userId);
  if (!authorized) {
    return c.json({ error: "Global emcee access required" }, 403);
  }

  c.set("emceeType", "global");
  await next();
}
