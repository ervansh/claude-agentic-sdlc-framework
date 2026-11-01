import { defineConfig } from "vitest/config";

// Separate config so the performance smoke test does not run concurrently with (and get
// perturbed by) the unit/integration suites. Used only by `npm run test:perf`.
export default defineConfig({
  test: {
    include: ["tests/performance/**/*.test.ts"],
    environment: "node",
    testTimeout: 60000,
  },
});
