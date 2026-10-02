---
name: ui-verify
description: Check a component or feature in a real browser before calling it done - screenshot testbed previews or app pages at desktop and mobile sizes with a headless Chromium script, catch console and page errors, inspect the screenshots, and run targeted Playwright e2e specs when Firebase config exists. Use after any user-visible change.
---

# UI verification

Code that compiles can still look wrong. Look at it.

## 1. Start the app
- `npm run dev` (port 9002) with `run_in_background`. The script below waits up to 90 s for the server.
- Don't run `npm run build` while the dev server runs: both write `.next/` and the dev server breaks. If it happened: stop the server, delete `.next/`, start it again.

## 2. Screenshot
```bash
node .claude/skills/ui-verify/scripts/snapshot.mjs --all                                  # every testbed preview
node .claude/skills/ui-verify/scripts/snapshot.mjs http://localhost:9002/testbed/<slug>   # one preview, all states
node .claude/skills/ui-verify/scripts/snapshot.mjs "http://localhost:9002/testbed/<slug>?state=<State name>"
node .claude/skills/ui-verify/scripts/snapshot.mjs http://localhost:9002/                 # an app page
```
- Every URL is captured at desktop (1280×720) and mobile (390×844) size into `test-results/ui-verify/` (git-ignored).
- FAIL (exit 1) means a console error or uncaught exception from the app, an HTTP error, or a testbed slug or state that doesn't exist.
- Console errors from other origins (for example Google Fonts blocked by a sandbox proxy) print as warnings and don't fail the run.
- "Executable doesn't exist": run `npx playwright install chromium`, or set `CHROMIUM_PATH` to a Chromium binary. In cloud sessions the SessionStart hook sets it.

## 3. Look
Read every PNG produced (the Read tool displays images) and compare with `ui-design.md`'s acceptance criteria:
- layout, spacing and alignment; nothing clipped or overflowing at mobile width
- copy exactly as specified; text readable on the dark theme
- every planned state present and visually distinct
The round button in the bottom-left corner is the Next.js dev indicator, not part of the app.

## 4. Interact
For interactive changes, script the interaction with Playwright (`chromium` from `@playwright/test`): click by role or `data-testid`, then assert the visible result. Run the script from inside the repo so `@playwright/test` resolves. The `Interactive` state of `/testbed/map-zoom-controls` is a working target.

## 5. Flows (e2e)
With Firebase config in `.env.local`: `npm run test:e2e -- e2e/<spec>.spec.ts`. Without it, report "e2e not run: no Firebase config", never "passed". Details in skill `testing`.

## Report
The URLs checked, the screenshot paths, any errors or warnings, and what you compared the screenshots against.
