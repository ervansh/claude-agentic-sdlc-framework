import type { Order, OrderRepository } from "./OrderRepository.js";
import { mockOrders } from "./mockOrders.js";

export class MockOrderRepository implements OrderRepository {
  private readonly byId: Map<string, Order>;

  constructor(orders: readonly Order[] = mockOrders) {
    this.byId = new Map(orders.map((o) => [o.orderId, o]));
  }

  async findByOrderId(orderId: string): Promise<Order | undefined> {
    return this.byId.get(orderId);
  }
}
