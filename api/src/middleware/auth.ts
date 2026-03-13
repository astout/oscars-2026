import type { Context, Next } from "hono";
import type { AuthUser } from "../types/index.js";

// Extract user from API Gateway JWT authorizer context
export async function authMiddleware(c: Context, next: Next) {
  const claims = c.req.raw.headers.get("x-amzn-oidc-data")
    ? JSON.parse(c.req.raw.headers.get("x-amzn-oidc-data")!)
    : null;

  // API Gateway v2 JWT authorizer puts claims in the request context
  // accessible via the Lambda event
  const event = (c.req.raw as any).event || (c.env as any)?.event;
  const authorizer = event?.requestContext?.authorizer?.jwt?.claims;

  if (!authorizer?.sub) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const user: AuthUser = {
    userId: authorizer.sub,
    email: authorizer.email || "",
    displayName: authorizer["custom:displayName"] || undefined,
  };

  c.set("user", user);
  await next();
}

export function getUser(c: Context): AuthUser {
  return c.get("user") as AuthUser;
}

