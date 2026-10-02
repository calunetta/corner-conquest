# Plan: Firestore emulator for e2e tests

Status: DRAFT
Inputs: triage.md

## Goal and acceptance criteria
- [ ] `npm run test:e2e` starts a local Firestore emulator (project `demo-corner-conquest`), builds and serves the app on :3000 wired to that emulator, runs Playwright, and stops both servers afterwards. No `.env.local` is needed.
- [ ] `npm run test:e2e -- e2e/<spec>.spec.ts` and `npx playwright test e2e/<spec>.spec.ts` keep working (one spec, same emulator setup). Both forms are used today: `.claude/skills/ui-verify/SKILL.md:37`, `.claude/settings.json:11,15`.
- [ ] The Firestore client connects to the emulator only when `NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST` is set. `npm run dev`, `npm run build` and production keep using the real project as before.
- [ ] Playwright can no longer reach the real project: it never reuses a server it did not start on :3000, and the `PLAYWRIGHT_TEST_BASE_URL` override is removed.
- [ ] `CLAUDE.md`, `docs/README.md` §6.11 and the `testing` and `ui-verify` skills no longer say that e2e needs `.env.local` or writes to the real project.
- [ ] `npm run typecheck`, `npm run lint` and `npm test` pass. The full e2e suite passes against the emulator, or tester-b reports each failing spec with its error.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `firebaseConfig` (reads `NEXT_PUBLIC_FIREBASE_*`) | `src/lib/firebase.ts:20-27` | `projectId` comes from `NEXT_PUBLIC_FIREBASE_PROJECT_ID`; e2e overrides it with the demo project |
| `app`, `db = getFirestore(app)` | `src/lib/firebase.ts:30-31` | The emulator connection goes right after line 31, before any read or write |
| `'use client'` on line 2, file starts with a blank line 1 | `src/lib/firebase.ts:1-2` | Leave as is (no opportunistic edits) |
| `connectFirestoreEmulator(firestore, host: string, port: number, options?)` | `node_modules/@firebase/firestore/dist/index.d.ts:338` (firebase `11.9.1`) | API used for the connection |
| Only collections used: `games`, `usernames` | `src/hooks/use-player.tsx:20`, `src/features/lobby/components/Lobby.tsx:34`, `src/hooks/use-game-engine.ts:25` | `firestore.rules` already allows both, so the emulator can apply the real rules |
| `firestore.rules` (allow read/write on `games/**` and `usernames/*`) | `firestore.rules:1-12` | Referenced from the new `firebase.json` |
| No `firebase.json`; `.firebaserc` default project `studio-7086354571-8fddd` | repo root (`ls`), `.firebaserc:3` | `firebase.json` is new. `.firebaserc` stays: `--project demo-corner-conquest` overrides it |
| `webServer` (single object, `npm run start`, `reuseExistingServer: true`, timeout 120000) | `playwright.config.ts:23-28` | Becomes an array of two servers |
| `baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL \|\| 'http://localhost:3000'` | `playwright.config.ts:10` | Override removed |
| `webServer?: TestConfigWebServer \| TestConfigWebServer[]` | `node_modules/playwright/types/test.d.ts:1044` (@playwright/test `^1.62.1`) | Several servers per run are supported |
| `env`, `gracefulShutdown { signal, timeout }`, `reuseExistingServer` | `node_modules/playwright/types/test.d.ts:10767,10776,10804` | Options used below |
| webServer env is `{ ...process.env, ...options.env }` | `node_modules/playwright/lib/runner/index.js:858-861` | Our env adds to the inherited env and does not replace it |
| Next.js env precedence: a `.env*` value is applied only when the key is not already in `process.env` | `node_modules/@next/env/dist/index.js`, `processEnv` (`typeof l[t]==="undefined"`) | The webServer env wins over `.env.local` during `next build` |
| `"test:e2e": "playwright test"` | `package.json:14` | Unchanged |
| `firebase-tools` not installed (no `node_modules/.bin/firebase`, no global `firebase`) | `ls node_modules/.bin \| grep fire` → empty | New devDependency; registry latest is `15.32.1`, engines `node >=20` (`npm view`) |
| Node `v22.22.0`, Java `openjdk 21.0.11` | `node -v`, `java -version` | The emulator needs Java |
| `firestore-debug.log` already ignored | `.gitignore` (`# firebase` section) | Emulator log stays out of git |
| `src/lib/**` and the e2e specs are in `LEGACY_PATHS` (not linted); `playwright.config.ts` is linted | `eslint.config.mjs:12-28` | `playwright.config.ts` must pass `npm run lint` |
| Legacy tests live in `src/lib/__tests__/` | `ls src/lib/__tests__` | Location for the new `firebase.test.ts` |
| E2E docs | `CLAUDE.md:30`, `.claude/skills/testing/SKILL.md:48-49`, `.claude/skills/ui-verify/SKILL.md:37`, `docs/README.md:415-417` (§6.11) | Text to update |
| Specs use random usernames and match names and need no seed data | `e2e/*.spec.ts` (e.g. `e2e/gameplay.spec.ts:9-10`) | An empty emulator database is enough |

