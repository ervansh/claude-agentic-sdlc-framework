/**
 * Outcome-only logger (architecture Section 8 item 7, DR-003).
 * Emits ONLY an outcome category and a request ID. The signature accepts no
 * other data, so order numbers (full, partial, masked or hashed) and last
 * names cannot be logged through this module.
 */
export type OutcomeCategory = "success" | "missing" | "format" | "not-found" | "error";

export interface LogEntry {
  category: OutcomeCategory;
  requestId: string;
}

export type LogSink = (line: string) => void;

export interface Logger {
  logOutcome(category: OutcomeCategory, requestId: string): void;
}

const defaultSink: LogSink = (line) => {
  console.log(line);
};

export function createLogger(sink: LogSink = defaultSink): Logger {
  return {
    logOutcome(category, requestId) {
      const entry: LogEntry = { category, requestId };
      sink(JSON.stringify(entry));
    },
  };
}
