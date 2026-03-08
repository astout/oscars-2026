import type { Context, Next } from "hono";
import { getMember } from "../db/parties.js";
import { getUser } from "./auth.js";
import { param } from "./params.js";

// Ensures the requesting user is an active member of the party
export async function memberGuard(c: Context, next: Next) {
  const partyId = param(c, "partyId");
  const { userId } = getUser(c);

  const member = await getMember(partyId, userId);
  if (!member || member.status !== "active") {
    return c.json({ error: "Not a member of this party" }, 403);
  }

  c.set("member", member);
  await next();
}

// Ensures the requesting user is the host of the party
export async function hostGuard(c: Context, next: Next) {
  const partyId = param(c, "partyId");
  const { userId } = getUser(c);

  const member = await getMember(partyId, userId);
  if (!member || member.role !== "host") {
    return c.json({ error: "Host access required" }, 403);
  }

  c.set("member", member);
  await next();
}
