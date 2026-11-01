import type { ErrorRequestHandler, RequestHandler } from "express";
import type { Logger } from "./logger.js";

const GENERIC_ERROR_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Something went wrong</title>
</head>
<body>
<main>
<h1>Something went wrong</h1>
<p>We could not complete your request. Please try again later.</p>
</main>
</body>
</html>
`;

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).type("html").send(GENERIC_ERROR_PAGE);
};

/**
 * Generic error handler: never renders the error message, stack, or any
 * request data. Only an "error" outcome category and request ID are logged.
 */
export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (err, _req, res, _next) => {
    const requestId = typeof res.locals.requestId === "string" ? res.locals.requestId : "unknown";
    logger.logOutcome("error", requestId);
    const candidate = (err as { status?: unknown } | null)?.status;
    const status =
      typeof candidate === "number" && candidate >= 400 && candidate < 500 ? candidate : 500;
    if (res.headersSent) {
      res.end();
      return;
    }
    res.status(status).set("Cache-Control", "no-store").type("html").send(GENERIC_ERROR_PAGE);
  };
}
