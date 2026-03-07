import type { Context } from "hono";

// Hono's c.req.param() returns string | undefined.
// Our routes always have these params defined via route patterns,
// so this is a safe assertion helper.
export function param(c: Context, name: string): string {
  const value = c.req.param(name);
  if (!value) throw new Error(`Missing route param: ${name}`);
  return value;
}
