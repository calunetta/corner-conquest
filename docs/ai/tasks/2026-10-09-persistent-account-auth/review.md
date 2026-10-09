# Final review: Persistent account system (Google sign-in), phase 1

VERDICT: APPROVED

## Checks run
- `npm run typecheck`: pass, no errors (`tsc --noEmit`, clean output).
- `npm run lint`: pass, no errors (`eslint . --max-warnings 0 --no-error-on-unmatched-pattern`, clean output).
- `npm run test:rules`: not run — no Java 21 runtime in this environment (`java -version` → "Unable to locate a Java Runtime"; `/usr/bin/java` is a stub). Verified the rules logic by hand instead (see Plan adherence below); the full test suite in `firestore.rules.test.ts` was traced case by case against `firestore.rules`.
- `npm test`: not required for Phase 1 (no `.ts`/`.tsx` app code changed, only config + rules + rules test).
- ui-verify: not applicable, no UI in this phase.

## Plan adherence
Diffed against `plan.md`'s Contracts section (lines 101-171) and File plan (lines 52-56).

- `src/lib/firebase.ts`: matches the contract exactly — `getAuth`, `GoogleAuthProvider`, `signInWithPopup`, `signOut`, `onAuthStateChanged`, `connectAuthEmulator` added, `auth` export added, emulator wiring mirrors the existing Firestore block (`src/lib/firebase.ts:49-55`).
- `firebase.json`: `auth` emulator block added at `127.0.0.1:9099`, matches the contract verbatim.
- `playwright.config.ts`: `AUTH_EMULATOR_HOST` constant, `--only firestore,auth`, `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST` env var added to `webServer[1]` — matches contract.
- `firestore.rules`: matches the contract's intent with one accepted deviation, called out in the task context and confirmed sound by tracing: the update and delete rules use `resource.data.get('authUid', null) == null` / `request.resource.data.get('authUid', null) == null` instead of a plain `== null` comparison. Traced why this is necessary and correct: a plain `resource.data.authUid` read on a pre-existing guest doc that predates the `authUid` field (no such field written) errors during rule evaluation and denies the write — `firestore.rules.test.ts:202-209` and `:230-238` (legacy update/delete) would fail without `get()`'s default. `request.resource.data.get(...)` needs the same treatment for the same reason on the merged post-write document. The `create` rule correctly keeps the plain `request.resource.data.authUid == null` form (no `get()`) because every new write is required to carry the field explicitly by the "always explicit" decision (`plan.md:38`) — a create that omits it is correctly rejected (`firestore.rules.test.ts:71-79`), which is the intended behavior, not a bug.
- `accounts/{authUid}` collection: matches the contract verbatim (`allow create` scoped to the owning uid with `username is string`; `allow update`/`allow delete` both `false`).
- `firestore.rules.test.ts`: covers every case in the Test plan's Phase 1 bullet (`plan.md:348`) — guest create/update/delete unaffected, permanent-binding create with/without a prior `accounts` doc, update/delete always rejected for permanent bindings, `accounts` create only by the owning uid, `accounts` update/delete always rejected, plus extra coverage for the atomic `bindUsernameToAccount` batch and the legacy-doc edge cases.

Traced the rules by hand against every test in the diff (not executed, no Java 21):

