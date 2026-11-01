import type { Express, RequestHandler } from "express";

export const DEFAULT_THROTTLE_MAX = 60;
export const DEFAULT_THROTTLE_WINDOW_MS = 60_000;

export interface ThrottleOptions {
  max: number;
  windowMs: number;
  now?: () => number;
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/** Limits come from THROTTLE_MAX and THROTTLE_WINDOW_MS; invalid values fall back to safe defaults. */
export function getThrottleOptions(env: NodeJS.ProcessEnv = process.env): ThrottleOptions {
  return {
    max: positiveInt(env.THROTTLE_MAX, DEFAULT_THROTTLE_MAX),
    windowMs: positiveInt(env.THROTTLE_WINDOW_MS, DEFAULT_THROTTLE_WINDOW_MS),
  };
}

/** In-memory fixed-window per-IP limiter. Throttled responses are generic and carry no order data. */
export function createThrottle(options: ThrottleOptions): RequestHandler {
  const now = options.now ?? Date.now;
  const hits = new Map<string, { count: number; resetAt: number }>();

  return (req, res, next) => {
    const t = now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= t) hits.delete(key);
    }
    const key = req.ip ?? "unknown";
    const entry = hits.get(key) ?? { count: 0, resetAt: t + options.windowMs };
    entry.count += 1;
    hits.set(key, entry);

    if (entry.count > options.max) {
      const retryAfter = Math.max(1, Math.ceil((entry.resetAt - t) / 1000));
      res
        .set("Cache-Control", "no-store")
        .set("Retry-After", String(retryAfter))
        .status(429)
        .type("text/plain")
        .send("Too many requests. Please try again later.");
      return;
    }
    next();
  };
}

/** Wraps a route registrar so POST /track is throttled before the lookup route runs. */
export function withThrottle<D>(
  register: (app: Express, deps: D) => void,
  options: ThrottleOptions,
): (app: Express, deps: D) => void {
  return (app, deps) => {
    app.post("/track", createThrottle(options));
    register(app, deps);
  };
}
