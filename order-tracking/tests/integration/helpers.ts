import type { Express } from "express";
import { MockOrderRepository } from "../../src/data/mockOrderRepository.js";
import type { Order, OrderRepository } from "../../src/data/OrderRepository.js";
import { createApp } from "../../src/web/app.js";
import { registerRoutes } from "../../src/web/routes.js";

export interface SpyRepository extends OrderRepository {
  readonly calls: string[];
}

/** Wraps the mock repository and records every identifier it is asked to look up. */
export function createSpyRepository(): SpyRepository {
  const inner = new MockOrderRepository();
  const calls: string[] = [];
  return {
    calls,
    async findByOrderId(orderId: string): Promise<Order | undefined> {
      calls.push(orderId);
      return inner.findByOrderId(orderId);
    },
  };
}

export function createTestApp(): { app: Express; repository: SpyRepository } {
  const repository = createSpyRepository();
  const app = createApp({ repository, registerRoutes });
  return { app, repository };
}