- **Create (`usernames`)**: `playerId is string` required; `authUid == null` (guest) or `authUid is string && request.auth.uid == authUid && !exists(accounts/{uid})` (account, "pick once"). Confirmed each of the 7 create-path tests resolves correctly, including the numeric-`playerId` rejection and the no-`authUid`-field rejection (a missing key on a **create** write is intentionally rejected — every new doc must carry the field explicitly, per `plan.md:38`).
- **Update (`usernames`)**: both sides' `authUid` must resolve to `null` via `get(..., null)`, plus the existing same-`playerId` check. Confirmed: same-`playerId` guest update allowed; different-`playerId` guest update rejected; non-existent doc update rejected; promoting a guest doc to an account binding via update rejected (new `authUid` not null → `get()` returns non-null → denied); updating an existing permanent binding rejected even with an unchanged `playerId` (existing `authUid` not null → denied, by design — permanent bindings accept zero updates); legacy doc with no `authUid` field at all: `get()` returns the default `null` on both sides → allowed, matching today's guest behavior.
- **Delete (`usernames`)**: `get('authUid', null) == null`. Confirmed: guest delete allowed, legacy no-field doc delete allowed, permanent-binding delete rejected (verified the doc's data is unchanged after the rejected delete, matching the test's post-condition assertion).
- **`accounts`**: read unconditional; create scoped to `request.auth.uid == authUid` plus `username is string` (rejects no-field, non-string, and null `username`); update/delete unconditionally `false`.
- **Atomic bind batch**: traced that `writeBatch`'s two document writes are evaluated against the pre-commit snapshot, not against each other's in-flight state, so the `!exists(accounts/{uid})` check on the `usernames` write in a first-time bind correctly sees "no account yet" and succeeds; a second bind batch for an account that already has one fails on both the `accounts` document's `update: false` (since it already exists) and the `usernames` document's `!exists(...)` check, and because the batch is atomic, the whole thing is rejected and neither document's test assertion (`usernames/alice_second` absent) is violated. Binding a name a guest currently holds correctly routes through the `update` rule for that existing `usernames` doc (because the target doc already exists, Firestore evaluates the write as an update, not a create) and is rejected there since the new `authUid` isn't null, leaving the guest's reservation and no stray `accounts` doc behind.

All acceptance criteria relevant to Phase 1 (permanence enforced at the rules layer, guest path unchanged) are met by this diff; the remaining criteria (same `playerId`/username across sessions, scoped `logout`/`beforeunload`) are Phase 2/3 work, not yet in scope.

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| 1 | `firestore.rules.test.ts:198-201` | Comment above the legacy-update test says "REPRODUCTION (unverified ... Expected to fail until the rule reads it with `request.resource.data.get('authUid', null)`)" — but the rule in this same diff already reads it that way (`firestore.rules:25-27`), so the comment now describes a bug that is already fixed, not a pending reproduction. Misleading to a future reader who diffs this file without the full history. | tester-a | No — cosmetic, doesn't affect test correctness or the rule's behavior. |

No other findings. No invented paths or symbols in the diff.

## Docs
- `docs-sync`: not needed yet — this phase changes config and rules enforcement only; no documented game rule or architecture behavior changed (the `logout`/`beforeunload` behavior change that needs `structure-and-state.md` §3.1 is Phase 2). Scheduled correctly for Phase 4 per `plan.md:338-340`.

---

# Final review: Persistent account system (Google sign-in), phase 2

VERDICT: CHANGES REQUESTED

## Checks run
- `npm run typecheck` → clean (`tsc --noEmit`, no output).
- `npm run lint` → clean (`eslint . --max-warnings 0 --no-error-on-unmatched-pattern`, no output).
- `npx jest src/modules/session` → `Test Suites: 11 passed, 11 total`, `Tests: 144 passed, 144 total`.
- `npm test` (full suite, `--maxWorkers=2` after one run hit an unrelated jest-worker SIGSEGV) → `Test Suites: 2 failed, 181 passed, 183 total`, `Tests: 2051 passed, 2051 total`. The 2 failing suites are both `.agents/skills/caveman-explore/tests/*` ("must contain at least one test"), pre-existing and unrelated to this diff — matches the addendum's claim in `plan.md:81`.

## Plan adherence
Diffed every Phase 2 file against `plan.md`'s Contracts (lines 177-270) and File plan (lines 57-63):

