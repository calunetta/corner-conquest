---
name: run-app
description: How to start Corner Conquest locally for a check - the dev server and its testbed, the production build used by e2e, and the Firestore emulator. Use when a task needs the app or a preview running, before ui-verify or e2e.
---

# Run the app

Commands are from `package.json` and `playwright.config.ts`. Ports: dev `9002`, e2e app `3000`, Firestore emulator `8080`.

## Dev server and testbed
- Start: `npm run dev` in the background (`run_in_background`). Ready at http://localhost:9002. `.claude/launch.json` has the same server as `dev`.
- Testbed index: http://localhost:9002/testbed; one preview: http://localhost:9002/testbed/<slug>. Routes are in `src/app/testbed/`.
- Stop the server before `npm run build`: both write `.next/`, and the dev server breaks if they overlap. If it breaks, stop it, delete `.next/`, start again.

## E2E (`npm run test:e2e`)
- Playwright starts two servers itself: the Firestore emulator (`firebase emulators:start --only firestore,auth`, project `demo-corner-conquest`) and `npm run build && npm run start` on port 3000 with emulator env vars.
- Needs Java 21. Check with `java -version`; without it, report "e2e not run: no Java 21".
- One spec: `npm run test:e2e -- e2e/<spec>.spec.ts`.
- Never point the app at the real Firebase project from a check.

## Checks without a browser
- `npm run typecheck`, `npm run lint`, `npx jest <path>`.

## Report
- The command you ran, the URL or spec, and whether it answered. Quote the failing output on error; never claim a page works from a command that did not run.
