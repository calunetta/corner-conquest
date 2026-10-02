# Final review: Firestore emulator for e2e tests, phase 1

VERDICT: APPROVED

This phase's work (commits `b2f1810` and `1b514ce`) matches the plan and passes typecheck, lint and unit tests at `af397e1`. That commit contains both and none of the firestore-rules work. After it, the parallel task `2026-10-02-firestore-rules` committed WIP to the same branch (`273cb48`, `8c57be6`) that breaks the checks (finding 1). That finding blocks the branch and that task, not this phase.

## Checks run
Run on two trees in this session:

**Main working tree (`/home/user/corner-conquest`, then `af397e1` plus the uncommitted firestore-rules changes, which have since been committed in `273cb48`/`8c57be6`)**
- `npm run typecheck`: FAIL, `TS2305: Module '"@testing-library/react"' has no exported member 'screen'` in 3 test files.
- `npm run lint`: FAIL, `✖ 4 problems (4 errors, 0 warnings)`, all in `firestore.rules.test.ts`.
- `npm test`: FAIL, `Test Suites: 16 failed, 16 total` / `Tests: 0 total` (`Cannot find module '@testing-library/dom'`).

**Clean worktree at `af397e1` (`npm ci`; contains this phase's commits and none of the firestore-rules work)**
- `npm run typecheck`: pass (no errors).
- `npm run lint`: pass (no problems).
- `npm test`: `Test Suites: 15 passed, 15 total`, `Tests: 57 passed, 57 total`.
- `npx jest src/lib/__tests__/firebase.test.ts`: `Tests: 5 passed, 5 total`.
- `npm run test:e2e` (with `CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`): `1 failed`, `5 passed (2.1m)`. Both web servers started and stopped. The emulator served every Firestore call: no `.env.local` exists in the worktree, and login, match creation and leaving all worked.
- ui-verify: not applicable (no UI change, the plan lists no preview states).

## Plan adherence
- `npm run test:e2e` starts the emulator, builds and serves on :3000, runs and stops: **met** (e2e run above, `playwright.config.ts:29-48`, `firebase.json`).
- One spec via `npm run test:e2e -- <spec>` / `npx playwright test <spec>`: **met by design** (`test:e2e` is still `playwright test`, `package.json:14`). Not run separately in this session.
- Emulator only when `NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST` is set: **met** (`src/lib/firebase.ts:34-39`, unit tests cases 1 to 3).
- No reuse of a foreign server on :3000, no `PLAYWRIGHT_TEST_BASE_URL`: **met** (`playwright.config.ts:16,41`; `grep` finds no other reference).
- Docs updated (`CLAUDE.md:30`, testing skill, ui-verify skill, `docs/README.md` §6.11, `tester-b.md:18`): **met**, the text matches plan steps 7 to 10b.
- typecheck, lint and unit tests pass: **met** at `af397e1`. The branch tip fails because of the firestore-rules WIP (finding 1).
- Full e2e suite passes, or each failing spec is reported: **met**. One failure is reported (finding 2).

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| 1 | `package-lock.json` (`273cb48`), `firestore.rules`, `firestore.rules.test.ts`, `package.json:64` | Task `2026-10-02-firestore-rules` commits WIP on this branch. Its `npm install` of `@firebase/rules-unit-testing` removed `@testing-library/dom` from `package-lock.json` (0 entries at `8c57be6`). On a clean install every Jest suite fails (`Cannot find module '@testing-library/dom'`, 16/16 failed in this session), and so does typecheck (`TS2305 ... no exported member 'screen'`). `firestore.rules.test.ts` failed lint (4 errors) when I ran it. Because `firebase.json` points the emulator at `firestore.rules`, e2e runs on the branch tip test the WIP rules, not the rules this phase was built against. Fix in that task: add `@testing-library/dom` as an explicit devDependency (or regenerate the lockfile so it is kept), fix the lint errors, and keep the rules suite out of `npm test` unless an emulator is started. Don't merge or deploy the branch until `npm run typecheck`, `npm run lint` and `npm test` pass at its tip. | firestore-rules task (implementer-a), coordinator | yes, for the branch and that task; not for this phase |
| 2 | `e2e/map-viewport.spec.ts:78-121`, `e2e/e2e-cleanup.ts:13` | The mobile viewport test fails with `Test timeout of 30000ms exceeded while running "afterEach" hook`. This is not caused by a cold build: the server is fully built before the first test, and four tests passed before it. The cause is a race in the test code. The mobile test clicks "Confirm & Leave" and ends without waiting for the lobby (the desktop test waits, line 75). `safeCleanupGame` then sees the exit button while the board unmounts and calls `exitBtn.click()` with no timeout, which waits until the test limit. Neither file changed in this phase. Log it as a separate follow-up task: wait for `Game Lobby` at the end of the mobile test, and give the cleanup's `click()` calls a short `{ timeout }`. | tester-b (follow-up task) | no |
| 3 | `src/lib/__tests__/firebase.test.ts:41-42` | `process.env.X = originalEnv` sets the string `"undefined"` when the variable was unset at the start. Delete the key when `originalEnv` is `undefined`. No current test is affected. | tester-a | no |
| 4 | `src/lib/__tests__/firebase.test.ts:79-96` | The "parses the port as a number" and "high port number" cases repeat case 1, whose `toHaveBeenCalledWith(mockDb, '127.0.0.1', 8080)` already checks the numeric port. They could be one `it.each` table with cases 1 and 3. The `undefined` re-exports at lines 16-28 and the `jest.resetModules()` next to `isolateModules` are also unneeded. | tester-a | no |

## Docs
- `docs/README.md`: updated (§6.11, Firestore Emulator bullet). `CLAUDE.md` and the testing and ui-verify skills were updated too.