- `src/modules/session/services/account.service.ts` (new): matches the contract's shape for `signInWithGoogle`, `signOutOfAccount`, `subscribeToAuthState`, `findAccountUsername`, `bindUsernameToAccount` exactly (`account.service.ts:24-58`). `claimAccountUsername` (`:64-76`) is an addition not named in the Contracts block, but it's a thin, well-scoped wrapper matching the behavior contract's prose for `setUsername(name)`'s account branch (`plan.md:261-263`: "check `findUsernameOwner`... bind... return") — reasonable to centralize in the service rather than duplicate the try/catch in the hook. No `firebase/*` import outside a `.service.ts` file; boundary respected.
- `src/modules/session/services/player-session.service.ts`: one-line `reserveUsername` change, `{ playerId, authUid: null }` exactly as `plan.md:220` specifies.
- `src/modules/session/player.types.ts`: `isGuest`, `isAuthLoading`, `signInWithGoogle` added to `PlayerContextType`, matching `plan.md:225-236` field-for-field (including the two doc comments, verbatim).
- `src/modules/session/player.hook.ts`: matches the behavior contract (`plan.md:238-270`) — guest-id init unchanged (`:17-24` vs. old `:10-20`), `subscribeToAuthState` callback sets account/username and `isAuthLoading` as specified (`:60-72`), `signInWithGoogle` returns true/false without touching state directly (`:98-106`, confirmed by `player.hook.test.ts:688-700`'s "auth listener is the source of truth" case), `setUsername`'s account branch calls `claimAccountUsername` and never touches `localStorage` (`:110-116`), `logout`'s account branch calls only `signOutOfAccount` (`:86-96`), `beforeunload` only releases when `account === null` (`:159-173`).
- `src/modules/session/player-session.service.test.ts`, `account.service.test.ts`, `player.hook.test.ts`: cover every case in the Test plan's Phase 2 bullets (`plan.md:354-356`) that I checked by reading the test bodies, including the "ignores a guest username in localStorage while an account is signed in" case (`player.hook.test.ts:467-477`) and the `beforeunload`-while-signed-in no-op (`player.hook.test.ts:638-654`).
- `src/modules/session/player.provider.test.tsx`: fixed per the addendum (`plan.md:79`) — all three mock `PlayerContextType` literals now carry `isGuest`, `isAuthLoading`, `signInWithGoogle`.
- `jest.setup.js`: the coordinator's addendum fix (`plan.md:81`) is present and matches the description — a `jest.mock('firebase/auth', ...)` block ahead of the existing `lucide-react` mock, covering every export `account.service.ts`/`src/lib/firebase.ts` need.

## Findings

### 1. Guest → account identity transition leaks the guest's username reservation — BLOCKING, owner implementer-a (+ tester-a for the regression test)

Traced the scenario: a guest reserves a name (`localStorage['playerId']`, `localStorage['username']`, and a Firestore `usernames/<name>` doc with `authUid: null`), then clicks "Sign in with Google" without logging out first.

- `signInWithGoogle` (`player.hook.ts:98-106`) only calls `signInWithGoogleAccount()`; it never reads or clears the guest's `localStorage` or Firestore reservation.
- The resulting `subscribeToAuthState` callback (`player.hook.ts:60-72`) sets `account`, wipes the *in-memory* `username` state, and looks up `findAccountUsername(uid)` — it never calls `releaseUsername` for the guest name, and never touches `localStorage['username']`.
- `setUsernameCallback`'s account branch (`:108-116`) binds the account's chosen name but still does nothing about the stale guest reservation sitting under the old `playerId`.

Two confirmed consequences, both present in the current code:
1. **Silent reappearance on sign-out.** If the account later signs out, `subscribeToAuthState`'s guest branch (`:66-69`) reads `localStorage.getItem('username')` — still the old guest name — and `validateSession` (`:35-50`) finds `findUsernameOwner(name) === guestPlayerId` (the reservation was never released) and restores it. A player who "left" their guest name behind by signing into an account gets it back unasked on the next sign-out, contradicting the "released on explicit logout" guest behavior `plan.md:9` (AC3) describes as otherwise unchanged.
2. **Permanent orphaned reservation.** If that account is never signed out of again (the common case, since persistence is the whole point of this feature), the `usernames/<name>` doc stays forever with `authUid: null`, owned by a `playerId` (a `localStorage`-generated guest id) nobody will ever present again from that browser. Because `claimAccountUsername`/`setUsernameCallback`'s availability check both reuse `findUsernameOwner` across guest and account reservations (`plan.md:41`, Decisions), that name is now permanently unclaimable by anyone — guest or Google account — with no code path that ever revisits it. This directly undermines the "pick once, keep forever" scarcity model (triage Q3) the rest of this task is built around: a name can be squatted forever by accident, not just by design.

Neither case is explicitly covered by an acceptance criterion or a Decision in `plan.md`, but both are real, observable regressions of guest-reservation hygiene, triggered by a mainstream flow (try the app as a guest, then decide to sign in) — not an exotic edge case. The fix is small and stays inside files Phase 2 already owns: `player.hook.ts`'s existing `releaseGuestSession` (`:74-84`) already does exactly the cleanup needed (release the Firestore doc if a username is set, clear `localStorage['username']`); it only needs to run once, before or after a successful `signInWithGoogle`, when a guest username was present. `tester-a` already identified and flagged this gap (per the task context handed to this review) but no test or fix exists in the diff for it — confirmed by grep: no test in `player.hook.test.ts`'s `signInWithGoogle` or `auth state (account)` blocks sets a pre-existing guest `localStorage['username']` before triggering sign-in.

Required fix: in `player.hook.ts`, when `signInWithGoogle` succeeds (or in the auth-state effect's account branch, on first transition from a null-account/non-null-username state), call the guest release path (reuse `releaseGuestSession`) for whatever guest username was active, then proceed with the account flow. Add a `player.hook.test.ts` case: guest has a reserved username, calls `signInWithGoogle`, the auth listener reports the new account — assert `releaseUsername` was called with the old guest name and `localStorage.getItem('username')` is cleared (or holds only the new account's state), before the account naming step is checked.

### 2. No other findings
No invented paths or symbols in the diff. Import boundaries respected (`firebase/*` only in `account.service.ts`). File sizes and function lengths are within the `code-standards` limits for every file read. No dead code, no `any`, no commented-out code.

## Docs
- `docs-sync` for the `logout`/`beforeunload` scoping behavior change (`structure-and-state.md` §3.1) is correctly deferred to Phase 4 per `plan.md:343` — not required in this phase's diff.

## Progress.md
Phase 2 boxes for implementation, tests, and checks are confirmed by the above and ticked in `progress.md`. "final review" is left unticked pending the fix above; "committed" is never ticked by this role.

---

# Final review: Persistent account system (Google sign-in), phase 2 — re-review

VERDICT: APPROVED

## Checks run
- `npm run typecheck` → clean (`tsc --noEmit`, no output).
- `npm run lint` → clean (`eslint . --max-warnings 0 --no-error-on-unmatched-pattern`, no output).
- `npx jest src/modules/session` → `Test Suites: 11 passed, 11 total`, `Tests: 145 passed, 145 total` (+1 vs. last round: the new `signInWithGoogle` regression test).
- `npm test` → `Test Suites: 2 failed, 181 passed, 183 total`, `Tests: 2052 passed, 2052 total`. The 2 failing suites are the same pre-existing, unrelated `.agents/skills/caveman-*` suites ("must contain at least one test").

## Fix verification (Finding #1 from the previous round)

**Extraction (`src/modules/session/guest-session.ts`, new, 29 lines):** clean single-responsibility split — `readOrCreateGuestPlayerId`, the private `createPlayerId`, and `releaseGuestReservation` (releases the Firestore `usernames/<name>` doc via `releaseUsername` and clears `localStorage['username']`). No Firestore import outside a `.service.ts` file (it imports `releaseUsername` from `./services/player-session.service`, not `@/lib/firebase` directly) — boundary respected. `player.hook.ts` dropped from over-150-lines back to 162 total lines (150 excluding blank/comment lines per the lint rule, confirmed by the clean lint run). Addendum in `plan.md:83` documents the missed File plan entry and names the owner — consistent with how the two earlier Phase 2 addenda (`plan.md:79`, `:81`) are recorded.

**`signInWithGoogle` fix (`player.hook.ts:79-92`):** now calls `releaseGuestReservation(username)` after a successful popup, gated on `account === null`. Traced both call sites now share the one helper (`player.hook.ts:63` in `releaseGuestSession`, `:89` in `signInWithGoogle`) — no duplicated release logic.

**Ordering concern (does it clobber the auth listener's restored account username?) — confirmed safe:**
- `account` and `username` inside `signInWithGoogle`'s closure are bound at the render when the callback was created, i.e. before the user clicked "Sign in with Google" — at that point the user is necessarily a guest, so `account === null` and `username` is whatever guest name (or `null`) was active. This value doesn't change mid-flight even if `subscribeToAuthState`'s listener fires and triggers a re-render while the popup is open; the already-running function keeps its own closure.
- `releaseGuestReservation` (`guest-session.ts:20-29`) never calls `setUsernameState` or touches `account` — it only does a Firestore delete and `localStorage.removeItem('username')`. The auth listener's account branch (`player.hook.ts:52-58`) sets `username` state only via `restoreAccountUsername`, which reads `accounts/{authUid}.username` — a different document, never the just-deleted `usernames/<guestName>` doc. The two code paths touch disjoint state regardless of which runs first, so there is no race to clobber.
- Confirmed by `player.hook.test.ts:688-700` ("the auth listener is the source of truth") still passing unchanged — `signInWithGoogle` never sets identity state directly.

**Regression test (`player.hook.test.ts:702-720`):** sets `localStorage['playerId']`/`localStorage['username']` before mount, mocks `findUsernameOwner` to return the same guest id so the mount-time `validateSession` restores `username: 'testuser'` (confirmed at line 712), then calls `signInWithGoogle()` and asserts `releaseUsername` was called with `'testuser'` and `localStorage.getItem('username')` is now `null`. This exercises the exact root cause from the previous finding — the guest's Firestore reservation and its `localStorage` copy are both cleared on sign-in — which is what prevents both named consequences (silent reappearance on sign-out, permanent orphaned reservation): with the doc released and the key cleared, a later sign-out finds no stored username to resurrect, and the name becomes claimable again by anyone.

## Findings
None blocking. No invented paths or symbols. Import boundaries respected.

## Docs
- `docs-sync` for `logout`/`beforeunload` scoping (`structure-and-state.md` §3.1) remains correctly deferred to Phase 4 per `plan.md:343`.

## Progress.md
Phase 2 "final review" ticked APPROVED in `progress.md`. "committed" left for the coordinator.

---

# Final review: Persistent account system (Google sign-in), phase 3

VERDICT: APPROVED

## Checks run
- `npm run typecheck` → clean (`tsc --noEmit`, no output).
- `npx eslint src/modules/session src/testbed --max-warnings 0` → clean, no output.
- `npx jest src/modules/session src/testbed` → `Test Suites: 20 passed, 20 total`, `Tests: 219 passed, 219 total`.
- ui-verify: read `test-results/ui-verify/testbed-session-login-state-{Loading,Guest,Account}--desktop.png`. Loading: spinner + title visible, no form, matches `Login.tsx:59-63`. Guest: Google button, "or" divider, name form all present, card clipped at the bottom (submit button out of frame) — matches the documented risk. Account: "Choose your permanent commander name — this cannot be changed later" copy, name form, Enter Lobby button, no Google button, card fully visible (fits within viewport unlike Guest/Loading). No console errors reported in the preview-b hand-off.

## Plan adherence
Diffed every Phase 3 file against `plan.md`'s Contracts (`LoginViewProps` lines 283-294, `Login.hook.ts` behavior contract lines 296-302) and File plan (lines 64-73):

- `Login.types.ts`: `LoginMode`, `LoginErrorDialogState`, `LoginViewProps` match the contract field-for-field, same order.
- `Login.fixtures.ts` (new): one `LoginViewProps` per `LoginMode`, no `jest.fn()` (plain `noop`), shared by the preview and `Login.test.tsx` — matches Phase 3 step 2 exactly.
- `Login.hook.ts`: `toLoginMode(isAuthLoading, isGuest)` matches the contract's `mode = isAuthLoading ? 'loading' : isGuest ? 'guest' : 'account'` precisely (`Login.hook.ts:17-20`). `onSubmit` keeps its existing body, now sets `USERNAME_TAKEN_DIALOG` on failure/throw (`:44-55`) — unchanged behavior, new shape. `onGoogleSignIn` sets `isLoading` true, calls `signInWithGoogle()`, sets `SIGN_IN_FAILED_DIALOG` on a `false` result, resets `isLoading` in `finally` (`:57-67`) — matches the contract verbatim.
- `Login.styles.ts`: `googleButton`, `divider`, `dividerLine`, `dividerText`, `loadingWrap`, `spinner` added; all reuse existing theme tokens (`border-white/10`, `bg-black/40`, `text-muted-foreground`, `text-foreground`) — no new raw colors, matches Phase 3 step 4. `root`'s `w-screen` → `w-full` fix is in scope (harmless); `h-screen` kept (see Risk discussion below).
- `Login.tsx`: `mode === 'loading'` renders a centered spinner (`role="status" aria-label="Loading"`) inside the `Card`, no form, no footer — matches step 5. `mode === 'guest'` renders the Google button + divider above the existing name form. `mode === 'account'` renders the name form with the permanent-name copy, no Google button. `errorDialog.title`/`.description` replace the hardcoded strings. All matches the contract.
- `Login.hook.test.ts`, `Login.test.tsx`: cover mode derivation (`it.each`, all four loading/guest/account/stale-context cases) and `onGoogleSignIn` success/failure/pending states; view test covers each mode's controls and copy, Google button presence/absence, error-dialog prop-driven title/description. Matches the Test plan bullets (`plan.md:358,360`).
- `Login.preview.tsx`, `Login.preview.test.tsx` (new): three states (Loading, Guest, Account) rendering `LoginView` with the shared fixtures, one assertion per state — matches Phase 3 steps 8-9 and the `Preview states` section (`plan.md:365`).
- `src/testbed/registry.ts`: `loginPreview` imported and registered — matches step 10.

No invented paths or symbols: grepped the full repo for `showErrorDialog` (the old prop name) — zero remaining references, confirming every call site was migrated, not just the owned files.

## Scoping decision: `h-screen` left unfixed (Risks section)
Confirmed via `git show e22eca0:src/modules/session/components/Login/Login.styles.ts` that `h-screen w-screen` predates this task (commit `e22eca0`, an unrelated prior fix) — not introduced by this phase. The `w-screen` → `w-full` fix is in the diff and is harmless. Screenshots confirm the described cosmetic effect: the testbed's Guest and Loading states clip the card at the bottom (submit button/footer out of frame); Account fits because it has one less child (no Google button/divider) and is shorter overall. The real route is unaffected per the plan's claim (not independently re-verified here, since `/` isn't rendered by the testbed harness — this was preview-b's and the coordinator's job, already recorded in Risks). Fixing `h-screen` → `h-full` requires giving the app shell (`globals.css`'s `html`/`body`, or `layout.tsx`) a sized-height chain, which touches more than `Login` and is out of this task's acceptance criteria. Scoping decision is correct: smallest correct change, documented risk, no silent regression. No task folder for the follow-up exists yet under `docs/ai/tasks/` — the "spun off" fix is only recorded as a note in `plan.md`'s Risks section, not a separate task record. Non-blocking: the risk is written down either way and nothing here is lost, but the coordinator should actually create `docs/ai/tasks/<date>-app-shell-height-fix/` (or similar) if "spun off" is meant literally, so it isn't forgotten.

## Loading-state title question (tester-b/preview-b)
Current behavior: `CardTitle` ("Welcome to Corner Conquest") stays visible in `mode === 'loading'`; only `CardDescription` is hidden (`Login.tsx:51-56`). Accepted as-is: the title is static branding, not identity- or mode-specific copy, so there's no correctness reason to hide it during the brief auth-resolution window, and hiding it would add an extra layout shift (title popping in) on top of the existing spinner-to-form transition. `Login.test.tsx`'s `mode: loading` describe block (`shows the title but neither mode description`) locks this in as an explicit, intentional assertion, not an oversight. No fix needed.

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| 1 | `Login.test.tsx` (diff, removed `describe('root stacking context (z-index regression)', …)`) | The rewrite dropped the two pre-existing assertions on `styles.root` containing `z-\d+` and `relative` (a regression guard for a past stacking-context bug, unrelated to this phase's `mode` changes). Not reintroduced elsewhere in the diff. | tester-b | No — the underlying CSS (`styles.root`) still carries `relative z-0`, unchanged in this diff (`Login.styles.ts:2`), so there's no live regression; only test coverage for a past bug was lost. Flagging so tester-b can decide whether to restore it in a follow-up pass rather than losing that guard silently. |

No other findings. No invented paths or symbols in the diff. Import boundaries respected (no `firebase/*`, no `@/features/*` in `.tsx`/`.styles.ts`/`.types.ts`/`.fixtures.ts`/`.preview.tsx`). File sizes within `code-standards` limits (`Login.tsx` 134 lines, `Login.hook.ts` well under 150).

## Docs
- `docs-sync`: not needed this phase — Phase 3 is UI-only (Login rendering, no identity/rule behavior change); the `logout`/`beforeunload` docs update is already scheduled for Phase 4 per `plan.md:345`.

## Progress.md
Phase 3 boxes for implementation, tests, previews, checks, and UI verified are confirmed by the above and ticked in `progress.md`. "final review" ticked APPROVED. "committed" left for the coordinator.

---

# Final review: Persistent account system (Google sign-in), phase 4 — whole-task final review

VERDICT: APPROVED

## Checks run (this session)
- `npm run typecheck` → clean (`tsc --noEmit`, no output).
- `npm run lint` → clean (`eslint . --max-warnings 0 --no-error-on-unmatched-pattern`, no output).
- `npm test -- --maxWorkers=2` → `Test Suites: 2 failed, 182 passed, 184 total`, `Tests: 2069 passed, 2069 total`. The 2 failing suites are `.agents/skills/caveman-explore/tests/skill-file.test.mjs` and `.agents/skills/caveman-learn/tests/skill-file.test.mjs` ("must contain at least one test") — pre-existing, unrelated to this task (`.agents/` is Google Antigravity config per `CLAUDE.md`, untouched by this diff).
- `npx jest src/modules/session` → `Test Suites: 12 passed, 12 total`, `Tests: 159 passed, 159 total`.
- `java -version` → "Unable to locate a Java Runtime" — confirms `npm run test:rules` and `npm run test:e2e` genuinely cannot run in this environment, as claimed by every phase.
- `npm run build` → succeeds, static pages generated, no type/lint errors.
- Verified real commits exist for every hash `progress.md` claims: `44ae2a0` (phase 1), `b3d033d` (phase 2), `e4cb89a` (phase 3), `311a639` (phase 3 doc). Phase 4 is correctly uncommitted and both its `progress.md` boxes ("final review", "committed") were unticked before this review, matching the actual repo state — no discrepancy of the kind flagged in `docs/ai/lessons-learned.md`'s `2026-10-04-game-balance-review` entry.

## 1. docs-sync accuracy (§3.1, §2, §6.12) vs. shipped code
- `docs/architecture/structure-and-state.md` §3.1: diffed against `src/modules/session/player.hook.ts`, `guest-session.ts`, `account.service.ts`, `firestore.rules`. Every numbered bullet (5-9) matches the actual code: bullet 5's "a guest's username reservation is released on sign-in" matches `player.hook.ts:88-90` (`if (account === null) await releaseGuestReservation(username)`); bullet 6's `accounts/{authUid}` reverse lookup matches `account.service.ts:41-47`; bullet 7's `claimAccountUsername`/`bindUsernameToAccount` batch matches `account.service.ts:53-76` and `firestore.rules:13-18`; bullet 8's "signOut only, no Firestore write" matches `player.hook.ts:67-77`; bullet 9's `beforeunload` guest-only scoping matches `player.hook.ts:145-159`. No drift between doc and code.
- `docs/architecture/structure-and-state.md` §2 (file-layout bullet): the `session/` entry now lists `account.service.ts` alongside `player-session.service.ts` — both files exist at the cited paths. Accurate.
- `docs/architecture/systems-and-visuals.md` §6.12: "Firestore and Auth Emulators" bullet matches `playwright.config.ts:3-9,31-49` and `firebase.json:3-8` exactly (host/port values, `--only firestore,auth`, both `NEXT_PUBLIC_*` env vars). Accurate.
- Minor pre-existing-pattern nit, non-blocking: `firestore.rules:57-60`'s comment on the `games` collection still says "the app has no Firebase Auth" — now false in general (Auth exists for identity), though still true in the narrow sense that mattered when it was written (the `games` collection itself has no per-player auth enforcement, which remains true and is this task's explicit non-goal). Not required reading for anyone touching `usernames`/`accounts`, and not a documented architecture claim (it's an inline rules comment, not `docs/architecture/*.md`). Owner: whoever next touches `firestore.rules`'s `games` block; not worth a special phase.

## 2. The missing e2e spec for Google sign-in — not a blocking gap
Confirmed by reading `e2e/auth-and-lobby.spec.ts` in full: it only exercises the guest flow (username input, Enter Lobby, Create Game dialog) and was correctly left unchanged, per `plan.md`'s Decisions (line 46) and File plan (line 77, "No change needed"). This was a plan-level decision, approved by architect-b's plan review (`plan.md:386`), not an oversight that fell through the phase step lists — the plan explicitly weighed and rejected an e2e spec for this flow, for a real technical reason: `signInWithPopup` opens a real Google OAuth consent screen, which Playwright cannot drive headlessly, and the Firebase Auth emulator's own popup flow still requires a human (or a special test harness Google provides, not wired into this repo) to pick an emulated test account — there is no way to script "click the Google account picker" without that extra infrastructure, which is out of scope for an L-tier task whose acceptance criteria don't mention emulator-UI automation.
Coverage that does exist and is adequate given that constraint: `account.service.test.ts` (mocks `signInWithPopup`/`onAuthStateChanged` directly, covers success/failure/subscription semantics), `player.hook.test.ts` (`signInWithGoogle` success/failure/no-direct-state-set/guest-release-on-sign-in, `logout` branching, `beforeunload` scoping — all re-verified present in this session, `player.hook.test.ts:680-720`), `Login.hook.test.ts`/`Login.test.tsx` (mode derivation, `onGoogleSignIn`'s loading/error states, Google button visibility). This is the standard "mock at the Firebase SDK boundary, test the app's own logic" pattern already used for Firestore elsewhere in this codebase (`skill: testing`'s services section) — not a workaround invented for this task. Verdict: accepted as sufficient, correctly flagged as a manual-QA risk in `plan.md`'s Risks and Phase 4 step 4, not a gap that should block closing the task.

## 3. "Pick once, keep forever" and "guests stay disposable" — both satisfied
- **Pick once, keep forever:** `firestore.rules:13-18` blocks a `usernames` create with a non-null `authUid` unless `!exists(accounts/{uid})`; `firestore.rules:25-34` make `update`/`delete` unconditionally impossible once `authUid` is non-null; `accounts/{authUid}`'s own `update`/`delete` are hardcoded `false` (`firestore.rules:44-45`). Traced in the phase-1 review (re-confirmed here, no change since): the redundant enforcement (both the `!exists` check on `usernames` create and the `update: false` on the existing `accounts` doc) closes the race where two concurrent `bindUsernameToAccount` batches for the same account both observe "no account yet" — Firestore serializes writes to the same document, so the loser's atomic batch (both documents) is rejected together. No client code path exists that renames, unbinds, or reassigns a bound username — `setUsernameCallback`'s account branch (`player.hook.ts:94-102`) only ever calls `claimAccountUsername` once, and `page.tsx`'s `if (!username || !playerId) return <Login />` means Login never re-renders for an identity that already has one.
- **Guests stay disposable:** guest behavior (bullets 1-4 of §3.1, unchanged from before this task) is untouched — `logout()`'s guest branch and `beforeunload`'s guest branch both still call `releaseGuestReservation`/`releaseGuestSession` exactly as before. The one new risk this task introduced — a guest's reservation surviving past a mid-session Google sign-in and becoming a permanently-unclaimable orphan — was caught in the phase-2 review (Finding #1), fixed (`player.hook.ts:86-90`, `guest-session.ts`), and has a regression test (`player.hook.test.ts:702-720`, re-read and confirmed present and still asserting the fix in this session).

## Findings
No blocking findings across the full 4-phase arc. One non-blocking nit (the stale `firestore.rules` comment, item 1 above) — cosmetic, doesn't affect behavior or any documented architecture claim, left for whoever next edits that rule block.

## Docs
`docs-sync`'s Phase 4 updates are accurate and complete for this task's scope (see §1 above). No further doc changes needed.

## Progress.md
Phase 4 "final review (architect-b)" ticked APPROVED. "committed: <hash>" left for the coordinator, as this role never ticks that box.
