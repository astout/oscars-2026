import type { Context, Next } from "hono";
import { getMember } from "../db/academies.js";
import { getUser } from "./auth.js";
import { param } from "./params.js";

// Ensures the requesting user is an active member of the academy
export async function memberGuard(c: Context, next: Next) {
  const academyId = param(c, "academyId");
  const { userId } = getUser(c);

  const member = await getMember(academyId, userId);
  if (!member || member.status !== "active") {
    return c.json({ error: "Not a member of this academy" }, 403);
  }

  c.set("member", member);
  await next();
}

// Ensures the requesting user is the host of the academy
export async function hostGuard(c: Context, next: Next) {
  const academyId = param(c, "academyId");
  const { userId } = getUser(c);

  const member = await getMember(academyId, userId);
  if (!member || member.role !== "host") {
    return c.json({ error: "Host access required" }, 403);
  }

  c.set("member", member);
  await next();
}
