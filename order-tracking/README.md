# Order Tracking

Server-rendered Node.js + TypeScript + Express app for locating and tracking an existing order (story ORD-3).

Requires Node.js >= 22. Run all commands from `order-tracking/`.

```
npm install
npm run typecheck
npm run build
npm test            # all Vitest tests
npm run test:unit
npm run test:integration
npx playwright install   # one-time browser download for E2E
npm run test:e2e
npm run dev         # watch mode
npm start           # serves built app; PORT env var, default 3000
```
