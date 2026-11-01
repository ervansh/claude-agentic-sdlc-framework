import type { Order } from "../data/OrderRepository.js";
import type { TrackingView } from "./types.js";

/** Maps only the displayable fields. The customer name is deliberately excluded. */
export function toTrackingView(order: Order): TrackingView {
  return {
    orderId: order.orderId,
    status: order.status,
    items: order.items.map((i) => ({ name: i.name, quantity: i.quantity })),
    dates: { ...order.dates },
  };
}
