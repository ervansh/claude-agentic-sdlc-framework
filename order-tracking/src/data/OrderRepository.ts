import type { TrackingDates, TrackingItem } from "../domain/types.js";

export type OrderStatus = "PLACED" | "PROCESSING" | "SHIPPED" | "DELIVERED";

/** Internal order record. customerLastName is for matching only; never render or log it. */
export interface Order {
  orderId: string;
  customerLastName: string;
  status: OrderStatus;
  items: TrackingItem[];
  dates: TrackingDates;
}

export interface OrderRepository {
  findByOrderId(orderId: string): Promise<Order | undefined>;
}
