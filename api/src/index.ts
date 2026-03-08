import { Hono } from "hono";
import { handle } from "hono/aws-lambda";
import { authMiddleware } from "./middleware/auth.js";
import parties from "./routes/parties.js";
import categories from "./routes/categories.js";
import picks from "./routes/picks.js";
import bonus from "./routes/bonus.js";
import leaderboard from "./routes/leaderboard.js";
import admin from "./routes/admin.js";
import events from "./routes/events.js";
import users from "./routes/users.js";

const app = new Hono();

// Health check (no auth)
app.get("/api/health", (c) => c.json({ status: "ok" }));

// All other routes require auth
app.use("/api/*", authMiddleware);

// Mount routes
app.route("/api/v1/users", users);
app.route("/api/v1/parties", parties);
app.route("/api/v1/categories", categories);
app.route("/api/v1/parties", picks);
app.route("/api/v1/parties", bonus);
app.route("/api/v1/parties", leaderboard);
app.route("/api/v1/parties", admin);
app.route("/api/v1/events", events);

export const handler = handle(app);
export default app;
