import { getPort } from "./config.js";
import { MockOrderRepository } from "./data/mockOrderRepository.js";
import { createApp } from "./web/app.js";
import { registerRoutes } from "./web/routes.js";
import { getThrottleOptions, withThrottle } from "./web/throttle.js";

const behindProxy = process.env.BEHIND_PROXY === "true";
const app = createApp({
  repository: new MockOrderRepository(),
  behindProxy,
  registerRoutes: withThrottle(registerRoutes, getThrottleOptions()),
});
const port = getPort();

app.listen(port, () => {
  console.log(`Order Tracking listening on port ${port}`);
});
