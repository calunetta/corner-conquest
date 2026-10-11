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
