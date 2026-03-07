import { serve } from "@hono/node-server";
import app from "./index.js";

const port = 3001;
console.log(`API running at http://localhost:${port}`);
serve({ fetch: app.fetch, port });
