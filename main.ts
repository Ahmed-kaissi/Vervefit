import { Hono } from "hono";
import { serveStatic } from "hono/deno";

// Cloud Run (and most container platforms) inject the listen port as $PORT
// and expect the server on 0.0.0.0. Deno.serve defaults to :8000, so read
// $PORT explicitly and fall back to 8000 for local runs.
const port = Number(Deno.env.get("PORT") ?? 8000);

const app = new Hono();

// Health check endpoint — Cloud Run startup probes and uptime monitors use
// /healthz, and it must not depend on any static asset existing. Registered
// first so it can never be shadowed by a static file of the same name.
app.get("/healthz", (c) => c.json({ ok: true }));

// Serve everything under dist. `serveStatic` joins `root` with the request
// path, so the root must be the dist directory itself: mounting "/assets/*"
// with root "./dist/assets" resolved to ./dist/assets/assets/<file> and
// silently missed on every asset request.
app.use("*", serveStatic({ root: "./dist" }));

// SPA fallback: any HTML navigation that isn't a real file gets the shell.
app.get("*", serveStatic({ path: "./dist/index.html" }));

Deno.serve({ port, hostname: "0.0.0.0" }, app.fetch);