## Decisions
- Connect with `connectFirestoreEmulator` in `src/lib/firebase.ts` when `NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST` (`host:port`) is set. This is the minimal legacy wiring and follows Firebase's `FIRESTORE_EMULATOR_HOST` naming. Rejected: a new module wrapper (an extra layer, and every legacy caller imports `db` from `@/lib/firebase`).
- Start the emulator as the first Playwright `webServer` entry, `npx firebase emulators:start --only firestore --project demo-corner-conquest`, and keep `test:e2e` as `playwright test`. Playwright starts and stops it, and arguments such as a spec path still reach Playwright. Rejected: triage's `firebase emulators:exec "playwright test"` in `test:e2e`, because `npm run test:e2e -- e2e/x.spec.ts` would pass the spec path to `firebase`, not to Playwright, and break the documented one-spec form and the `npx playwright test *` allowlist.
- Use project ID `demo-corner-conquest`. Because of the `demo-` prefix, the emulator never touches real Firebase resources and no login is needed. Rejected: changing `.firebaserc` (that would break real `firebase` CLI use).
- The second `webServer` runs `npm run build && npm run start` with `NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST` and `NEXT_PUBLIC_FIREBASE_PROJECT_ID` in `env`, because `NEXT_PUBLIC_*` values are inlined at build time. It uses `reuseExistingServer: false`, so a server already on :3000 (which might talk to the real project) causes an error instead of being reused. Rejected: `next dev` (pages compile on first request, which risks the 30 s test timeout). Rejected: a separate `distDir` (more config; App Hosting builds in the cloud, so the local `.next` doesn't matter).
- Remove `PLAYWRIGHT_TEST_BASE_URL`: tests must hit the server Playwright starts with the emulator env. Nothing else references it (`grep` found only `playwright.config.ts:10`).
- `firebase.json` holds only `firestore.rules` and the emulator host, port and UI settings (UI off: no extra download, nobody uses it). Rejected: also configuring the Auth emulator (the app doesn't use Firebase Auth, see triage).
- New devDependency `firebase-tools@^15.32.1`. Reason: it is the only supported way to run the Firestore emulator. Pinning it in `package.json` keeps runs reproducible. Rejected: an unpinned `npx firebase-tools` download per run.
- `e2e/e2e-cleanup.ts` is not changed: each emulator start begins with an empty database, and the cleanup also closes dialogs. Rejected: an emulator REST wipe between tests (the current specs don't need it).
- `"test:all"` (`package.json:15`) is unchanged and inherits the new behavior.

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `package.json`, `package-lock.json` | edit | Add devDependency `firebase-tools` (via `npm install`) | implementer-a |
| `firebase.json` | new | Firestore emulator config and rules path | implementer-a |
| `src/lib/firebase.ts` | edit (legacy wiring) | Connect `db` to the emulator when the env var is set | implementer-a |
| `playwright.config.ts` | edit | Start the emulator and an emulator-wired app server; fixed base URL | implementer-a |
| `CLAUDE.md` | edit (line 30) | Commands table: e2e row | implementer-b |
| `.claude/skills/testing/SKILL.md` | edit (lines 48-49) | E2E section: emulator instead of the real project | implementer-b |
| `.claude/skills/ui-verify/SKILL.md` | edit (line 37) | E2E sentence: no Firebase config needed | implementer-b |
| `docs/README.md` | edit (§6.11, after line 414) | Bullet that documents the emulator | implementer-b |
| `src/lib/__tests__/firebase.test.ts` | new | Unit tests for the emulator switch | tester-a |
| (no file) | run | Full e2e suite against the emulator | tester-b |

## Contracts
```ts
// ---------- firebase.json (new, exact content) ----------
// {
//   "firestore": { "rules": "firestore.rules" },
//   "emulators": {
//     "firestore": { "host": "127.0.0.1", "port": 8080 },
//     "ui": { "enabled": false },
//     "singleProjectMode": true
//   }
// }

// ---------- src/lib/firebase.ts (edit) ----------
// 1. Add `connectFirestoreEmulator,` to the existing `from 'firebase/firestore'` import list (after `arrayUnion,`).
// 2. Insert directly after line 31 `const db = getFirestore(app);`:
// Set by playwright.config.ts so e2e runs use the local emulator, never the real project.
const firestoreEmulatorHost = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST; // "host:port"
if (firestoreEmulatorHost) {
  const [host, port] = firestoreEmulatorHost.split(':');
  connectFirestoreEmulator(db, host, Number(port));
}
// The export list is unchanged. Do not export connectFirestoreEmulator.

// ---------- playwright.config.ts (edit) ----------
// Above `export default defineConfig(`:
/** Must match `emulators.firestore` in firebase.json. */
const FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
/** The `demo-` prefix keeps the emulator from ever touching a real Firebase project. */
const EMULATOR_PROJECT_ID = 'demo-corner-conquest';
const APP_URL = 'http://localhost:3000';
// In `use`: baseURL: APP_URL,   (replaces the PLAYWRIGHT_TEST_BASE_URL line)
// Replace the whole `webServer: { ... }` object with:
webServer: [
  {
    command: `npx firebase emulators:start --only firestore --project ${EMULATOR_PROJECT_ID}`,
    url: `http://${FIRESTORE_EMULATOR_HOST}`,
    reuseExistingServer: true, // anything on 8080 is a local emulator, never the real project
    timeout: 120000, // the first run downloads the emulator jar
    gracefulShutdown: { signal: 'SIGTERM', timeout: 10000 },
  },
  {
    // NEXT_PUBLIC_* values are inlined at build time, so the build must see the emulator env.
    command: 'npm run build && npm run start',
    url: APP_URL,
    reuseExistingServer: false, // never reuse a server that may talk to the real project
    timeout: 300000,
    env: {
      NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST: FIRESTORE_EMULATOR_HOST,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: EMULATOR_PROJECT_ID,
    },
  },
],
// Every other key of playwright.config.ts stays as it is (comments included).
```

## Phases
### Phase 1: Firestore emulator for e2e
1. Run `npm install --save-dev firebase-tools@^15.32.1` in `/home/user/corner-conquest`. Confirm `node_modules/.bin/firebase` exists and `npx firebase --version` prints 15.x. (implementer-a)
2. Create `/home/user/corner-conquest/firebase.json` with the exact JSON from Contracts. (implementer-a)
3. Edit `/home/user/corner-conquest/src/lib/firebase.ts` exactly as in Contracts (import plus the 5-line block after line 31). Change nothing else. (implementer-a)
4. Edit `/home/user/corner-conquest/playwright.config.ts` as in Contracts. (implementer-a)
5. Smoke-check the emulator: run `npx firebase emulators:exec --only firestore --project demo-corner-conquest "curl -s http://127.0.0.1:8080"` and confirm it prints `Ok` and exits 0. If the jar download fails behind the proxy, read `/root/.ccr/README.md` and report BLOCKER with the error. (implementer-a)
6. Run `npm run typecheck` and `npm run lint` and quote their summary lines. (implementer-a)
7. `CLAUDE.md:30`: replace the row with
   `| E2E (starts the Firestore emulator and a production build on :3000; needs Java 21) | `npm run test:e2e`, one spec: `npm run test:e2e -- e2e/<spec>.spec.ts` |` (implementer-b)
8. `.claude/skills/testing/SKILL.md:48-49`: replace these two bullets with:
   - `- Runs against the local Firestore emulator (project `demo-corner-conquest`, `firebase.json`), never the real project. No `.env.local` is needed; Java 21 is. If the emulator can't start, report "e2e not run: <error>" and verify through the testbed (skill `ui-verify`).`
   - `- `playwright.config.ts` starts the emulator on 127.0.0.1:8080, then `npm run build && npm run start` on port 3000 with `NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST` set, and stops both at the end. Port 3000 must be free: Playwright never reuses a server it didn't start there.`
   (implementer-b)
9. `.claude/skills/ui-verify/SKILL.md:37`: replace the line with
   `E2E: `npm run test:e2e -- e2e/<spec>.spec.ts` (runs against the local Firestore emulator; no Firebase config needed). If it can't run, report "e2e not run: <reason>", never "passed". Details in skill `testing`.` (implementer-b)
10. `docs/README.md` §6.11: insert as the first bullet, directly under the heading on line 415:
   `- **Firestore Emulator**: E2E runs never touch the real project. `playwright.config.ts` starts the Firestore emulator (`firebase.json`, project `demo-corner-conquest`) and builds the app with `NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST`, which makes `src/lib/firebase.ts` call `connectFirestoreEmulator`. Each run starts with an empty database.` (implementer-b)
11. Write `src/lib/__tests__/firebase.test.ts` (cases in Test plan). Run `npx jest src/lib/__tests__/firebase.test.ts`, then `npm test`, and quote the summary lines. (tester-a)
12. Make sure port 3000 is free, run `npm run test:e2e`, and quote the summary line. While the suite runs or right after, confirm that the emulator received writes, e.g. the `[WebServer]` log or `firestore-debug.log` exists. Report each failing spec with its error; don't edit the specs. (tester-b)

Model escalation: step 12 (tester-b) on sonnet, because e2e failures across two servers need diagnosis. Step 5 on sonnet only if the emulator download fails.

## Test plan
- tester-a: `src/lib/__tests__/firebase.test.ts`
  - Mocks: `jest.mock('firebase/app', () => ({ initializeApp: jest.fn(() => ({})), getApps: jest.fn(() => []), getApp: jest.fn() }))` and `jest.mock('firebase/firestore', () => ({ getFirestore: jest.fn(() => mockDb), connectFirestoreEmulator: jest.fn() }))`, where `const mockDb = { id: 'db' }` (the `mock` prefix lets the jest.mock factory use it).
  - Load the module fresh in each test with `jest.isolateModules(() => { require('@/lib/firebase'); })`. Save `process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST` and restore it in `afterEach`. Call `jest.clearAllMocks()` in `beforeEach`.
  - Case 1: env `'127.0.0.1:8080'` → `connectFirestoreEmulator` is called once with `(mockDb, '127.0.0.1', 8080)` (port as a number).
  - Case 2: env deleted → `connectFirestoreEmulator` is not called.
  - Case 3: env `'localhost:9099'` → called with `(mockDb, 'localhost', 9099)`.
- tester-b: the full existing suite (`auth-and-lobby`, `gameplay`, `map-viewport`, `tutorial-beacons`) through `npm run test:e2e` against the emulator. No new spec: the change is the harness, and every spec already exercises Firestore (username claim, match creation).

## Preview states
- None (no UI change).

## Risks
- Downloading the emulator jar behind the agent proxy is unverified (`storage.googleapis.com` answered through the proxy with HTTP 404 for the bare directory, so the host is reachable). Mitigation: step 5 finds this early, and the failure is reported as BLOCKER.
- Each e2e run rebuilds `.next` with emulator settings, so a later local `npm run start` would also talk to the emulator. Mitigation: documented in the testing skill (step 8). Production deploys build in App Hosting and are not affected.
- `connectFirestoreEmulator` throws if called after Firestore was used (for example on HMR re-evaluation). The variable is only set for e2e production builds, never under `next dev`, so this doesn't occur.
- `next start` with `output: 'standalone'` (`next.config.ts:5`) prints a warning today. The behavior is unchanged and out of scope.

## Review (architect-b)
VERDICT: <APPROVED | CHANGES REQUESTED>
- <findings, each with evidence>
