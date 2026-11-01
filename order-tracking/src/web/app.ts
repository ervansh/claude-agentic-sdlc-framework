import { randomUUID } from "node:crypto";
import path from "node:path";
import express, { type Express } from "express";
import helmet from "helmet";
import nunjucks from "nunjucks";
import type { OrderRepository } from "../data/OrderRepository.js";
import { createErrorHandler, notFoundHandler } from "./errorHandler.js";
import { createLogger, type Logger } from "./logger.js";

export const BODY_LIMIT = "4kb";

export interface AppDependencies {
  repository: OrderRepository;
  logger?: Logger;
  /** True only when running behind a TLS-terminating proxy; enables HTTP->HTTPS redirect. */
  behindProxy?: boolean;
  /** Hook for IMP-007 routes (and tests). Runs before the 404 and error handlers. */
  registerRoutes?: (app: Express, deps: { repository: OrderRepository; logger: Logger }) => void;
}

export function createApp(deps: AppDependencies): Express {
  const app = express();
  const logger = deps.logger ?? createLogger();
  const webRoot = path.join(process.cwd(), "src", "web");

  app.disable("x-powered-by");

  if (deps.behindProxy) {
    app.set("trust proxy", 1);
  }

  // Request ID is always server-generated; never taken from client input.
  app.use((_req, res, next) => {
    res.locals.requestId = randomUUID();
    next();
  });

  // helmet defaults include CSP and HSTS; Referrer-Policy overridden to no-referrer.
  app.use(helmet({ referrerPolicy: { policy: "no-referrer" } }));

  app.get("/healthz", (_req, res) => {
    res.set("Cache-Control", "no-store").status(200).json({ status: "ok" });
  });

  if (deps.behindProxy) {
    app.use((req, res, next) => {
      if (req.secure) {
        next();
        return;
      }
      // Same host, same path; 308 preserves the method. /healthz is exempt (registered earlier).
      res.redirect(308, `https://${req.hostname}${req.originalUrl.startsWith("/") ? req.originalUrl : "/"}`);
    });
  }

  app.use(express.urlencoded({ extended: false, limit: BODY_LIMIT }));
  app.use(express.static(path.join(webRoot, "public")));

  nunjucks.configure(path.join(webRoot, "views"), { autoescape: true, express: app });
  app.set("view engine", "njk");

  deps.registerRoutes?.(app, { repository: deps.repository, logger });

  app.use(notFoundHandler);
  app.use(createErrorHandler(logger));

  return app;
}
