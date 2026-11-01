import type { Express, Response } from "express";
import type { OrderRepository } from "../data/OrderRepository.js";
import {
  FORMAT_ERROR_MESSAGE,
  MISSING_ORDER_NUMBER_MESSAGE,
  ORDER_NUMBER_PATTERN,
} from "../domain/messages.js";
import { lookupOrder } from "../domain/lookupOrder.js";
import { normalizeInput } from "../domain/normalize.js";
import type { LookupResult } from "../domain/types.js";
import type { Logger, OutcomeCategory } from "./logger.js";

/** Static text only (P-3). Identical for unknown order and last-name mismatch. */
export const NOT_FOUND_MESSAGE =
  "We could not find or validate that order. Check your details and try again.";

interface FormModel {
  /** Retained only when it passes the format check; last name is never echoed. */
  orderNumber: string;
  summaryMessage?: string;
  fieldMessage?: string;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function renderForm(res: Response, model: FormModel): void {
  res.set("Cache-Control", "no-store").status(200).render("form.njk", model);
}

function categoryOf(result: LookupResult): OutcomeCategory {
  switch (result.kind) {
    case "Success":
      return "success";
    case "MissingInput":
      return "missing";
    case "FormatError":
      return "format";
    case "NotFoundOrNotValidated":
      return "not-found";
  }
}

export function registerRoutes(
  app: Express,
  deps: { repository: OrderRepository; logger: Logger },
): void {
  const showForm = (_req: unknown, res: Response): void => {
    renderForm(res, { orderNumber: "" });
  };
  app.get("/", showForm);
  app.get("/track", showForm);

  // Identifiers are accepted from the POST body only, never the query string.
  app.post("/track", async (req, res, next) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const raw = {
        orderNumber: asString(body.orderNumber),
        lastName: asString(body.lastName),
      };
      const result = await lookupOrder(deps.repository, raw);
      deps.logger.logOutcome(categoryOf(result), String(res.locals.requestId));

      switch (result.kind) {
        case "Success":
          res
            .set("Cache-Control", "no-store")
            .status(200)
            .render("tracking.njk", { view: result.view });
          return;
        case "MissingInput":
          renderForm(res, {
            orderNumber: "",
            summaryMessage: MISSING_ORDER_NUMBER_MESSAGE,
            fieldMessage: MISSING_ORDER_NUMBER_MESSAGE,
          });
          return;
        case "FormatError":
          renderForm(res, {
            orderNumber: "",
            summaryMessage: FORMAT_ERROR_MESSAGE,
            fieldMessage: FORMAT_ERROR_MESSAGE,
          });
          return;
        case "NotFoundOrNotValidated": {
          // Only a value that already passed the format check may be retained.
          const normalized = normalizeInput(raw).orderNumber;
          renderForm(res, {
            orderNumber: ORDER_NUMBER_PATTERN.test(normalized) ? normalized : "",
            summaryMessage: NOT_FOUND_MESSAGE,
          });
          return;
        }
      }
    } catch (err) {
      next(err);
    }
  });
}
