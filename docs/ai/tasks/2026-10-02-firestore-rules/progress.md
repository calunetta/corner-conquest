# Progress: Harden firestore.rules

Tier: S · Phases: 1

## Phase 1: Harden firestore.rules
- [x] implementation (implementer-a)
- [x] tests (tester-a = implementer-a, tier S combines these; 19 rules tests)
- [x] checks: typecheck, lint, unit tests, rules tests
- [x] coordinator review (no architect-b at this tier; see below)
- [x] committed: (this commit)

## Log
- 2026-10-02 implementer-a: DONE, firestore.rules rewritten, 19 rules-unit-testing cases, @firebase/rules-unit-testing added
- 2026-10-02 coordinator: found implementer-a's `npm install @firebase/rules-unit-testing@^3.0.4` installed a version whose peer dependency is `firebase@^12.0.0`, conflicting with this repo's `firebase@^11.9.1`. Running concurrently with other agents' npm installs (emulator and simulator tasks), this corrupted node_modules: `@testing-library/dom` disappeared from package-lock.json, breaking every Jest suite and typecheck across the whole repo. Fixed: pinned `@firebase/rules-unit-testing@^4.0.1` (peer `firebase@^11.0.0`, matches), reinstalled clean. Also found `firestore.rules.test.ts` had no jest.config.js exclusion, so plain `npm test` tried to run it under jsdom with no emulator and failed 19 tests; added it to `testPathIgnorePatterns` and a self-contained `npm run test:rules` script (starts and stops its own emulator via `firebase emulators:exec`). All four checks (typecheck, lint, npm test, npm run test:rules) pass after the fix. See "Known limitation" below before treating this as done.

## Review (coordinator, no architect-b at tier S)
VERDICT: APPROVED, with a known limitation recorded below rather than silently claimed as fixed.

**What actually improved:**
- `usernames/{username}`: an existing reservation's `playerId` can no longer be overwritten by a different player (`resource.data.playerId == request.resource.data.playerId` on update). This closes the literal hole in the original rule (`allow read, write` to everyone) for the one place this app can meaningfully enforce ownership without Firebase Auth: a username doc's own stored `playerId` field is the source of truth, and the rule compares the proposed write against what's already stored.
- `games/{gameId}`: writes are now structurally validated (`players` must stay a non-empty list), which blocks accidental or malicious corruption of the document shape.

**Known limitation (by design, matches triage's explicit scope):**
This app has no Firebase Authentication — `playerId` is a client-generated string in `localStorage`, never verified server-side. Firestore rules can only inspect the document *content* a request claims to write, which the client fully controls. That means:
- For `usernames`, ownership-by-content works because the *existing* document already anchors the real owner's `playerId`, and the rule only lets a write through if it preserves that value — an attacker cannot change whose `playerId` a username points to.
- For `games`, there is no equivalent anchor: any client can still read and overwrite any game's full state, exactly as before, as long as the new document keeps a non-empty `players` array. **This is not fixed by this change** and cannot be fixed by rules alone — it needs Firebase Auth binding a request to a real identity, which triage explicitly scoped out as a much larger change.
- Practical exposure: a player (or anyone) could still script a direct Firestore write to grief another game in progress. This is a pre-existing risk, narrowed (structural corruption is blocked) but not closed.
- Recommended follow-up, not done here: add Firebase Anonymous Auth, include `request.auth.uid` in each player's record at game creation, and require `games/{gameId}` writes to come from a `uid` already present in `players`.

## Checks (after the coordinator's fix)
- `npm run typecheck` → no errors
- `npm run lint` → no problems
- `npm test` → `Test Suites: 15 passed, 15 total`, `Tests: 57 passed, 57 total`
- `npm run test:rules` → `Test Suites: 1 passed, 1 total`, `Tests: 19 passed, 19 total`
