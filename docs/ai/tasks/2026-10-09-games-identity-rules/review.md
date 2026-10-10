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

# Final review: Firestore identity enforcement for games/{gameId}, phase 2/2

VERDICT: APPROVED

## Checks run
- `npm run typecheck`: clean, no errors.
- `npm run lint`: `eslint . --max-warnings 0 --no-error-on-unmatched-pattern`, clean, no warnings or errors.
- `npm test`: `Test Suites: 2 failed, 182 passed, 184 total` / `Tests: 2105 passed, 2105 total`. The 2 failing suites (`.agents/skills/caveman-learn/tests/skill-file.test.mjs`, `.agents/skills/caveman-explore/tests/skill-file.test.mjs`) fail with "Your test suite must contain at least one test" — pre-existing, outside `src/`/`firestore.rules.test.ts`, same two failures already noted in the phase 1 review, unrelated to this phase.
- `npm run test:rules` (runs `firestore.rules.test.ts` against the Firestore emulator via `firebase emulators:exec`): **not run** — this environment has no Java runtime (`java -version` → "Unable to locate a Java Runtime"), and `test:rules`/`test:e2e` both require it. Verified the rules change and the rewritten test file by static reading instead: `firestore.rules`'s diff matches plan.md's Contracts block (`plan.md:144-163`) verbatim (`isGameParticipant` helper, `create`/`update`/`delete` on `games/{gameId}`), and `firestore.rules.test.ts`'s new `Create`/`Update`/`Delete` describe blocks cover every case listed in plan.md's Test plan (`plan.md:200-205`). Flag for the user: run `npm run test:rules` and `npm run test:e2e -- e2e/auth-and-lobby.spec.ts` on a machine with Java 21 before merging/deploying — this is the step plan.md Phase 2 step 4 requires and it has not been executed in this session.
- ui-verify: not applicable — plan.md's Preview states section states no `.tsx`/view-layer files are touched in this task; confirmed no view file appears in this phase's diff (`firestore.rules`, `firestore.rules.test.ts`, `docs/architecture/structure-and-state.md` only).

## Plan adherence
- `firestore.rules:48-91` — `isGameParticipant(players)` added exactly as specified (`plan.md:144-153`); `create` requires `isGameParticipant(request.resource.data.players)`; `update` requires the non-empty-players structural check plus participancy of either the stored or incoming players (covers the `joinOpenGame` case per Decisions, `plan.md:38`); `delete` requires `isGameParticipant(resource.data.players)`. Matches the Contracts block verbatim, including the comments explaining the 4-seat bound (`PlayerColor` has exactly 4 members) and the join-case rationale.
- `firestore.rules.test.ts` — rewritten `Create` describe block covers allowed (creator at `players[0]`), allowed-minimal, rejected-unauthenticated, rejected-wrong-uid (plan.md:201). `Update` covers allowed-stored-participant, allowed bot-turn write by a seated human, allowed `updateDoc` for death animations, rejected-unauthenticated, rejected-wrong-uid, the join case (uid in incoming but not stored players), and the pre-existing structural-corruption rejections re-pointed to an authenticated participant (plan.md:202-203). New `Delete` describe block (none existed before) covers allowed-stored-participant, rejected-unauthenticated, rejected-wrong-uid (plan.md:204). The `read` test and the `Integration` lifecycle test were re-pointed to `seedWithRulesDisabled`/an authenticated creator context respectively, consistent with the new rule, without weakening either assertion (plan.md:205). The pre-existing `seedWithRulesDisabled` helper (`firestore.rules.test.ts:27`) is reused, not duplicated.
- `docs/architecture/structure-and-state.md` — one line added after the `GameState` bullet (§3.2) documenting the write-access rule in prose (`request.auth.uid` must equal one seat's `playerId`, `create`/`update`/`delete` semantics, the game-rule reducers still own move legality). §3.1's guest-identity bullets were already updated in the phase 1 commit (confirmed via `git show HEAD:docs/architecture/structure-and-state.md` showing the Anonymous-Auth wording already present before this phase's diff); this phase's diff is additive only, matching the File plan's narrower scope for Phase 2 (`plan.md:53`).
- Acceptance criteria (plan.md Goal): criterion 2 (rule requires `request.auth.uid` to be a participant, including the join case) — met, by the rules diff. Criterion 3 (`firestore.rules.test.ts` covers allowed/rejected create/update/delete plus the join case) — met, by the test diff, modulo the emulator run not being executable in this environment (see Checks run). Criteria 4-5 (usernames/accounts rules unchanged, no regression in guest/account flows) — `git diff firestore.rules` shows no change outside the `games/{gameId}` block; no regression evidence beyond phase 1's own review, which is out of this phase's scope.
- Grep for the rule's old unconditional wording (`allow create;` / `allow delete;`) across `firestore.rules` finds none remaining — both tightened as planned.

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|

No findings.

## Docs
- `docs-sync`: ran — `docs/architecture/structure-and-state.md` updated with the write-access note next to §3.2's `GameState` bullet, per File plan (`plan.md:53`). §3.1's guest-identity wording was already current from phase 1.
