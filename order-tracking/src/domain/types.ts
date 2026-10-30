export interface TrackingItem {
  name: string;
  quantity: number;
}

export interface TrackingDates {
  placed: string;
  estimatedDelivery?: string;
  delivered?: string;
}

/** The only shape that may reach a template on success. */
export interface TrackingView {
  orderId: string;
  status: string;
  items: TrackingItem[];
  dates: TrackingDates;
}

export interface Success {
  kind: "Success";
  view: TrackingView;
}

export interface MissingInput {
  kind: "MissingInput";
  field: "orderNumber";
}

/** Payload-free: must never carry submitted or stored values. */
export interface FormatError {
  kind: "FormatError";
}

/** Payload-free: must never carry submitted or stored values. */
export interface NotFoundOrNotValidated {
  kind: "NotFoundOrNotValidated";
}

export type LookupResult =
  | Success
  | MissingInput
  | FormatError
  | NotFoundOrNotValidated;

export interface RawLookupInput {
  orderNumber?: string | null;
  lastName?: string | null;
}

export interface NormalizedInput {
  /** Uppercased, trimmed, one optional separator after ORD removed. May be empty. */
  orderNumber: string;
  /** Lowercased and trimmed; undefined when omitted or whitespace-only. */
  lastName: string | undefined;
}
