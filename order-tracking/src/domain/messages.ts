/** Static message text (P-4, P-5). Never interpolate submitted or stored values. */
export const ORDER_NUMBER_PATTERN = /^ORD[0-9]{7}$/;

export const MISSING_ORDER_NUMBER_MESSAGE = "Order number is required.";

export const FORMAT_ERROR_MESSAGE =
  "Order number must be ORD followed by exactly seven digits (for example, ORD1234567).";
