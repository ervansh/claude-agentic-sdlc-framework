import type { Order } from "./OrderRepository.js";

/** Fictional, server-side-only fixture data. Never import from static assets. */
export const mockOrders: readonly Order[] = [
  {
    orderId: "ORD1000001",
    customerLastName: "Smith",
    status: "PLACED",
    items: [{ name: "Example Widget", quantity: 2 }],
    dates: { placed: "2026-10-01" },
  },
  {
    orderId: "ORD1000002",
    customerLastName: "Johnson",
    status: "PROCESSING",
    items: [{ name: "Sample Gadget", quantity: 1 }],
    dates: { placed: "2026-10-02", estimatedDelivery: "2026-10-09" },
  },
  {
    orderId: "ORD1000003",
    customerLastName: "McDonald-Rivera",
    status: "SHIPPED",
    items: [
      { name: "Demo Lamp", quantity: 1 },
      { name: "Demo Cable", quantity: 3 },
    ],
    dates: { placed: "2026-09-25", estimatedDelivery: "2026-10-05" },
  },
  {
    orderId: "ORD1000004",
    customerLastName: "Nguyen",
    status: "DELIVERED",
    items: [{ name: "Test Notebook", quantity: 4 }],
    dates: {
      placed: "2026-09-10",
      estimatedDelivery: "2026-09-17",
      delivered: "2026-09-16",
    },
  },
  {
    // Shares a last name with ORD1000001.
    orderId: "ORD1000005",
    customerLastName: "Smith",
    status: "SHIPPED",
    items: [{ name: "Placeholder Mug", quantity: 6 }],
    dates: { placed: "2026-10-03", estimatedDelivery: "2026-10-10" },
  },
];
