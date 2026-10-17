# Plan: Phase 0C — Account deletion

Status: APPROVED
Inputs: triage.md, roadmap.md (Phase 0 scope + Review), phase-0a-plan.md / phase-0b-plan.md (conventions)

## Goal and acceptance criteria
- [ ] A signed-in Google-linked player, and a guest (anonymous Firebase Auth) player, can each
      delete their own account from a UI entry point in `src/modules/session`.
- [ ] Deletion removes `usernames/{username}` (if one is claimed) and `accounts/{authUid}` (if one
      exists — guests never have one) and the Firebase Auth user itself.
- [ ] `games/{gameId}` documents the player is or was seated in are left untouched (see Decision 1
      — flagged as a product/legal question, not assumed).
- [ ] Firestore rules permit the owning uid to delete its own `accounts/{authUid}` and its own
      bound `usernames/{username}`; no one else can delete either. Existing rule tests that assert
      the opposite are updated, not just supplemented.
- [ ] `auth/requires-recent-login` on the final Auth-user-delete step is handled: a Google-linked
      player is prompted to reauthenticate once and the deletion retries; a guest sees a clear
      error (reauthentication is not possible for an anonymous session) after their Firestore data
      has already been removed.
- [ ] `npm run typecheck`, `npm run lint`, `npm test` pass. `npm run test:rules` passes (needs the
      Firestore emulator and Java 21, per CLAUDE.md's Commands table) for whoever has that set up —
      record in `progress.md` if a stage could not run it. **Verified this session: this planning
      environment has neither Java nor the `firebase` CLI on PATH (`java -version` reports "Unable
      to locate a Java Runtime"; `which firebase` finds nothing), so `npm run test:rules` cannot be
      run here. The Phase 1 rule change (`firestore.rules`, `firestore.rules.test.ts`) is therefore
      not verified by this plan or by architect-b's review — it must be run with
      `npm run test:rules` on a machine with Java 21 before the rule change is deployed.**
- [ ] `docs/architecture/structure-and-state.md` and `systems-and-visuals.md` document the new
      component, the service function and the rule change.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `AuthAccount`, `signInWithGoogle`, `signInAnonymously`, `linkGoogleAccount`, `findAccountUsername`, `bindUsernameToAccount` | `src/modules/session/services/account.service.ts:1-105` | No `deleteAccount` export exists today (confirmed, file read in full). `findAccountUsername` (line 70) and the `getErrorCode`-style error-code check pattern (mirrored from `LinkGoogleAccountButton.hook.ts`, see below) are the closest precedents. File is 95 non-blank/non-comment lines (`grep -vcE '^\s*(//.*)?$'`), well under the 150-line lint cap, room to add `deleteAccount`. |
| `findUsernameOwner`, `reserveUsername`, `releaseUsername` | `src/modules/session/services/player-session.service.ts:1-22` | `releaseUsername` is the existing precedent for deleting a `usernames/{username}` doc; `deleteAccount` does its own batched delete instead of calling this, because it must delete `accounts/{uid}` atomically with it (same reasoning as `bindUsernameToAccount`'s batch, `account.service.ts:82-87`). |
| `usePlayerProvider`, `PlayerContextType` | `src/modules/session/player.hook.ts:1-186`, `src/modules/session/player.types.ts:1-18` | `playerId = account.uid` (`player.hook.ts:24`) — confirms every `games/{gameId}` document's `players[].playerId` (see below) is the Firebase Auth uid, not a separate identifier. `player.hook.ts` is **149 non-blank/non-comment lines**, 1 below the 150-line lint cap (`grep -vcE '^\s*(//.*)?$' player.hook.ts` → 149) — **do not add to this file**; `deleteAccount` is called directly from the new component's own hook via `account.service.ts`, not threaded through `PlayerContextType`. `usePlayer()` is still used by the new hook, but only to read the existing `username` field. |
| `joinOpenGame`, `subscribeToVacantSeat` | `src/modules/lobby/services/lobby.service.ts:39,79-98` | `player.playerId` is an opaque string key compared with `===`; no lobby/game-board service queries "every game a given uid is in" — confirms there is no cheap way to find and redact a departing player's game history (see Decision 1). |
| `handlePlayerExit`, `handleSeatReclaim` | `src/modules/game-rules/services/player-exit.service.ts:36-150`, `src/modules/game-rules/services/player-reclaim.service.ts:1-34` | Neither is called by account deletion. Confirms `games/*` docs are never touched by this plan — a departing/deleted player's seat in an in-progress match is handled only by the existing exit flow (already called separately when the player leaves a match), not by `deleteAccount`. |
| `grep -rn "doc(db," src/modules/*/services/*.service.ts` | repo-wide, re-run this session | Only two uid-keyed top-level collections exist: `accounts/{authUid}` (`account.service.ts:71,85`) and `usernames/{username}` (`account.service.ts:84`, `player-session.service.ts:5,14,19`, keyed by username but carrying an `authUid` field). Every other `doc(db, 'games', gameId)` call is keyed by `gameId`, not by player uid — confirms the roadmap's "games/* also embed player data" finding (roadmap.md's Review) is about an embedded field, not a second uid-keyed collection to delete. |
| `firestore.rules:6-56,58-65` | `firestore.rules` | **Blocking finding, not in the roadmap**: `accounts/{authUid}` has `allow delete: if false; // never released, by design` (line 64); `usernames/{username}`'s delete rule (line 53) is `allow delete: if resource.data.get('authUid', null) == null` — an account-bound reservation (`authUid` set) can **never** be deleted by anyone, including its owner. Without a rule change, `deleteAccount` would get `permission-denied` on both documents in production. This phase must edit `firestore.rules` (Decision 2). |
| `firestore.rules.test.ts:225-260,382-456` | `firestore.rules.test.ts` | Two **existing** tests assert the current (soon to be wrong) behavior: `'should reject deleting a permanent binding, even by its owner'` (line 247, within the `Delete` describe at line 225) and `'should reject deleting an accounts doc, even by its owner'` (line 444, within `Update and delete` at line 431). These must be rewritten to assert the new allow, not left in place alongside a new, contradictory assertion. File has 796 lines total; run via `npm run test:rules` (`package.json:17`), which spins up the Firestore emulator — not part of plain `npm test` (`jest.config.js:18` explicitly ignores `firestore.rules.test.ts`). |
| `deleteUser`, `reauthenticateWithPopup` | `node_modules/firebase/node_modules/@firebase/auth/dist/auth-public.d.ts:934,2823` | `deleteUser(user: User): Promise<void>`, `reauthenticateWithPopup(user: User, provider: AuthProvider, resolver?): Promise<UserCredential>` — neither is exported by `src/lib/firebase.ts` today (confirmed, file read in full); both come from `firebase/auth`, already a dependency of that file. |
| `src/lib/firebase.ts:1-58` | whole file | Exports a fixed list of `firebase/auth`/`firebase/firestore` functions; adding `deleteUser` and `reauthenticateWithPopup` to the existing import-and-re-export list is the same pattern already used for every other Auth function there (`signInWithPopup`, `linkWithPopup`, etc.). `src/lib/__tests__/firebase.test.ts` does not mock `firebase/auth` at all (only `firebase/app` and `firebase/firestore`), so adding two more named re-exports needs no test change (confirmed by reading the test file in full — it never imports or asserts on an Auth export). |
| `LinkGoogleAccountButton.tsx/.hook.ts/.styles.ts/.types.ts/.fixtures.ts/.test.tsx/.preview.tsx/index.ts` | `src/modules/session/components/LinkGoogleAccountButton/` | Full, current precedent for this phase's component: `'use client'` hook importing `usePlayer()`, an error-code-driven dialog (`getErrorCode`/`isCancelledPopup` pattern), `RegistryIcon id="loader-2"` for a spinner, `AlertDialog`/`AlertDialogAction`/`AlertDialogCancel` from `@/components/ui/alert-dialog`, fixtures shared by test and preview, and `src/testbed/registry.ts` import + array-entry registration (`registry.ts:41` plus its corresponding array entry, confirmed present). |
| `src/components/ui/alert-dialog.tsx:101-111` | `AlertDialogAction` | Wraps `AlertDialogPrimitive.Action`, which **closes the dialog on click by Radix's own default behavior** (no app code in this repo overrides it). The confirm button in this phase's dialog must call `event.preventDefault()` in its `onClick` before starting the async delete, or the dialog closes immediately and the player never sees the "Deleting…" or error state (Decision 4). |
| `src/modules/session/index.ts:1-8` | whole file | Module's public API; the new component is added here as one more named export, the same pattern as every existing session component. |
| `src/testbed/registry.ts:1-41+` | import block | One more `import { xPreview } from '@/modules/session/components/DeleteAccountButton/DeleteAccountButton.preview'` plus its entry in the exported array (array literal not fully re-quoted here — `preview-a` edits the existing array the same way the `linkGoogleAccountButtonPreview` entry was added). |
| `eslint.config.mjs:42-53` (`RESTRICTED_IMPORTS`), `:70` (`max-lines`) | `RESTRICTED_IMPORTS`, `max-lines` | `@/lib/firebase`/`firebase/*` may only be imported in `*.service.ts` — `DeleteAccountButton.hook.ts` must call `deleteAccount` from `account.service.ts`, never import `@/lib/firebase` itself. `max-lines: 150` (blank/comments excluded) — every new file here is small and clear of the limit by design. |

## Decisions
1. **`games/{gameId}` documents are left untouched by deletion.** A deleted player's `playerId`
   (their uid) and chosen display `name` remain in any match they played, exactly as they are for
   a player who simply leaves via `handlePlayerExit` today. Reasons: (a) there is no existing query
   to find every game a given uid has ever participated in — `players[]` is an array of objects,
   not a value Firestore can `array-contains`-query by a sub-field, and the client only knows about
   its own currently-open match, not its full history (`lobby.service.ts`, `player-reclaim.service.ts`
   verified above); building that index is a materially bigger feature than this phase's budget.
   (b) A finished match's log and board state is shared with other players still able to view their
   own match history; live-redacting a name out of a shared document the moment one party deletes
   their account is a product decision with no existing precedent in this codebase, not an
   engineering default to invent silently. **This is flagged as a product/legal open question below,
   not a locked decision** — the privacy policy (Phase 0A, already shipped) must be checked by the
   user/lawyer against whatever is decided here. Rejected: scanning and rewriting every `games/*`
   document containing the uid — no feasible query exists without a new index field, which is out
   of this phase's scope and not requested by triage.md.
2. **`firestore.rules` must change** (new finding, not in the roadmap): today `accounts/{authUid}`
   can never be deleted (`allow delete: if false`) and an account-bound `usernames/{username}` can
   never be deleted by anyone (`allow delete: if resource.data.get('authUid', null) == null` only
   covers guest reservations). Both rules are narrowed to also allow the owning uid to delete its
   own document — see Contracts for the exact rule text. Rejected: working around this by writing
   `{ deleted: true }` instead of actually deleting the docs — that satisfies no deletion
   requirement and leaves the username permanently unreleasable (the "pick once" rule on
   `usernames`/`accounts` would still block anyone, including the same person, from reusing it).
3. **Firestore deletes before the Auth-user delete, not after.** `firestore.rules`' new delete
   rules key on `request.auth.uid == authUid`; once `deleteUser` succeeds, `auth.currentUser` is
   null and any later Firestore write from this client is unauthenticated and denied. Doing
   Firestore first also means a failed network call there leaves nothing deleted (safe to retry);
   a failure in the later Auth-delete step leaves the Firestore docs already gone (self-correcting
   on retry — `deleteAccount` re-running finds nothing to delete in Firestore and just retries
   `deleteUser`). No path leaves the app itself unusable: `player.hook.ts`'s existing
   `subscribeToAuthState` listener already auto-signs a null session back in anonymously
   (`player.hook.ts:53-60`), so after `deleteUser` succeeds the player is simply dropped into a
   fresh guest session, the same UX as `logout()`.
4. **`auth/requires-recent-login` handling**: caught only around the final `deleteUser(user)` call
   (after Firestore is already clean). If the account is **not** anonymous (Google-linked),
   `reauthenticateWithPopup(user, new GoogleAuthProvider())` is tried once, then `deleteUser`
   retried; any further failure (including the player cancelling the popup) is rethrown untouched,
   matching `linkGoogleAccount`'s own "throws the Firebase error untouched" contract. If the
   account **is** anonymous, the error is rethrown immediately with no reauth attempt — Firebase
   Anonymous Auth has no credential to reauthenticate with (`signInAnonymously()` again creates a
   **different** uid, it does not refresh the current session) — and the UI tells the player their
   data was already removed and asks them to reload and try again, rather than silently treating a
   half-finished deletion as success. Rejected: silently swallowing the guest case as "success" —
   the Auth user row would still exist with no caller able to verify it was actually removed; an
   honest error is safer than an unverifiable claim.
5. **No change to `PlayerContextType`/`player.hook.ts`.** `player.hook.ts` is at 149 of the
   150-line lint cap (verified above); `DeleteAccountButton.hook.ts` calls `deleteAccount` directly
   from `account.service.ts` (a `.hook.ts` may call a service directly — the `@/lib/firebase`
   import restriction applies to `.service.ts` files, not to importing another module's service
   function) and reads only the already-exposed `username` field from `usePlayer()`. Rejected:
   adding a `deleteAccount` method to `PlayerContextType` — would push `player.hook.ts` over its
   lint limit for a method only one component calls.
6. **One component, three view states in one dialog** (`confirm` / `deleting` / `error`), not two
   separate dialogs. Mirrors `LinkGoogleAccountButton`'s single-dialog-with-states shape more
   closely than inventing a second dialog component for a 3-state flow that never needs both open
   at once. Rejected: a separate confirm dialog and error dialog (two `AlertDialog`s) — needless
   duplication of the same `AlertDialogContent` shell for one linear flow.

## Open questions (product/legal, not resolved by this plan)
- Whether a deleted player's `playerId`/`name` in past `games/{gameId}` documents must also be
  redacted (Decision 1). If the answer is yes, it needs a new feature (an index of "games this uid
  has played," or a Cloud Function) out of this phase's scope — flag for a later phase, do not
  build speculatively here.
- Whether deletion must also call Google's OAuth token revocation (`auth.revokeAccess`-equivalent)
  — already an open question from roadmap.md's Phase 0 section, still unresolved, not addressed by
  this plan (Firebase's client SDK has no built-in "revoke Google grant" call distinct from
  `deleteUser`; doing so would need a server-side call to Google's OAuth revocation endpoint, a
  new backend surface this phase does not add).

## File plan
### Phase 1: Firestore rules + `deleteAccount` service (5 files)
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `firestore.rules` | edit | Allow the owning uid to delete its own `accounts/{authUid}` (line 64) and its own bound `usernames/{username}` (line 53) | implementer-a |
| `firestore.rules.test.ts` | edit | Rewrite the two tests that assert the old deny behavior (lines 247, 444) into allow-by-owner tests; add two new reject-by-non-owner tests | tester-a |
| `src/lib/firebase.ts` | edit | Import and re-export `deleteUser`, `reauthenticateWithPopup` from `firebase/auth` | implementer-b |
| `src/modules/session/services/account.service.ts` | edit | Add `deleteAccount(username: string \| null): Promise<void>` | implementer-a |
| `src/modules/session/services/account.service.test.ts` | edit | Unit tests for `deleteAccount` (batch delete, order of ops, reauth retry, guest rethrow) | tester-a |

### Phase 2: `DeleteAccountButton` component (6 files)
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/session/components/DeleteAccountButton/DeleteAccountButton.types.ts` | new | `DeleteAccountDialogView`, `DeleteAccountButtonViewProps` | implementer-a |
| `DeleteAccountButton.hook.ts` | new | `useDeleteAccountButton()`: dialog state machine, calls `deleteAccount` | implementer-a |
| `DeleteAccountButton.fixtures.ts` | new | Fixtures for `confirm`/`deleting`/`error` states | implementer-a |
| `DeleteAccountButton.tsx` | new | `DeleteAccountButtonView` (pure) + `DeleteAccountButton` (connected) | implementer-b |
| `DeleteAccountButton.styles.ts` | new | Tailwind classes for the trigger button and the dialog's destructive action | implementer-b |
| `DeleteAccountButton/index.ts` | new | Exports `DeleteAccountButtonView`, `DeleteAccountButton`, `useDeleteAccountButton`, types | implementer-a |

### Phase 3: Tests, preview, wiring (5 files)
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `DeleteAccountButton.hook.test.ts` | new | Hook state-machine tests | tester-a |
| `DeleteAccountButton.test.tsx` | new | View render/interaction tests | tester-b |
| `DeleteAccountButton.preview.tsx` | new | Testbed states: confirm, deleting, error | preview-a |
| `src/testbed/registry.ts` | edit | Register the new preview | preview-a |
| `src/modules/session/index.ts` | edit | Export `DeleteAccountButton` | implementer-a |

### Phase 4: Docs (2 files)
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `docs/architecture/structure-and-state.md` | edit (§2) | Document `deleteAccount` and the new component | docs-sync |
| `docs/architecture/systems-and-visuals.md` | edit (§6.7) | New subsection: account deletion UI and behavior | docs-sync |

18 files across 4 phases (5 / 6 / 5 / 2) — each phase at 6 files or fewer, matching the
phase-0b-plan.md pattern (and architect-b's Finding 1 on the earlier 7-file Phase 3).

## Contracts
```ts
// firestore.rules — exact text replacing the current lines (line numbers as of this session)

// Line 53 (inside match /usernames/{username} { ... }), replacing:
//   allow delete: if resource.data.get('authUid', null) == null;
// with:
      // Guest reservations can be released on logout/beforeunload, exactly as before.
      // An account-bound reservation may be deleted only by the account that owns it
      // (account.service.ts deleteAccount); no one else may delete it.
      allow delete: if resource.data.get('authUid', null) == null ||
        (request.auth != null && resource.data.get('authUid', null) == request.auth.uid);

// Line 64 (inside match /accounts/{authUid} { ... }), replacing:
//   allow delete: if false; // never released, by design
// with:
      // Account deletion (account.service.ts deleteAccount): the owner may delete their own
      // accounts/{uid} doc. No one else may delete another account's doc.
      allow delete: if request.auth != null && request.auth.uid == authUid;
```

```ts
// src/lib/firebase.ts — add to the existing 'firebase/auth' import and the existing export list,
// no other change:
import {
  // ...existing imports unchanged...
  deleteUser,
  reauthenticateWithPopup,
} from 'firebase/auth';

export {
  // ...existing exports unchanged...
  deleteUser,
  reauthenticateWithPopup,
};
```

```ts
// src/modules/session/services/account.service.ts — add this function; no change to any
// existing export.
import { auth, db, doc, writeBatch, deleteUser, reauthenticateWithPopup, GoogleAuthProvider /* already imported */ } from '@/lib/firebase';

/**
 * Deletes the signed-in player's account: usernames/{username} (if `username` is given) and
 * accounts/{uid} (a no-op delete if it doesn't exist, e.g. a guest) in one batch, then the
 * Firebase Auth user itself. Firestore is deleted first — see phase-0c-plan.md Decision 3 for why
 * the order matters. Throws `new Error('No active session to delete.')` if nobody is signed in.
 *
 * If the final deleteUser call fails with `auth/requires-recent-login`:
 * - Google-linked account: reauthenticates once via a Google popup, then retries deleteUser.
 *   Any further failure (including a cancelled popup) is rethrown untouched.
 * - Guest (anonymous) account: rethrown immediately, uncaught — there is no credential to
 *   reauthenticate an anonymous session with. By this point Firestore's accounts/usernames docs
 *   are already gone; only the orphaned Auth user row remains, which the caller's UI must tell
 *   the player about (see DeleteAccountButton.hook.ts's getErrorMessage).
 */
export async function deleteAccount(username: string | null): Promise<void>;
```

```ts
// src/modules/session/components/DeleteAccountButton/DeleteAccountButton.types.ts

export type DeleteAccountDialogView = 'confirm' | 'deleting' | 'error';

export type DeleteAccountButtonViewProps = {
  isDialogOpen: boolean;
  view: DeleteAccountDialogView;
  /** Only meaningful when view === 'error'. */
  errorMessage: string;
  onOpenChange: (open: boolean) => void;
  /** Must call event.preventDefault() before this fires — see DeleteAccountButton.tsx contract. */
  onConfirmDelete: () => void;
};
```

```ts
// src/modules/session/components/DeleteAccountButton/DeleteAccountButton.hook.ts
'use client';

// Reads usePlayer() only for `username` (no other PlayerContextType field, no new field added to
// it — see Decision 5). Calls deleteAccount(username) from '../../services/account.service'.
//
// State machine:
// - onOpenChange(true): opens the dialog, resets view to 'confirm'.
// - onOpenChange(false): closes the dialog (used by Cancel and the error dialog's OK button).
// - onConfirmDelete(): sets view 'deleting', calls deleteAccount(username); on success closes the
//   dialog (isDialogOpen: false); on failure sets view 'error' and errorMessage from the error's
//   Firebase `code` (map 'auth/requires-recent-login' and 'auth/popup-closed-by-user' /
//   'auth/cancelled-popup-request' to specific copy, same getErrorCode-style cast pattern as
//   LinkGoogleAccountButton.hook.ts; anything else to one generic message).
export function useDeleteAccountButton(): DeleteAccountButtonViewProps;
```

```tsx
// src/modules/session/components/DeleteAccountButton/DeleteAccountButton.tsx
'use client';

// DeleteAccountButtonView(props: DeleteAccountButtonViewProps): pure.
// - A trigger <Button> (variant implementer-b's choice, theme tokens only) with onClick calling
//   onOpenChange(true).
// - One <AlertDialog open={isDialogOpen} onOpenChange={onOpenChange}> whose <AlertDialogContent>
//   body/footer switch on `view`:
//   - 'confirm' or 'deleting': title "Delete Your Account?", a warning description, an
//     <AlertDialogCancel disabled={view === 'deleting'}> and an <AlertDialogAction> labelled
//     "Delete Account" / "Deleting…" (view === 'deleting' shows a spinner via
//     RegistryIcon id="loader-2", same as LinkGoogleAccountButton), disabled while deleting.
//     CRITICAL: that AlertDialogAction's onClick MUST call event.preventDefault() before calling
//     onConfirmDelete() — Radix's AlertDialogAction closes the dialog by default on click
//     (src/components/ui/alert-dialog.tsx:101-111), which would hide the 'deleting'/'error' states.
//   - 'error': title "Deletion Failed", body = errorMessage, a single <AlertDialogAction> labelled
//     "OK" whose onClick calls onOpenChange(false) (no preventDefault needed here — closing is the
//     intended behavior, same as LinkGoogleAccountButton's error dialog OK button).
export function DeleteAccountButtonView(props: DeleteAccountButtonViewProps): JSX.Element;

// DeleteAccountButton(): one line, per the component-architecture connected-component pattern.
export function DeleteAccountButton(): JSX.Element;
```

```ts
// src/modules/session/components/DeleteAccountButton/index.ts
export { DeleteAccountButtonView, DeleteAccountButton } from './DeleteAccountButton';
export { useDeleteAccountButton } from './DeleteAccountButton.hook';
export type { DeleteAccountButtonViewProps, DeleteAccountDialogView } from './DeleteAccountButton.types';
```

```ts
// src/modules/session/index.ts — add one line to the existing export list:
export { DeleteAccountButton } from './components/DeleteAccountButton';
```

## Phases
### Phase 1: Firestore rules + `deleteAccount` service
1. implementer-a edits `firestore.rules` per the Contracts block exactly (sonnet recommended: a
   wrong rule either blocks legitimate deletion or opens a cross-account delete hole).
2. tester-a edits `firestore.rules.test.ts`: rewrite the two tests at lines 247 and 444 (exact
   text above) to assert the new allow, and add a reject-by-a-different-uid test for each of
   `accounts/{authUid}` delete and a bound `usernames/{username}` delete. Run with
   `npm run test:rules` (needs the emulator + Java 21 — if unavailable in this environment, say so
   explicitly in the stage report rather than skipping silently).
3. implementer-b edits `src/lib/firebase.ts` per the Contracts block (haiku acceptable — two
   re-exports, same pattern as the existing ones).
4. implementer-a writes `deleteAccount` in `account.service.ts` per the Contracts block (sonnet
   recommended: the Firestore-then-Auth ordering and the anonymous-vs-Google reauth branch are easy
   to get subtly wrong).
5. tester-a writes/edits `account.service.test.ts`: see Test plan below for exact cases.
6. Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run test:rules` (or report it
   could not run, per step 2).

### Phase 2: `DeleteAccountButton` component
1. implementer-a writes `DeleteAccountButton.types.ts` (haiku acceptable).
2. implementer-a writes `DeleteAccountButton.hook.ts` per the contract (sonnet recommended: the
   error-code-to-message mapping and the dialog state machine are easy to get subtly wrong, e.g.
   forgetting to reset `view` to `'confirm'` on reopen).
3. implementer-a writes `DeleteAccountButton.fixtures.ts`: `confirmDeleteAccountButton`,
   `deletingDeleteAccountButton`, `errorDeleteAccountButton` (haiku acceptable once step 1 exists).
4. implementer-b writes `DeleteAccountButton.tsx` per the contract (sonnet recommended: the
   `event.preventDefault()` requirement on the confirm action is a real pitfall, not mechanical).
5. implementer-b writes `DeleteAccountButton.styles.ts` (haiku acceptable).
6. implementer-a writes `DeleteAccountButton/index.ts` (haiku acceptable).
7. Run `npm run typecheck`, `npm run lint`.

### Phase 3: Tests, preview, wiring
1. tester-a writes `DeleteAccountButton.hook.test.ts` (see Test plan).
2. tester-b writes `DeleteAccountButton.test.tsx` (see Test plan).
3. preview-a writes `DeleteAccountButton.preview.tsx` and registers it in
   `src/testbed/registry.ts`, following the `linkGoogleAccountButtonPreview` pattern exactly
   (haiku acceptable).
4. implementer-a adds the one export line to `src/modules/session/index.ts`.
5. Run `npm run typecheck`, `npm run lint`, `npm test`.
6. `ui-verify`: open the testbed preview for `DeleteAccountButton`; click through confirm →
   deleting → error states; confirm the dialog does not close itself on the confirm click (the
   `preventDefault()` requirement from step 4 of Phase 2).

### Phase 4: Docs
1. docs-sync updates `docs/architecture/structure-and-state.md` §2 and
   `docs/architecture/systems-and-visuals.md` §6.7, documenting `deleteAccount`, the new
   `DeleteAccountButton` component, and the `firestore.rules` owner-delete change from Phase 1.
2. Run `npm run typecheck`, `npm run lint` (docs-only phase; no test or build impact expected, run
   anyway to confirm).

Model escalation: Phase 1 steps 1 and 4 (`firestore.rules`, `deleteAccount`) and Phase 2 steps 2
and 4 (`.hook.ts`, `.tsx`) need sonnet; every other step is mechanical enough for haiku.

## Test plan
- tester-a (logic, first):
  - `firestore.rules.test.ts`: owner can delete their own bound `usernames/{username}`; a
    different uid cannot delete someone else's bound `usernames/{username}`; owner can delete
    their own `accounts/{authUid}`; a different uid cannot delete someone else's `accounts/{authUid}`;
    unauthenticated cannot delete either. (Replaces the two now-wrong tests at lines 247 and 444.)
  - `account.service.test.ts`: `deleteAccount('alice')` with a signed-in `auth.currentUser` calls
    `writeBatch` with a `delete` on `usernames/alice` and on `accounts/<uid>`, commits the batch,
    then calls `deleteUser`, in that order (assert the batch commit resolves before `deleteUser` is
    called). `deleteAccount(null)` (no claimed username) only deletes `accounts/<uid>` in the
    batch. `deleteAccount` with no `auth.currentUser` rejects with `'No active session to delete.'`
    and never calls `writeBatch` or `deleteUser`. `deleteUser` rejecting with
    `{ code: 'auth/requires-recent-login' }` for a non-anonymous user calls
    `reauthenticateWithPopup(user, <GoogleAuthProvider instance>)` then retries `deleteUser`; if
    the retry also rejects, that rejection propagates. The same error for an anonymous user
    (`isAnonymous: true`) rejects immediately without calling `reauthenticateWithPopup`. Any other
    `deleteUser` error rejects untouched, no retry attempted.
  - `DeleteAccountButton.hook.test.ts`: initial `isDialogOpen` is false, `view` is `'confirm'`.
    `onOpenChange(true)` sets `isDialogOpen: true` and resets `view` to `'confirm'` even if it was
    left on `'error'` from a prior attempt. `onConfirmDelete()` sets `view: 'deleting'`
    synchronously, then on `deleteAccount` resolving sets `isDialogOpen: false`; on it rejecting
    sets `view: 'error'` with the mapped message for `auth/requires-recent-login`,
    `auth/popup-closed-by-user`/`auth/cancelled-popup-request`, and an unrecognized code (generic
    message) — three separate cases. Mock `../../services/account.service`'s `deleteAccount` and
    `../../player.provider`'s `usePlayer` (returning a fixed `username`).
- tester-b (view):
  - `DeleteAccountButton.test.tsx`: renders the trigger button; clicking it calls `onOpenChange(true)`
    (render `DeleteAccountButtonView` directly with fixtures, not the connected component). In the
    `'confirm'` fixture, the dialog shows the warning text and an enabled Cancel and Delete button;
    clicking Delete calls `onConfirmDelete`. In the `'deleting'` fixture, Cancel and the action
    button are both disabled and the button reads "Deleting…". In the `'error'` fixture, the dialog
    shows `errorMessage` and a single "OK" button whose click calls `onOpenChange(false)`. No
    e2e case — this is an account-settings action, not part of the lobby/match flow `e2e/` already
    covers, and account deletion against a real Firebase project is not something to automate in
    e2e without a disposable test account (out of scope here; flag if the user wants one later).

## Preview states
- `DeleteAccountButton`: `Confirm` (dialog open, `view: 'confirm'`), `Deleting` (`view: 'deleting'`,
  buttons disabled, spinner visible), `Error` (`view: 'error'`, a fixed example message such as the
  `auth/requires-recent-login` copy). All three render `DeleteAccountButtonView` directly with
  `.fixtures.ts` data, matching `LinkGoogleAccountButton.preview.tsx`'s pattern of wrapping the
  dialog-open states in a small local component so the preview's own Escape/close handling works
  (see that file's `InteractiveErrorDialog` wrapper, adapted here for three states instead of two).

## Risks
- `npm run test:rules` needs the Firestore emulator and Java 21 (CLAUDE.md's Commands table). This
  planning environment confirmed it has neither (`java -version`, `which firebase` — see Goal and
  acceptance criteria above): the rule-change tests in Phase 1 **cannot be executed in this
  pipeline's environment** before commit. Record that explicitly in `progress.md` rather than
  skipping the check silently, and do not mark the `firestore.rules`/`firestore.rules.test.ts`
  change as tested until a session with Java 21 runs `npm run test:rules` and confirms it passes —
  that run must happen before the rule change is deployed.
- Decision 1 (leaving `games/*` untouched) is a real, acknowledged gap against a strict reading of
  a "right to erasure": a deleted player's chosen display name persists in other players' match
  history. This is called out as an open product/legal question, not hidden in the implementation.
- The anonymous-user `auth/requires-recent-login` case (Decision 4) cannot be fully resolved
  client-side; the Auth user row can be left orphaned in rare cases. This is a known, documented
  limitation of the client-only Firebase SDK, not a bug in this plan's logic.

## Review (architect-b)

Re-verified this session: `firestore.rules:53,64` (exact text matches the plan's quoted "before"
text), `firestore.rules.test.ts` describe/test line numbers (`Delete` describe at 225, test at 247;
`Update and delete` describe at 431, test at 444 — all exact), `player.hook.ts` (186 total lines,
149 non-blank/non-comment via `grep -vcE '^\s*(//.*)?$'`, confirms the "1 below cap" claim),
`account.service.ts` (95 non-blank/non-comment lines; `findAccountUsername` at line 70,
`bindUsernameToAccount` at line 82 — matches), `player-session.service.ts:1-22` (exact),
`deleteUser`/`reauthenticateWithPopup` signatures in `auth-public.d.ts:934,2823` (exact),
`LinkGoogleAccountButton/` file list (exact, 9 files including `index.ts`),
`src/testbed/registry.ts:41,99` (`linkGoogleAccountButtonPreview` import and array entry, both
confirmed), `eslint.config.mjs` (`RESTRICTED_IMPORTS` at 42-53, `max-lines` at 70 — content matches,
line range cited in the plan, 39-55, is loose but not wrong), `src/components/ui/alert-dialog.tsx`
(`AlertDialogAction` is actually at lines 101-111, not 94-105 as cited — the described Radix
default-close behavior is real and correctly identified, only the line numbers drifted).

Ran `java -version` and `which firebase` in this environment: Java is not installed ("Unable to
locate a Java Runtime") and the `firebase` CLI is not on PATH. `npm run test:rules` cannot run here.
This matches the plan's own Risk entry and Phase 1 step 2/6 instruction to record non-availability
explicitly rather than skip silently — no change needed, just confirming it's not optimistic.

User's two mandated decisions are both reflected correctly: (1) the plan drops "never released, by
design" and "no delete, ever" and replaces both with owner-only delete grants, with matching test
rewrites at the two exact lines that assert the old behavior (Decision 2, Contracts block); (2)
`games/{gameId}` documents are explicitly left untouched, with no rewrite/redaction logic anywhere
in the File plan or Contracts (Decision 1). No `games/*` edit is hiding anywhere in the plan.

The rule text is minimal: it only adds an owner-delete allowance to the two existing `allow delete`
lines, touching no `read`/`create`/`update` rule and no other collection. `accounts/{authUid}`'s new
rule, `request.auth != null && request.auth.uid == authUid`, is correctly owner-gated and guards
`request.auth.uid` behind `request.auth != null` first, consistent with the file's existing
`isGameParticipant` and create-rule style.

### Findings

1. **Blocking — Phase 3 has 7 files, not ≤6.** The file plan's own summary line ("18 files across 3
   phases (5 / 6 / 7)... follows the same pattern as phase-0b-plan.md") is incorrect: I re-read
   `phase-0b-plan.md`'s File plan and its Phase 1 has 6 files, Phase 2 has 5 — neither phase there
   is 7. Phase 3 here (`DeleteAccountButton.hook.test.ts`, `.test.tsx`, `.preview.tsx`,
   `src/testbed/registry.ts`, `src/modules/session/index.ts`, `structure-and-state.md`,
   `systems-and-visuals.md`) must be split, e.g. move the two docs-sync files into their own
   Phase 4 (docs-sync is already a single mandatory agent, moving it out doesn't change who does the
   work), or move `src/modules/session/index.ts` and `src/testbed/registry.ts` wiring into the end
   of Phase 2. `progress.md`'s Phase 6 block mirrors this 7-file phase and will need the same split
   once this plan changes.

2. **Non-blocking, recommend fixing before implementation — `usernames/{username}` delete rule
   guard style inconsistency.** The Contracts block's new line 53 is:
   ```
   allow delete: if resource.data.get('authUid', null) == null ||
     resource.data.get('authUid', null) == request.auth.uid;
   ```
   Unlike the sibling `accounts/{authUid}` delete rule two lines later (and the file's own `create`
   rule, which deliberately checks `request.auth != null` before any `request.auth.uid` comparison
   in an `||` branch), this expression evaluates `request.auth.uid` on an unauthenticated request
   (`request.auth == null`) whenever `authUid` is non-null — e.g. a signed-out client attempting to
   delete someone else's account-bound reservation. Firestore's documented fail-closed behavior
   (an error during rule evaluation denies the request) makes this safe in practice, and the test
   plan's "unauthenticated cannot delete either" case (Test plan, tester-a) will catch a regression
   either way — but it's inconsistent with the rest of this file's explicit-guard convention. Fix:
   `resource.data.get('authUid', null) == null || (request.auth != null && resource.data.get('authUid', null) == request.auth.uid);`
   matching the `accounts` rule's shape.

3. **Trivial, fold in** — two citations drifted by a few lines: `AlertDialogAction` is at
   `src/components/ui/alert-dialog.tsx:101-111`, not `94-105`; `RESTRICTED_IMPORTS`/`max-lines` are
   at `eslint.config.mjs:42-53` and `:70` respectively, not a single `39-55` span. Content of both
   citations is otherwise accurate — no design change needed, just correct the line numbers next
   time the plan is touched.

VERDICT: CHANGES REQUESTED

### Revision (architect-a)

All four findings addressed:
1. Phase 3 (7 files) split into Phase 3 (5: hook test, view test, preview, registry, module index)
   and a new Phase 4 (2: the two docs-sync files). File plan, Phases narrative, and the phase-count
   summary line updated accordingly (now 18 files across 4 phases: 5 / 6 / 5 / 2).
2. `usernames/{username}` delete rule's Contracts block now reads
   `allow delete: if resource.data.get('authUid', null) == null || (request.auth != null && resource.data.get('authUid', null) == request.auth.uid);`
   — matches the `accounts/{authUid}` rule's and the file's create-rule's explicit-guard style.
3. Citations corrected and re-verified this session: `AlertDialogAction` at
   `src/components/ui/alert-dialog.tsx:101-111` (`grep -n "AlertDialogAction"` confirms the
   `forwardRef` starts at 101, `displayName` at 111); `RESTRICTED_IMPORTS` at
   `eslint.config.mjs:42-53`, `max-lines` at `:70` (both confirmed by `grep -n` and `sed -n`).
4. Goal/acceptance-criteria and Risks sections now state plainly that this environment has neither
   Java nor the `firebase` CLI (`java -version` → "Unable to locate a Java Runtime"; `which firebase`
   → not found, both re-run this session, matching architect-b's own finding), so
   `npm run test:rules` cannot run here, the Phase 1 rule change is unverified by this pipeline, and
   it must be run before the rule change is deployed. No step or test-plan entry claims the rule
   change as tested.

`progress.md` updated to match: Phase 6 now covers only Phase 3's 5 files (tests, preview, wiring);
a new Phase 7 covers Phase 4's 2 docs files; header's phase count updated to 7.

### Re-review (architect-b)

All four fixes verified this session:
1. **Phase sizes**: File plan now has Phase 1 (5), Phase 2 (6), Phase 3 (5), Phase 4 (2) — every
   phase ≤6 files, matching the summary line "18 files across 4 phases (5 / 6 / 5 / 2)".
2. **`usernames/{username}` delete rule guard**: Contracts block (line 168-169) reads
   `allow delete: if resource.data.get('authUid', null) == null || (request.auth != null && resource.data.get('authUid', null) == request.auth.uid);`
   — `request.auth != null` now guards `request.auth.uid`, matching the sibling `accounts/{authUid}`
   rule and the file's create-rule convention.
3. **Citations re-verified by grep this session**:
   - `src/components/ui/alert-dialog.tsx:101` → `const AlertDialogAction = React.forwardRef<`,
     `:111` → `AlertDialogAction.displayName = ...` — matches "101-111" exactly.
   - `eslint.config.mjs:42` → `const RESTRICTED_IMPORTS = {`, `:53` → closing `};` — matches "42-53".
   - `eslint.config.mjs:70` → `'max-lines': ['error', { max: 150, ... }],` — matches ":70".
4. **`npm run test:rules` not-run statement**: Goal/acceptance-criteria block states plainly that
   this environment has neither Java nor the `firebase` CLI, `npm run test:rules` cannot be run here,
   and the Phase 1 rule change "is therefore not verified by this plan or by architect-b's review."
   The Risks section repeats this and instructs recording it in `progress.md` and not marking the
   rule change as tested until a session with Java 21 confirms it passes. `progress.md`'s Phase 4
   block (checks line) already reflects this.

No new issues found. Plan is internally consistent, scoped, and honest about its one unverifiable
piece (the Firestore rules test).

VERDICT: APPROVED
