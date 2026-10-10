# Final review: Firestore identity enforcement for games/{gameId}, phase 1/2

VERDICT: APPROVED

## Checks run
- `npm run typecheck`: clean, no errors.
- `npm run lint`: `eslint . --max-warnings 0 --no-error-on-unmatched-pattern`, clean, no warnings or errors.
- `npx jest src/modules/session`: `Test Suites: 12 passed, 12 total` / `Tests: 167 passed, 167 total`.
- `npm test` (full suite): `Test Suites: 2 failed, 182 passed, 184 total` / `Tests: 2105 passed, 2105 total`. The 2 failed suites (`.agents/skills/caveman-learn/tests/skill-file.test.mjs` and one other `.agents/skills/*` file) fail with "Your test suite must contain at least one test" — pre-existing, outside `src/`, unrelated to this phase's files.
- ui-verify: not applicable — Preview states section of plan.md states no `.tsx`/view-layer files are touched in this phase (anonymous sign-in is invisible to the player); confirmed no view file appears in the diff.

## Plan adherence
Scope for this phase is `src/lib/firebase.ts`, `src/modules/session/services/account.service.ts`, `src/modules/session/guest-session.ts`, `src/modules/session/player.hook.ts`, `src/modules/session/player.types.ts`, and their tests (`account.service.test.ts`, `player.hook.test.ts`). `git diff --stat` for these confirms exactly those 7 files changed in this phase, nothing extra.

- `src/lib/firebase.ts:24,64` — `signInAnonymously` imported from `firebase/auth` and re-exported, matching File plan row 1.
- `src/modules/session/services/account.service.ts:9,15-19,36-39` — `AuthAccount.isAnonymous` added, `toAuthAccount` maps it, `signInAnonymously()` imports the Firebase function aliased `signInAnonymouslyWithFirebase`, resolving the naming-collision finding from the plan's first review round. Matches the Contracts block verbatim.
- `src/modules/session/guest-session.ts` — `createPlayerId`/`readOrCreateGuestPlayerId` deleted, `releaseGuestReservation` kept unchanged. Grep across `src/` and `docs/` for `readOrCreateGuestPlayerId`, `createPlayerId`, `guestPlayerId` finds no surviving production reference — only historical doc mentions in other tasks' plan/review files and this task's own plan.md.
- `src/modules/session/player.hook.ts:20-21,48-78,85-171` — identity derivation (`playerId`, `isGuest`), the auth listener's `null` → `signInAnonymously()` branch, `validateSession`/`restoreAccountUsername` gating on `isAnonymous`, `logout`, `signInWithGoogle`, `setUsernameCallback`, and the `beforeunload` handler all match the Contracts behavior block point for point, including the three identity-transition cases named in the Decisions section (fresh visit, returning guest restored by Firebase itself, Google sign-out re-triggering anonymous sign-in).
- `src/modules/session/player.types.ts:4` — `isGuest` JSDoc updated to "True for a guest's anonymous Firebase session; false for a Google account", resolving the plan's second review-round finding. `PlayerContextType` shape unchanged, as required.
- Tests: `account.service.test.ts` covers `signInAnonymously` (resolves with `isAnonymous: true`, rejects on failure, touches no Firestore) and updates both `toEqual` assertions for `signInWithGoogle` to include `isAnonymous`, per the Test plan. `player.hook.test.ts` covers fresh-visit sign-in, returning-guest (no sign-in call), `validateSession`/`setUsername`/`logout`/`beforeunload` re-pointed to the anonymous uid, Google sign-in releasing a guest reservation, and Google sign-out re-establishing a new guest session (`uid_guest_2`) — all cases the Test plan lists are present.

No acceptance criterion from plan.md's Goal section is scoped to this phase alone except the guest-identity half of criterion 1 ("guests get one via Anonymous Auth, not a client-generated localStorage id") — met.

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|

No findings.

## Docs
- `docs-sync`: not run in this phase — correctly deferred. `structure-and-state.md` §3.1 is on the File plan for Phase 2, not Phase 1.
