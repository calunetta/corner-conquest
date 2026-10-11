# Final review: Link Google account from guest, phase 1/2

VERDICT: APPROVED

## Checks run
- `npm run typecheck`: clean, no output (exit via `tsc --noEmit`).
- `npx eslint` on all 7 touched files: `src/lib/firebase.ts` reported only "ignored because of a matching ignore pattern" (expected — `src/lib/**` is a `LEGACY_PATHS` exemption per `component-architecture`); the other 6 files reported zero errors/warnings.
- `npx jest src/modules/session/services/account.service.test.ts src/modules/session/player.hook.test.ts src/modules/session/player.provider.test.tsx`: `Test Suites: 6 passed, 6 total`, `Tests: 173 passed, 173 total`.
- Confirmed the pre-existing, unrelated failure independently: `git stash -u` to unmodified `main`, ran `npx jest src/modules/session/components/Login` → `Test Suites: 2 failed, 4 passed, 6 total`, `Tests: 31 failed, 79 passed, 110 total` (same `next/image` + jsdom `useContext` crash), then `git stash pop` to restore. Confirmed not caused by this phase; it is Phase 2's problem (`Login.tsx` is a Phase 2 file).
- ui-verify: not applicable — Phase 1 has no UI.

## Plan adherence
- File plan (Phase 1, plan.md:56-64): all 7 rows present and match — `firebase.ts` (import+export `linkWithPopup` only, no other change), `account.service.ts` (`linkGoogleAccount`), `account.service.test.ts`, `player.types.ts` (`linkWithGoogle`), `player.hook.ts` (`linkWithGoogle` callback), `player.hook.test.ts`, `player.provider.test.tsx` (3 literals). No file outside this list was touched for Phase 1 content; grep for `linkWithGoogle|linkGoogleAccount|linkWithPopup|bindUsernameToAccount` across `src/` returns only these 7 files, as expected for a pure addition.
- Contracts (plan.md:99-144) matched verbatim:
  - `account.service.ts:41-47` — guard `if (!auth.currentUser) throw new Error('No active session to link.')`, then `linkWithPopup(auth.currentUser, new GoogleAuthProvider())`, mapped via the existing `toAuthAccount`. Matches contract exactly.
  - `player.types.ts:10-16` — `linkWithGoogle: () => Promise<void>` with the specified doc comment, unchanged wording.
  - `player.hook.ts:114-122` — bind-before-popup ordering implemented exactly as specified: `if (username && playerId) await bindUsernameToAccount(username, playerId); await linkGoogleAccountOnFirebase();`. This is the load-bearing decision in the plan (race with `onAuthStateChanged` firing inside `linkWithPopup`'s awaited chain) and it's correct.
  - `player.hook.ts:185` — returned object gains `linkWithGoogle` alongside existing fields, nothing dropped.
- Decisions (plan.md:47-48) honored: bind runs unconditionally before the popup, not gated on link success; skipped only when `username` or `playerId` is null (tested).
- Test plan (plan.md:253) covered: `account.service.test.ts` — popup call shape with `auth.currentUser`/`GoogleAuthProvider` instance, success mapping to `{uid, displayName, isAnonymous}`, no-`currentUser` guard, `credential-already-in-use` and `popup-closed-by-user` rejections propagate untouched, no Firestore I/O. `player.hook.test.ts` — bind-before-link order assertion via a shared `order` array, skip-when-no-username, skip-when-no-playerId (via `deferInitialAuthReport`), rejection propagation from both `linkGoogleAccount` (credential-already-in-use) and `bindUsernameToAccount` (with the correct additional assertion that `linkGoogleAccount` is *not* called in that case — stronger than what the plan's "propagates every error" line strictly required, and correct given the bind-first ordering). `player.provider.test.tsx` — all three `PlayerContextType` literals updated.
- Phase 1 has no UI acceptance criteria of its own (those are scoped to Phase 2 in plan.md:9-17); nothing to verify in a browser this phase.

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| — | — | None found. | — | — |

## Docs
- `docs-sync`: not needed this phase — the `structure-and-state.md` §3.1 update is explicitly scheduled for Phase 2 (plan.md:95, plan.md:243), after the full linking flow including the UI is wired up.

# Final review: Link Google account from guest, phase 2/2

VERDICT: APPROVED

## Checks run
- `npm run typecheck`: clean, no output.
- `npx eslint` on every touched/new file in Phase 2 (`GoogleIcon`, `LinkGoogleAccountButton`, `Login.tsx`/`.styles.ts`/`.test.tsx`, `src/modules/session/index.ts`, `Lobby.types/.hook/.fixtures/.tsx/.styles/.test/.preview.ts(x)`, `src/testbed/registry.ts`, `firestore.rules.test.ts`): zero errors/warnings.
- `npm test -- src/modules/session src/modules/lobby --testPathIgnorePatterns='/\.claude/'`: `Test Suites: 29 passed, 29 total`, `Tests: 394 passed, 394 total`.
- `npm run build`: compiles successfully, generates all 6 static pages, no type or lint errors.
- Firestore rules, re-run independently against the real emulator (installed Java 21 at `/opt/homebrew/opt/openjdk@21`, not on `PATH` by default in this shell): `npx firebase emulators:exec --only firestore --project demo-corner-conquest "npx jest --config jest.rules.config.js --testPathIgnorePatterns /node_modules/ /.claude/"` → `Test Suites: 1 passed, 1 total`, `Tests: 54 passed, 54 total`.
- ui-verify: not re-run by me; relying on preview-b's confirmed pass per the coordinator's context (Google icon renders as a real four-color G, all 4 `LinkGoogleAccountButton` states correct, no mobile overflow, 44×44 touch target, visible focus rings on Tab for all 3 relevant buttons, all routes 200 after the `'use client'` fix). Read the fixed file myself: `src/modules/session/components/LinkGoogleAccountButton/LinkGoogleAccountButton.hook.ts:1` has `'use client';` as its first line.

## Plan adherence
- `firestore.rules` diff matches Contracts (`plan.md:114-138`) verbatim — same OR'd clause, same comments, same field checks. `firestore.rules.test.ts` flips the one specified test and adds the two specified new tests (`:176-196`, `:308-343` in the new file), plus an extra pair of batch-level tests in a new `describe` block — all additive, nothing in the existing suite changed in a way that would flip an unintended case. 54/54 against the real emulator confirms this, not just a hand-trace.
- `GoogleIcon.tsx`: contract's `viewBox="0 0 18 18"` placeholder was explicitly flagged in Contracts as unverified ("implementer-b must source the real official Google G path data... rather than inventing coordinates"). Implementer-b instead copied real path data + its native `viewBox="0 0 48 48"` from `react-icons`' `FcGoogle`, with a code comment naming the exact source (npm package, version, file). This is the correct resolution of that flagged risk, not a deviation — `className`-driven Tailwind sizing (`h-4 w-4` / `h-5 w-5`) overrides the hardcoded `width`/`height` attributes via CSS specificity, confirmed by preview-b's screenshot of the icon at the intended size.
- `LinkGoogleAccountButton.types.ts`, `.hook.ts`, `.tsx`, `.styles.ts`: match Contracts (`plan.md:231-271`) field-for-field — `LinkGoogleAccountButtonErrorDialog`/`ViewProps` shapes, the `isCredentialAlreadyInUse`/`isCancelledPopup` error-code helpers reading `(error as {code?:string})?.code` without importing a Firebase type, the exact dialog copy, `onLink`'s try/catch/finally shape, two sibling `Button`s (`hidden sm:inline-flex` / `sm:hidden`) sharing `onClick`/`disabled`, one shared `AlertDialog`.
- `Login.tsx`/`.styles.ts`, `Lobby.types/.hook/.tsx/.styles.ts`, `src/modules/session/index.ts`: match Contracts exactly (`plan.md:283-301`) — `isGuest`/`linkGoogleAccountButton` added to `LobbyViewModel`, destructured and forwarded in `Lobby.hook.ts`, rendered conditionally between `playerInfo` and `Logout` in `Lobby.tsx`, `flex-wrap justify-end` added to `headerRight`.
- Test coverage matches the Test plan (`plan.md:338-350`): hook tests cover all 3 outcomes (cancelled-silent, already-in-use dialog, generic-failure dialog) plus loading toggling and re-linkability after dismissal; view tests assert both buttons present/enabled/disabled, click wiring, dialog content, and `Lobby.test.tsx` asserts guest-present / non-guest-absent by role and accessible name, not by CSS visibility.
- Preview states match the Preview-states section (`plan.md:352-355`): `GoogleIcon` Default; `LinkGoogleAccountButton` Idle/Linking/Error-Already-Linked/Error-Generic (the preview also adds a "Reopen dialog" button so the dialog can be re-triggered interactively — a reasonable testbed-only affordance, not in the original 4-state list but doesn't replace or hide any of them); `Lobby` gains "Guest (can link)".
- `src/testbed/registry.ts`: both new previews imported and registered, matching the File plan row.
- Phase 1's already-approved `player.hook.ts` linking logic (`:114-122`) is unchanged this phase; `player.hook.test.ts`'s edit in this diff only strengthens the existing "skips the bind when there is no playerId yet" test to actually reach that state via the real auth-listener/localStorage path instead of relying on an unobserved `renderHook` + no `settle()`, which is a correctness improvement to an existing test, not new scope creep — no new assertion about a *different* behavior.

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| — | — | None (see Resolution below — the one blocking finding from the first pass was fixed and re-verified). | — | — |

## Docs
- `docs-sync`: ran, updated `structure-and-state.md` §3.1 (bullet 5's sign-in note + the new "Linking a guest to Google" subsection). The subsection now includes the previously-missing bullet at `structure-and-state.md:100`: "`firestore.rules` allows one guest-to-account update of `usernames/{username}`: while the doc has no `authUid`, the caller may set `authUid` to their own `uid` (which must equal the doc's `playerId`), provided `accounts/{uid}` does not exist yet. This is distinct from the 'permanent once account-owned' rule. After `authUid` is set, the reservation can no longer be updated or deleted." Checked verbatim against the live rule (`firestore.rules:38-45`, the "New: linking" clause): no existing `authUid` ✓, caller's own uid equals `playerId` ✓, `accounts/{uid}` must not exist ✓, "distinct from permanent once account-owned" correctly describes the separate first OR-clause / `allow update`'s immutability once `authUid` is non-null ✓. Accurate, no further gap.

## Resolution
Finding #1 from the first pass (missing mention of the `firestore.rules` loosening) is fixed at `structure-and-state.md:100` and verified accurate against `firestore.rules:38-45` in this follow-up pass. No other findings. Phase 2 is APPROVED: implementation, tests (394/394 unit + 54/54 rules against the real emulator), previews, docs-sync, checks (typecheck/lint/test/build all clean), and UI verification (preview-b's confirmed pass, per the coordinator) are all complete and correct.
