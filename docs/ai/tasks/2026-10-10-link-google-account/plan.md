# Plan: Link Google account from guest, add Google logo to sign-in buttons

Status: APPROVED
Inputs: triage.md, ui-design.md (Final spec)

Revision note: Phase 1 was already APPROVED and built/committed under the previous version of
this plan. This revision only adds `firestore.rules` + `firestore.rules.test.ts` to Phase 2, in
response to a BLOCKER raised during Phase 2's docs-sync (see Decisions, "Firestore rules"). Phase
1's code is untouched and correct as committed; only Phase 2 needs re-approval before continuing.

## Goal and acceptance criteria
(Verbatim from `ui-design.md` Final spec "Acceptance criteria"; copied here so builders don't
need to re-open that file to know what "done" means.)
- [ ] At 1280×720, with a guest (anonymous) account, the Lobby header shows, left to right: commander info, "Link Google Account" button (outline, Google "G" icon + text), "Logout" button.
- [ ] At 1280×720, with a non-guest (already-linked) account, the Lobby header shows only commander info and "Logout" — no "Link Google Account" button present in the DOM.
- [ ] At 390×844, with a guest account, the header shows the icon-only Google-link button (no visible text) sized at least 44×44 px, next to "Logout"; the row does not overflow the viewport width or force horizontal scrolling.
- [ ] Clicking "Link Google Account" disables the button and shows a spinner (desktop label reads "Linking…") until the popup flow resolves.
- [ ] Simulating a `credential-already-in-use` rejection shows an `AlertDialog` titled "Account Already Linked" with the specified body text; clicking "OK" closes it and the button returns to its default enabled state.
- [ ] Simulating any other rejection shows an `AlertDialog` titled "Linking Failed" with the specified body text.
- [ ] Simulating a resolved link call (guest flips to non-guest) removes the button from the header with no dialog or toast shown, and the player's chosen username is still shown (not lost).
- [ ] The existing Login page's "Sign in with Google" button (guest mode) renders the `GoogleIcon` immediately to the left of the "Sign in with Google" text, both at 1280×720 and 390×844.
- [ ] Keyboard-only: both the Login Google button and the Lobby Link-Google button are reachable via Tab and show a visible focus ring; Enter/Space activates them.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `firebaseConfig`/exports | `src/lib/firebase.ts:58-79` | Only `GoogleAuthProvider`, `signInWithPopup`, `signInAnonymously`, `signOut`, `onAuthStateChanged` + Firestore fns are exported today; `linkWithPopup` is missing and must be added. |
| `AuthAccount`, `signInWithGoogle`, `toAuthAccount` | `src/modules/session/services/account.service.ts:15-30` | Pattern to copy for the new `linkGoogleAccount()`: same `toAuthAccount` mapper, same "throw on failure" contract. |
| `bindUsernameToAccount` | `src/modules/session/services/account.service.ts:65-70` | Already atomically writes `usernames/{name}` + `accounts/{uid}`; reused as-is (not reimplemented) to carry a guest's username into the account doc. |
| `claimAccountUsername` | `src/modules/session/services/account.service.ts:76-88` | Shows the existing swallow-to-boolean error pattern; deliberately NOT reused for linking because the Lobby button needs the raw Firebase error code to choose between two dialogs. |
| `usePlayerProvider`, `account`, `playerId`, `isGuest`, `username` | `src/modules/session/player.hook.ts:15-21` | `isGuest = !isAuthLoading && account !== null && account.isAnonymous`; `playerId = account.uid`. Both reused unchanged to gate the button and to know whose username to carry over. |
| `signInWithGoogle` callback | `src/modules/session/player.hook.ts:97-110` | Pattern to copy for `linkWithGoogle`: import-aliases the service fn, calls it, lets the hook return it under the "public" name. |
| `reserveUsername` doc shape | `src/modules/session/services/player-session.service.ts:13-16` | `usernames/{name}` is written as `{ playerId: uid, authUid: null }` for a guest — confirms the guest's reservation is keyed by the *same* uid that linking keeps, and lives only in `usernames/`, never in `accounts/`. |
| Non-anonymous branch of the auth listener | `src/modules/session/player.hook.ts:73-75` | `restoreAccountUsername` reads only `accounts/{uid}`, never `usernames/`. A freshly-linked guest's `accounts/{uid}` doc does not exist yet, so without a fix the username would read back as `null` right after linking — see Decisions. |
| `'ignores a guest username in localStorage while an account is signed in'` test | `src/modules/session/player.hook.test.ts:493-502` | Deliberately asserts the non-anonymous branch must NOT fall back to `localStorage`/`usernames/` for an unrelated new sign-in. Any fix for the linking case must not touch this branch or it breaks this test. |
| `PlayerContextType` | `src/modules/session/player.types.ts:1-12` | Adding a required field here means every object literal implementing it elsewhere must be updated in the same phase (see `player.provider.test.tsx`). |
| `mockContextValue` literals | `src/modules/session/player.provider.test.tsx:32-40,55-63,88-96` | Three places construct a full `PlayerContextType` literal; all three break at typecheck once a new required field is added, must be edited in Phase 1. |
| `LoginView`, `styles.googleButton` | `src/modules/session/components/Login/Login.tsx:66-74`, `Login.styles.ts:18` | Exact button to add the icon to; button is `Button variant="outline"` with text-only children today, no `gap` class yet. |
| `Login.test.tsx` button query | `src/modules/session/components/Login/Login.test.tsx:70,87,95` | Queries `getByRole('button', { name: 'Sign in with Google' })` — accessible name is computed from visible text only; an `aria-hidden` icon added before the text does not change it, so these three assertions keep passing unmodified. |
| `RejoinMatchPanel` (no `.hook.ts`) | `src/modules/lobby/components/RejoinMatchPanel/RejoinMatchPanel.tsx:1-20`, `.types.ts` | Precedent: a child rendered inside `LobbyView` is pure, fully prop-driven, with its hook (if any) owned and called by the *parent's* hook — not by a connected wrapper of its own. Followed for `LinkGoogleAccountButtonView`. |
| `LobbyView`, `styles.headerRight`, `playerInfo`/`Logout` block | `src/modules/lobby/components/Lobby/Lobby.tsx:39-47`, `Lobby.styles.ts:14` | Exact insertion point: between `playerInfo` and the `Logout` `Button`. `headerRight` is `'flex items-center gap-3 self-end sm:self-center'` — needs `flex-wrap justify-end` added per spec. |
| `LobbyViewModel`, `useLobby` | `src/modules/lobby/components/Lobby/Lobby.types.ts:7-28`, `Lobby.hook.ts:16-23,150-165` | `useLobby` already calls `usePlayer()` for `playerId, username, logout`; `isGuest` is already exposed by `usePlayer()` (`player.types.ts:5`) and just needs destructuring + forwarding, no new provider field. |
| `Lobby.hook.test.ts` `jest.mock('@/modules/session')` | `src/modules/lobby/components/Lobby/Lobby.hook.test.ts:9,55-59` | Auto-mocked whole module; `mockUsePlayer.mockReturnValue({...})` must gain `isGuest`, and the new `useLinkGoogleAccountButton` export must be mocked too since `Lobby.hook.ts` will call it. |
| `Lobby.fixtures.ts` `baseViewModel` | `src/modules/lobby/components/Lobby/Lobby.fixtures.ts:26-40` | Every existing fixture spreads this object; adding required `LobbyViewModel` fields here keeps all current fixtures (and the tests/preview built on them) compiling without per-fixture edits. |
| `firebase/auth` SDK internals (`_updateTokensIfNecessary`, `_notifyListenersIfCurrent`) | `node_modules/firebase/node_modules/@firebase/auth/dist/browser-cjs/index-d8380d90.js:1819-1832,5561-5562` | Confirms `onAuthStateChanged` listeners fire *inside* the awaited chain of `linkWithPopup`/`UserCredentialImpl._forOperation`, i.e. before our code resumes after `await linkGoogleAccount()`. A write that only happens after that `await` races the listener's own Firestore read and can lose — see Decisions. |
| `eslint.config.mjs` restricted imports | `eslint.config.mjs:43,47` | `@/lib/firebase`/`firebase/*` importable only from `*.service.ts`; `@/features/*` only from `*.hook.ts`. Confirms `linkGoogleAccount()` must live in `account.service.ts`, not in `player.hook.ts` or the button's hook. |
| `src/testbed/registry.ts` | `src/testbed/registry.ts:1-85` | Flat array of `ComponentPreview`; new previews are one import + one array entry each. |
| `usernames/{username}` update rule | `firestore.rules:25-30` | Requires BOTH `resource.data.get('authUid', null) == null` AND `request.resource.data.get('authUid', null) == null` — only allows guest-to-guest reservation updates. `bindUsernameToAccount`'s pre-popup write (`batch.set` on an *existing* guest doc, i.e. an update) sets `authUid` to a non-null value, so it is rejected by this rule as written: `permission-denied`, in production, not caught by unit tests (which mock Firestore). |
| `usernames/{username}` create rule | `firestore.rules:13-18` | The "pick once, keep forever" guard (`!exists(accounts/{uid})`) already exists for brand-new reservations; the new update-rule clause mirrors it rather than inventing a new invariant. |
| `'should reject promoting a guest reservation to an account binding, even by its owner'` | `firestore.rules.test.ts:176-184` | This is exactly the write `linkWithGoogle`'s pre-popup bind performs (same uid, same playerId, guest → account). Must flip from "reject" to "allow" — it was written before this feature existed and is now describing behavior the feature requires. |
| `'should reject binding a name that a guest currently holds, leaving no accounts doc behind'` | `firestore.rules.test.ts:278-292` | Confirms the *different-uid* theft case (an account trying to take over a DIFFERENT guest's still-active reservation) must stay rejected — the new rule clause's `resource.data.playerId == request.auth.uid` check preserves this untouched. |
| `claimAccountUsername` | `src/modules/session/services/account.service.ts:91-101` | The other caller of `bindUsernameToAccount`; reviewed to confirm the new rule clause can't be reached by it for a different uid (its own `findUsernameOwner` ownership check in app code already blocks that before any Firestore write is attempted), so no new abuse surface beyond the linking flow. |

## Decisions
- New service fn `linkGoogleAccount()` throws the raw Firebase error untouched (not swallowed to `boolean`, unlike `signInWithGoogle`), because `LinkGoogleAccountButton.hook.ts` must distinguish `auth/credential-already-in-use` from every other failure to pick the right dialog. Rejected: mirroring `signInWithGoogle`'s swallow-to-boolean (loses the error code the UI spec requires).
- `PlayerContextType.linkWithGoogle` also rejects (does not catch to `boolean`), for the same reason — the button's hook, not `player.hook.ts`, decides which dialog to show. Rejected: resolving a boolean (would force a single generic error message, failing the "Account Already Linked" vs "Linking Failed" acceptance criteria).
- Username continuity: before calling the service, `player.hook.ts`'s `linkWithGoogle` calls the already-exported `bindUsernameToAccount(username, playerId)` (writes `accounts/{uid}` from the guest's existing `usernames/{name}` reservation) **before** opening the Google popup, not after it resolves. Because the SDK fires `onAuthStateChanged` (whose non-anonymous branch reads only `accounts/{uid}`) from inside the awaited chain of `linkWithPopup` itself (see Verified context, firebase internals), writing after `await linkGoogleAccount()` races that listener's read and can lose, leaving the username blank right after linking. Writing first removes the race entirely. Rejected: writing after the popup resolves (loses the race, confirmed by reading the SDK source — not a theoretical risk); rejected: making the auth listener's non-anonymous branch fall back to `localStorage`/`usernames/` (breaks the existing, deliberate test `'ignores a guest username in localStorage while an account is signed in'`, `player.hook.test.ts:493-502`, which exists precisely to stop an unrelated new Google sign-in from inheriting a stale guest name).
- `bindUsernameToAccount` runs unconditionally on every click (before the popup, success or not): it is idempotent (same uid, same name, already the owner) and harmless if the user then cancels the popup — the guest keeps playing exactly as before, just with `accounts/{uid}` now also pointing at their name. Rejected: gating the write on link success (reintroduces the race above).
- No connected top-level `LinkGoogleAccountButton` component. Per `component-architecture`'s "pure view, connected component" split, the connected wrapper exists so "the app renders this one" — but here `Lobby.hook.ts` composes `useLinkGoogleAccountButton()` itself (same precedent as `RejoinMatchPanel`, a pure child driven entirely by its parent's hook) and `LobbyView` renders `LinkGoogleAccountButtonView` directly with those props. This keeps `LobbyView`, its tests and its preview provider-free (no `PlayerProvider` needed to render a guest-mode state), consistent with how `Lobby.test.tsx`/`Lobby.preview.tsx` work today. A connected wrapper nothing renders would be a speculative/unused export (`kiss-dry-solid` checklist). `src/modules/session/index.ts` exports the view + the hook instead of a connected component.
- `GoogleIcon` is always internally `aria-hidden="true"` (no prop to toggle it) — the UI spec's own accessibility section says it is `aria-hidden` in both places it's used (paired with visible text, or paired with the button's own `aria-label`), so a toggle prop would be dead code.
- Mobile icon-only collapse is two sibling `<Button>` elements (`hidden sm:inline-flex` for the desktop/labeled one, `sm:hidden` for the icon-only one), both wired to the same `onLink`/`isLinking` props — not a `useIsMobile()` JS check. Matches the codebase's existing CSS-only responsive convention (`Lobby.styles.ts:12` `headerBadge`, `:38` `roomsHint`, both `hidden sm:inline(-flex)`), avoids a hydration-mismatch class of bugs a JS viewport hook can introduce, and needs no new import.
- Icon-only mobile button is `size="icon"` (`src/components/ui/button.tsx:27`, `h-10 w-10` = 40×40) with an explicit `h-11 w-11` (44×44) override in `mobileButton`'s class string; `cn()` (`src/lib/utils.ts:5-7`, `clsx` + `twMerge`) dedupes the conflicting height/width utilities and keeps the later one, so the override reliably wins over the variant default.
- **Firestore rules (added in this revision):** loosen `usernames/{username}`'s `allow update` rule with a new OR'd clause that permits a one-time guest-to-account transition — current doc has no `authUid`, caller is authenticated as the exact `playerId` already on the doc (proves it's their own still-anonymous reservation, not someone else's — Google-account linking never changes the uid, so this is always true for a genuine link and never true for a different guest's reservation), the write keeps `playerId` the same and sets `authUid` to the caller's own uid, and the caller does not already own an `accounts/{uid}` doc (mirrors the create rule's "pick once" guard). Chosen over changing `bindUsernameToAccount`'s batch semantics (e.g. delete+recreate) because Phase 1 is already built and committed under the current `account.service.ts`/`player.hook.ts` contract; reopening that file now to change a shared function's write shape (also used by `claimAccountUsername`) risks a second regression for no benefit, when the rules-only fix requires zero application-code changes and is strictly additive (only loosens one previously-too-strict case, verified against every existing `firestore.rules.test.ts` case in Verified context). Rejected: Option 2 (delete+recreate in `bindUsernameToAccount`) — touches a function with a second caller (`claimAccountUsername`) for no reason once Option 1 is available and simpler.

## File plan
### Phase 1 — session auth logic (linking + username continuity)
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/lib/firebase.ts` | edit | Import and re-export `linkWithPopup` from `firebase/auth` | implementer-a |
| `src/modules/session/services/account.service.ts` | edit | Add `linkGoogleAccount(): Promise<AuthAccount>` | implementer-a |
| `src/modules/session/services/account.service.test.ts` | edit | Tests for `linkGoogleAccount` (popup call shape, success mapping, error passthrough incl. `credential-already-in-use`, no-currentUser guard) | tester-a |
| `src/modules/session/player.types.ts` | edit | Add `linkWithGoogle: () => Promise<void>` to `PlayerContextType` | implementer-a |
| `src/modules/session/player.hook.ts` | edit | Add `linkWithGoogle` callback: `bindUsernameToAccount` then `linkGoogleAccount()`, errors propagate | implementer-a |
| `src/modules/session/player.hook.test.ts` | edit | Tests: binds before opening the popup, in that order; propagates every error untouched (incl. `credential-already-in-use`); skips the bind when `username`/`playerId` is null | tester-a |
| `src/modules/session/player.provider.test.tsx` | edit | Add `linkWithGoogle: jest.fn()` to the three `PlayerContextType` literals | tester-a |

### Phase 2 — Google icon, Link button, Login/Lobby wiring, previews, docs
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `firestore.rules` | edit | Loosen `usernames/{username}`'s `allow update` rule to permit the one-time guest→account transition `bindUsernameToAccount`'s pre-popup bind performs (see Decisions) | implementer-a |
| `firestore.rules.test.ts` | edit | Flip `'should reject promoting a guest reservation to an account binding, even by its owner'` (`:176-184`) to assert it's now allowed; add a positive batch-level test matching `bindUsernameToAccount`'s actual write shape, and a negative test for "already owns an account" | tester-a |
| `src/modules/session/components/GoogleIcon/GoogleIcon.tsx` | new | Inline-SVG Google "G" mark, `aria-hidden="true"` always, `className` prop | implementer-b |
| `src/modules/session/components/GoogleIcon/index.ts` | new | Component-local public API | implementer-a |
| `src/modules/session/components/GoogleIcon/GoogleIcon.test.tsx` | new | Renders an `svg`; has no accessible name of its own (`aria-hidden`) | tester-b |
| `src/modules/session/components/GoogleIcon/GoogleIcon.preview.tsx` | new | One "Default" state | preview-a |
| `src/modules/session/components/LinkGoogleAccountButton/LinkGoogleAccountButton.types.ts` | new | `LinkGoogleAccountButtonErrorDialog`, `LinkGoogleAccountButtonViewProps` | implementer-a |
| `src/modules/session/components/LinkGoogleAccountButton/LinkGoogleAccountButton.hook.ts` | new | `useLinkGoogleAccountButton()`: loading + error-dialog state, calls `usePlayer().linkWithGoogle`, maps error code → dialog | implementer-a |
| `src/modules/session/components/LinkGoogleAccountButton/LinkGoogleAccountButton.fixtures.ts` | new | Idle, Linking, Already-linked-error, Generic-error props | implementer-a |
| `src/modules/session/components/LinkGoogleAccountButton/LinkGoogleAccountButton.hook.test.ts` | new | Tests the 3 outcomes (cancelled → silent, already-in-use → that dialog, other → generic dialog) + loading toggling | tester-a |
| `src/modules/session/components/LinkGoogleAccountButton/index.ts` | new | Exports `LinkGoogleAccountButtonView`, `useLinkGoogleAccountButton`, the props type | implementer-a |
| `src/modules/session/components/LinkGoogleAccountButton/LinkGoogleAccountButton.tsx` | new | Pure `LinkGoogleAccountButtonView`: desktop labeled button, mobile icon-only button, shared `AlertDialog` | implementer-b |
| `src/modules/session/components/LinkGoogleAccountButton/LinkGoogleAccountButton.styles.ts` | new | `desktopButton`, `mobileButton`, `icon`, `spinnerIcon`, `mobileIcon`, `mobileSpinnerIcon` | implementer-b |
| `src/modules/session/components/LinkGoogleAccountButton/LinkGoogleAccountButton.test.tsx` | new | Desktop/mobile markup present, label/aria-label text, click → `onLink`, dialog open/close wiring | tester-b |
| `src/modules/session/components/LinkGoogleAccountButton/LinkGoogleAccountButton.preview.tsx` | new | Idle, Linking, Error (Already Linked), Error (Generic) states | preview-a |
| `src/modules/session/index.ts` | edit | Export `LinkGoogleAccountButtonView`, `useLinkGoogleAccountButton`, `LinkGoogleAccountButtonViewProps` | implementer-a |
| `src/modules/session/components/Login/Login.tsx` | edit | Add `<GoogleIcon className="h-4 w-4" />` before the "Sign in with Google" text | implementer-b |
| `src/modules/session/components/Login/Login.styles.ts` | edit | Add `gap-2` to `styles.googleButton` | implementer-b |
| `src/modules/session/components/Login/Login.test.tsx` | edit | Add: the Google button contains an `svg` | tester-b |
| `src/modules/lobby/components/Lobby/Lobby.types.ts` | edit | Add `isGuest: boolean` and `linkGoogleAccountButton: LinkGoogleAccountButtonViewProps` to `LobbyViewModel` | implementer-a |
| `src/modules/lobby/components/Lobby/Lobby.hook.ts` | edit | Destructure `isGuest` from `usePlayer()`; call `useLinkGoogleAccountButton()`; forward both | implementer-a |
| `src/modules/lobby/components/Lobby/Lobby.hook.test.ts` | edit | Mock `isGuest` + `useLinkGoogleAccountButton` on `@/modules/session`; assert both are forwarded into the view model | tester-a |
| `src/modules/lobby/components/Lobby/Lobby.fixtures.ts` | edit | Add `isGuest: false` + idle `linkGoogleAccountButton` to `baseViewModel`; add a guest-mode fixture (`isGuest: true`) | implementer-a |
| `src/modules/lobby/components/Lobby/Lobby.tsx` | edit | Render `{model.isGuest && <LinkGoogleAccountButtonView {...model.linkGoogleAccountButton} />}` between `playerInfo` and `Logout` | implementer-b |
| `src/modules/lobby/components/Lobby/Lobby.styles.ts` | edit | Add `flex-wrap justify-end` to `styles.headerRight` | implementer-b |
| `src/modules/lobby/components/Lobby/Lobby.test.tsx` | edit | Guest fixture: link button present (desktop label + mobile aria-label both in the DOM, CSS hides one); non-guest fixture: absent from the DOM | tester-b |
| `src/modules/lobby/components/Lobby/Lobby.preview.tsx` | edit | Add a "Guest (can link)" state | preview-a |
| `src/testbed/registry.ts` | edit | Register `googleIconPreview`, `linkGoogleAccountButtonPreview` | preview-a |
| `docs/architecture/structure-and-state.md` | edit | §3.1: update bullet 5 (`:76-77`, currently says Google sign-in never links to the guest uid) to describe the new linking flow; add the username-continuity pre-bind and the `credential-already-in-use` handling | docs-sync (mandatory) |

## Contracts
```
// --- firestore.rules (edit) ---
// Replace the `usernames/{username}` `allow update` rule (currently lines 25-30) with:
      allow update: if
        (
          // Existing behavior, unchanged: a guest reservation may be re-saved with the same
          // playerId (reserveUsername's re-claim path).
          resource.data.get('authUid', null) == null &&
          request.resource.data.get('authUid', null) == null &&
          resource.data.playerId is string &&
          request.resource.data.playerId is string &&
          resource.data.playerId == request.resource.data.playerId
        ) ||
        (
          // New: linking. A guest may bind their own still-anonymous reservation to their own
          // account, once. `resource.data.playerId == request.auth.uid` proves the caller is the
          // exact uid the reservation was made under — Google-account linking never changes the
          // uid (account.service.ts's linkGoogleAccount) — so this can never hand a DIFFERENT
          // guest's still-active reservation to someone else. Mirrors the create rule's "pick
          // once, keep forever" guard above.
          resource.data.get('authUid', null) == null &&
          resource.data.playerId is string &&
          request.auth != null &&
          resource.data.playerId == request.auth.uid &&
          request.resource.data.playerId == request.auth.uid &&
          request.resource.data.authUid == request.auth.uid &&
          !exists(/databases/$(database)/documents/accounts/$(request.auth.uid))
        );
// No other change to firestore.rules: the create/delete rules on usernames/{username} and every
// rule on accounts/{authUid} and games/{gameId} are untouched.

// --- firestore.rules.test.ts (edit) ---
// 1. Rename and flip the existing test at :176-184 from reject to allow:
it('should allow linking a guest reservation to an account binding, by its own owner', async () => {
  const db = testEnv.authenticatedContext('player_5').firestore();
  await db.doc('usernames/promote_me').set({ playerId: 'player_5', authUid: null });

  await expect(
    db.doc('usernames/promote_me').update({ authUid: 'player_5' })
  ).resolves.toBeUndefined();
});
// 2. New test in the existing "Atomic bind: bindUsernameToAccount batch" describe block
//    (around :250-293), covering the actual production write shape (batch.set on a pre-existing
//    guest doc, not a bare .update()):
it('should allow linking a guest\'s own active reservation to their own account via batch', async () => {
  await seedWithRulesDisabled('usernames/alice_guest', { playerId: 'uid_alice', authUid: null });
  const db = testEnv.authenticatedContext('uid_alice').firestore();

  const batch = db.batch();
  batch.set(db.doc('usernames/alice_guest'), { playerId: 'uid_alice', authUid: 'uid_alice' });
  batch.set(db.doc('accounts/uid_alice'), { username: 'alice_guest' });

  await expect(batch.commit()).resolves.toBeUndefined();
  expect((await db.doc('accounts/uid_alice').get()).data()).toEqual({ username: 'alice_guest' });
});
// 3. New negative test, same describe block: a uid that already owns an account cannot use this
//    path to bind a second (still-guest) reservation to itself.
it('should reject linking a guest reservation for a uid that already owns an account', async () => {
  await seedWithRulesDisabled('accounts/uid_alice', { username: 'alice_first' });
  await seedWithRulesDisabled('usernames/alice_guest2', { playerId: 'uid_alice', authUid: null });
  const db = testEnv.authenticatedContext('uid_alice').firestore();

  await expect(
    db.doc('usernames/alice_guest2').update({ authUid: 'uid_alice' })
  ).rejects.toThrow();
});
// Every other existing test in this file (guest-to-guest update, cross-player theft, permanent
// binding immutability, legacy no-authUid-field docs, the two existing "Atomic bind" tests) keeps
// its current expectation unchanged — see Verified context for the per-test check against the
// new rule clause.
```

```ts
// --- src/lib/firebase.ts (edit) ---
// Add to the existing `firebase/auth` import block and export list, no other change:
import { /* existing names */, linkWithPopup } from 'firebase/auth';
export { /* existing names */, linkWithPopup };

// --- src/modules/session/services/account.service.ts (edit) ---
/**
 * Links the current anonymous guest's Firebase user to a Google account, keeping the same uid
 * (every doc already keyed by that uid stays valid, no migration). Throws the Firebase error
 * untouched on failure — e.g. code `auth/credential-already-in-use` when that Google account is
 * already linked to a different Firebase user, or `auth/popup-closed-by-user` /
 * `auth/cancelled-popup-request` when the user cancels — so callers can tell reasons apart.
 * Throws a plain `Error` if there is no signed-in session to link.
 */
export async function linkGoogleAccount(): Promise<AuthAccount>;
// Implementation: guard `if (!auth.currentUser) throw new Error('No active session to link.')`,
// then `const credential = await linkWithPopup(auth.currentUser, new GoogleAuthProvider());
// return toAuthAccount(credential.user);` — same `toAuthAccount` already defined in this file.

// --- src/modules/session/player.types.ts (edit) ---
export interface PlayerContextType {
  // ...existing fields unchanged...
  /**
   * Links the current guest session to a Google account, keeping the same uid. Rejects with the
   * original Firebase error (e.g. code `auth/credential-already-in-use`) on failure, so the
   * caller picks the right message instead of one generic one.
   */
  linkWithGoogle: () => Promise<void>;
}

// --- src/modules/session/player.hook.ts (edit) ---
// Add to the existing `./services/account.service` import:
//   linkGoogleAccount as linkGoogleAccountOnFirebase, bindUsernameToAccount
// New callback, added alongside the existing `signInWithGoogle` callback:
const linkWithGoogle = useCallback(async (): Promise<void> => {
  // The guest's `usernames/{username}` reservation already points at this uid. Bind it into
  // `accounts/{uid}` BEFORE opening the popup: the account-lookup branch of the auth listener
  // above (`player.hook.ts:73-75`) reads only `accounts/`, and Firebase fires that listener from
  // inside `linkWithPopup`'s own awaited chain — before this function's `await` below resumes —
  // so writing after the popup resolves races that listener's read and can lose the username.
  if (username && playerId) {
    await bindUsernameToAccount(username, playerId);
  }
  await linkGoogleAccountOnFirebase();
}, [username, playerId]);
// Returned object gains `linkWithGoogle` alongside the existing fields.

// --- src/modules/session/components/LinkGoogleAccountButton/LinkGoogleAccountButton.types.ts (new) ---
export type LinkGoogleAccountButtonErrorDialog = {
  open: boolean;
  title: string;
  description: string;
};

export type LinkGoogleAccountButtonViewProps = {
  isLinking: boolean;
  errorDialog: LinkGoogleAccountButtonErrorDialog;
  onLink: () => void;
  onErrorDialogOpenChange: (open: boolean) => void;
};

// --- src/modules/session/components/LinkGoogleAccountButton/LinkGoogleAccountButton.hook.ts (new) ---
// Reads `usePlayer()` from '../../player.provider' (relative import, matches Login.hook.ts:2).
// Dialog copy verbatim from ui-design.md "Copy":
//   ALREADY_LINKED: title "Account Already Linked", description "This Google account is already
//     linked to a different Corner Conquest profile. Sign out and sign in with that Google
//     account instead, or link a different one."
//   LINK_FAILED: title "Linking Failed", description "Could not link your Google account.
//     Please try again."
// Error-code helpers read `(error as { code?: string })?.code` on an `unknown` catch binding —
// never import a Firebase type here (this file is not a `.service.ts`; `eslint.config.mjs:43`
// bans `firebase/*` imports outside `.service.ts`).
//   isCredentialAlreadyInUse(error): code === 'auth/credential-already-in-use'
//   isCancelledPopup(error): code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request'
// onLink(): setIsLinking(true); try { await linkWithGoogle() } catch (error) { if
//   (!isCancelledPopup(error)) setErrorDialog(isCredentialAlreadyInUse(error) ? ALREADY_LINKED :
//   LINK_FAILED) } finally { setIsLinking(false) }
export function useLinkGoogleAccountButton(): LinkGoogleAccountButtonViewProps;

// --- src/modules/session/components/LinkGoogleAccountButton/LinkGoogleAccountButton.tsx (new) ---
// Pure view only — no connected wrapper (see Decisions). `../GoogleIcon` relative import.
export function LinkGoogleAccountButtonView(props: LinkGoogleAccountButtonViewProps): JSX.Element;
// Renders, in order: a `Button variant="outline" size="sm"` with class `styles.desktopButton`
// ('hidden sm:inline-flex ...'), icon/spinner + "Link Google Account"/"Linking…" text; a second
// `Button variant="outline" size="icon"` with class `styles.mobileButton` ('sm:hidden ...'),
// `aria-label="Link your Google account"`, icon/spinner only; then one shared `AlertDialog` (same
// `AlertDialog*` composition as `Login.tsx:115-125`) using `errorDialog`/`onErrorDialogOpenChange`.
// Both buttons share `onClick={onLink}` and `disabled={isLinking}`.

// --- src/modules/session/components/GoogleIcon/GoogleIcon.tsx (new) ---
export type GoogleIconProps = { className?: string };
export function GoogleIcon(props: GoogleIconProps): JSX.Element;
// `<svg viewBox="0 0 18 18" className={className} aria-hidden="true">` with the four official
// Google "G" brand-color paths (#4285F4 blue, #34A853 green, #FBBC05 yellow, #EA4335 red).
// The exact path `d` data is NOT verified in this plan (no official SVG asset exists in this
// repo to copy from, per triage) — implementer-b must source the real official Google "G" path
// data (e.g. from Google's published brand SVG) rather than inventing coordinates, and preview-a
// must confirm with a screenshot that it renders as a recognizable four-color "G", not a blob.

// --- src/modules/lobby/components/Lobby/Lobby.types.ts (edit) ---
import type { LinkGoogleAccountButtonViewProps } from '@/modules/session';
export type LobbyViewModel = {
  // ...existing fields unchanged...
  isGuest: boolean;
  linkGoogleAccountButton: LinkGoogleAccountButtonViewProps;
};

// --- src/modules/lobby/components/Lobby/Lobby.hook.ts (edit) ---
import { usePlayer, useLinkGoogleAccountButton } from '@/modules/session';
// Inside useLobby():
const { playerId, username, isGuest, logout } = usePlayer();
const linkGoogleAccountButton = useLinkGoogleAccountButton();
// ...returned object gains `isGuest` and `linkGoogleAccountButton` alongside existing fields.

// --- src/modules/lobby/components/Lobby/Lobby.tsx (edit) ---
import { LinkGoogleAccountButtonView } from '@/modules/session';
// Inside styles.headerRight, between the playerInfo div and the Logout Button:
{model.isGuest && <LinkGoogleAccountButtonView {...model.linkGoogleAccountButton} />}
```

## Phases
### Phase 1: Session auth — link a guest to Google, keep the username
1. `src/lib/firebase.ts`: add `linkWithPopup` import + export. (implementer-a, **sonnet**)
2. `src/modules/session/services/account.service.ts`: add `linkGoogleAccount()` per Contracts. (implementer-a, **sonnet**)
3. `src/modules/session/services/account.service.test.ts`: cover success (calls `linkWithPopup(auth.currentUser, <GoogleAuthProvider instance>)`, maps `credential.user` via the existing `toAuthAccount`), the no-`currentUser` guard, and that any rejection (incl. `credential-already-in-use`) propagates untouched. (tester-a, **sonnet**)
4. `src/modules/session/player.types.ts`: add `linkWithGoogle` to `PlayerContextType`. (implementer-a, **sonnet**)
5. `src/modules/session/player.hook.ts`: add the `linkWithGoogle` callback per Contracts (pre-bind, then link, let errors propagate); add it to the returned object. (implementer-a, **sonnet**)
6. `src/modules/session/player.hook.test.ts`: assert bind-before-link ordering, that the bind is skipped when `username` or `playerId` is null, and that every error (popup-closed, cancelled-request, credential-already-in-use, generic) rejects the returned promise unchanged. (tester-a, **sonnet**)
7. `src/modules/session/player.provider.test.tsx`: add `linkWithGoogle: jest.fn()` to the three `PlayerContextType` literals so the file still typechecks. (tester-a, **sonnet**)
8. Run `npm run typecheck`, `npm run lint`, `npx jest src/modules/session` for this phase's files; fix until clean.
9. Commit: `feat(session): link a guest's Google account, keeping their uid and username [phase 1/2]`.
10. Stop; ask the user to type `continue`.

Model escalation: steps 1-7 (service/hook layer — Firebase Auth error-code handling, the write-before-popup ordering fix) per triage's `implementer-a=sonnet, tester-a=sonnet` override.

### Phase 2: Google icon, Link button, Login/Lobby wiring, previews, docs
1. `firestore.rules`: loosen the `usernames/{username}` update rule per Contracts, so `linkWithGoogle`'s pre-popup `bindUsernameToAccount` write (built in Phase 1, already committed) actually succeeds in production. (implementer-a, **sonnet**)
2. `firestore.rules.test.ts`: flip the one existing test, add the two new ones, per Contracts. (tester-a, **sonnet**)
3. Run `npm run test:rules` (starts the Firestore emulator; needs Java 21 per `CLAUDE.md`'s commands table) and confirm every case in Verified context, not just the new ones, still passes.
4. `GoogleIcon` (`.tsx`, `index.ts`, `.test.tsx`, `.preview.tsx`) per Contracts. (implementer-b, implementer-a, tester-b, preview-a)
5. `LinkGoogleAccountButton` logic files (`.types.ts`, `.hook.ts`, `.fixtures.ts`, `.hook.test.ts`, `index.ts`) per Contracts. (implementer-a, tester-a)
6. `LinkGoogleAccountButton` view files (`.tsx`, `.styles.ts`, `.test.tsx`, `.preview.tsx`) per Contracts and the ui-design tokens/copy. (implementer-b, tester-b, preview-a)
7. `src/modules/session/index.ts`: export the new view + hook + props type. (implementer-a)
8. `Login.tsx` + `Login.styles.ts`: add the icon and `gap-2`; `Login.test.tsx`: add the svg-presence assertion. (implementer-b, tester-b)
9. `Lobby.types.ts`, `Lobby.hook.ts`, `Lobby.fixtures.ts`: add `isGuest`/`linkGoogleAccountButton`; `Lobby.hook.test.ts`: mock and assert them. (implementer-a, tester-a)
10. `Lobby.tsx` + `Lobby.styles.ts`: render the button, add `flex-wrap justify-end`; `Lobby.test.tsx`: guest-present / non-guest-absent assertions; `Lobby.preview.tsx`: add the guest state. (implementer-b, tester-b, preview-a)
11. `src/testbed/registry.ts`: register the two new previews. (preview-a)
12. `docs/architecture/structure-and-state.md` §3.1: update per the File plan row, and mention the rules change (guest reservations may now transition to an account binding once, via linking). (docs-sync, mandatory)
13. Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`; fix until clean.
14. `ui-verify` on the testbed: Login (both breakpoints), the new `LinkGoogleAccountButton` preview (all 4 states), the Lobby "Guest (can link)" state at 1280×720 and 390×844 — confirm no horizontal scroll and a ≥44×44 px mobile touch target.
15. Commit: `feat(session,lobby): add Google logo to sign-in buttons, link-account button in the lobby [phase 2/2]`.

Model escalation: steps 1-2 (`firestore.rules`/`.test.ts` — security-rule logic, same sonnet-worthy class of risk as Phase 1) per the same reasoning as triage's `implementer-a=sonnet, tester-a=sonnet` override. The rest of Phase 2 stays on haiku — mechanical view wiring.

## Test plan
- tester-a (logic, first):
  - `firestore.rules.test.ts`: the flipped test (guest promotes their own reservation, allowed), the new positive batch test (matches `bindUsernameToAccount`'s actual write shape), the new negative test (already owns an account), and a re-run of every pre-existing case in that file (guest-to-guest update, cross-player theft rejected, permanent-binding immutability, legacy no-`authUid`-field docs, the two original "Atomic bind" tests) to confirm none regressed. Requires `npm run test:rules` (Firestore emulator, Java 21) — not part of the default `npm test` run, so this must be run explicitly and its summary line quoted.
  - `account.service.test.ts`: `linkGoogleAccount()` calls `linkWithPopup` with `auth.currentUser` and a `GoogleAuthProvider` instance; resolves to `{ uid, displayName, isAnonymous }` from `credential.user`; throws `'No active session to link.'` when `auth.currentUser` is null; rejects with the original error (incl. a `{ code: 'auth/credential-already-in-use' }`-shaped error) without wrapping it.
  - `player.hook.test.ts`: `linkWithGoogle()` calls `bindUsernameToAccount(username, playerId)` before `linkGoogleAccount()` (assert call order); skips the bind when `username` is null or `playerId` is null; propagates a rejection from either call untouched (test at least one `credential-already-in-use`-shaped rejection end to end).
  - `LinkGoogleAccountButton.hook.test.ts`: idle → click → `isLinking` true during the pending promise, false after; a `popup-closed-by-user`/`cancelled-popup-request` rejection leaves `errorDialog.open` false (silent); a `credential-already-in-use` rejection opens the dialog titled "Account Already Linked" with the exact body text from ui-design.md; any other rejection opens "Linking Failed" with its exact body text; `onErrorDialogOpenChange(false)` closes whichever dialog is open.
  - `Lobby.hook.test.ts`: `isGuest` from `usePlayer()` is forwarded into the view model unchanged (true and false cases); `useLinkGoogleAccountButton()`'s return value is forwarded under `linkGoogleAccountButton` unchanged.
- tester-b (view and e2e):
  - `GoogleIcon.test.tsx`: renders an `svg`; has no independent accessible name (no `role="img"`/`aria-label`, consistent with always-`aria-hidden`).
  - `LinkGoogleAccountButton.test.tsx`: both the desktop-labeled and mobile icon-only buttons are in the DOM (CSS, not JS, hides one — don't assert visibility, assert presence/text/aria-label); clicking either calls `onLink`; `isLinking` true shows the "Linking…" label (desktop) and disables both buttons; the error dialog renders `errorDialog.title`/`errorDialog.description` when `open` is true and nothing when false; clicking "OK" calls `onErrorDialogOpenChange(false)`.
  - `Login.test.tsx`: the "Sign in with Google" button contains an `svg` (the existing `getByRole('button', { name: 'Sign in with Google' })` queries are unaffected, per Verified context).
  - `Lobby.test.tsx`: guest fixture (`isGuest: true`) — the link button's desktop label "Link Google Account" and its mobile `aria-label="Link your Google account"` button are both present in the DOM; non-guest fixture (`isGuest: false`, the existing `emptyLobby`/etc.) — `screen.queryByRole('button', { name: /link google account/i })` and `queryByLabelText(/link your google account/i)` are both null.
  - e2e: none added — triage scoped this to unit/view tests; no existing e2e spec exercises Google sign-in (it requires the Auth emulator's popup flow, out of scope per triage's "Out" list not mentioning e2e).

## Preview states
- `GoogleIcon` (`session-google-icon`, group Session): Default — the bare icon at its natural size.
- `LinkGoogleAccountButton` (`session-link-google-account-button`, group Session): Idle, Linking, Error (Already Linked) — dialog open showing that copy, Error (Generic Failure) — dialog open showing that copy.
- `Lobby` (`lobby-main`, group Lobby): existing Loading/Empty/With-open-games states unchanged, plus a new "Guest (can link)" state (`isGuest: true`, idle `linkGoogleAccountButton`) to check placement and the 44×44 mobile target via the browser's responsive view.

## Risks
- The `GoogleIcon` SVG path data is unverified (no existing asset to copy, per triage) — mitigated by flagging it explicitly in Contracts and requiring a ui-verify screenshot before Phase 2 is called done, not just a DOM presence check.
- Firebase Auth's exact listener-ordering behavior was read from the installed SDK's bundled source (`node_modules/firebase/node_modules/@firebase/auth/dist/browser-cjs/index-d8380d90.js`) rather than official docs, to justify the bind-before-popup ordering decision; if a future SDK upgrade changes that internal ordering, the mitigation (writing before the popup, not after) remains correct regardless, since it no longer depends on winning any race.
- `bindUsernameToAccount` runs on every click including a cancelled popup; this is a small extra Firestore write with no functional downside (see Decisions), but it does mean a guest who clicks the button and cancels repeatedly performs repeated no-op writes. Not worth guarding given KISS; flagging so a future reviewer doesn't mistake it for a bug.
- `npm run test:rules` requires the Firestore emulator and Java 21 (`CLAUDE.md`'s commands table); if that isn't available in the environment running Phase 2, the rules change can't be verified by its own test suite before commit — `npm run typecheck`/`lint`/`test`/`build` do not exercise `firestore.rules` at all. Mitigation: the Contracts block's rule diff was hand-traced against every existing test case in `firestore.rules.test.ts` in this revision (see Verified context), so a reviewer without the emulator can still verify correctness by re-reading that trace against the diff.

## Review (architect-b)
VERDICT: APPROVED (both the original pass and this revision's delta)

Revision delta re-reviewed (`firestore.rules`, `firestore.rules.test.ts`, the new Decisions/Verified-context/Contracts rows, Phase 2 steps 1-3, the new Test plan row, the new Risk):
- Read `firestore.rules:25-30` directly: the existing `usernames/{username}` update rule requires both `resource.data.get('authUid', null) == null` AND `request.resource.data.get('authUid', null) == null`. `bindUsernameToAccount`'s pre-popup write sets `authUid` to the caller's uid (non-null) on an *existing* guest doc, so `request.resource.data.get('authUid', null) == null` is false and the write is rejected in production. The BLOCKER is real, not a false alarm — confirmed independently, not just taken on the docs-sync agent's word.
- Hand-traced the new OR'd clause (plan's Contracts) against every existing test in `firestore.rules.test.ts`'s `usernames` describe blocks (verified each cited line number is real: `:142` same-playerId update still allowed by the *first*, unchanged clause; `:155` cross-player playerId steal still rejected — fails both clauses, the second because `request.auth` is null in that unauthenticated test; `:167` nonexistent doc still rejected; `:186` permanent-binding update by its own owner still rejected — `resource.data.get('authUid', null) == null` is false since it's already `'uid_alice'`, so neither clause fires; `:202` legacy no-`authUid`-field doc still allowed by the unchanged first clause; `:296` and `:314` the two "cross-player attacks blocked" tests still rejected, same reasoning as `:155`). No existing case flips unintentionally; only the single targeted case (`:176-184`) and the two new tests change behavior.
- Verified `firestore.rules:10-18`'s create-rule "pick once, keep forever" guard is the real precedent the new update clause mirrors (`!exists(accounts/{uid})`), not an invented analogy.
- Verified `package.json:14` — `test:rules` really does run `firebase emulators:exec --only firestore ... jest --config jest.rules.config.js`, confirming the plan's claim that it needs the emulator (Java 21) and is not part of plain `npm test`.
- Verified `seedWithRulesDisabled` (`firestore.rules.test.ts:27`) exists and is used exactly as the two new Contracts tests assume.
- Design judgment: tightening scope to a rules-only fix (reject touching `bindUsernameToAccount`'s write shape, which Phase 1 already committed and which `claimAccountUsername` also calls) is the smaller, correct change — reopening a shared, already-reviewed function for a problem that's purely a rules gap would be the wrong trade.
- No regression to Phase 1's already-approved and committed code; this delta is additive to Phase 2 only, as the revision note states.

Original pass's findings (unchanged, still apply):
- Verified every "Verified context" row against the actual files: `src/lib/firebase.ts:58-79` (no `linkWithPopup` export today), `account.service.ts:15-30,65-70,76-88`, `player.hook.ts:15-21,73-75,97-110`, `player.types.ts:1-12`, `player-session.service.ts:13-16`, `player.hook.test.ts:493-502` (`'ignores a guest username in localStorage while an account is signed in'`, confirmed it would break if the non-anonymous branch grew a `localStorage`/`usernames/` fallback), `player.provider.test.tsx` (3 `PlayerContextType` literals at lines 32-40/55-63/88-96, all missing `linkWithGoogle`), `Login.tsx:66-74`/`Login.styles.ts:18`, `Login.test.tsx:70,87,95` (accessible-name queries unaffected by a leading `aria-hidden` icon), `RejoinMatchPanel.tsx` (genuinely has no `.hook.ts`, single function, no `View`/connected split — correctly cited as the "pure child driven by the parent's hook" precedent), `Lobby.tsx:39-47`/`Lobby.styles.ts:14` (`headerRight` class verbatim), `Lobby.hook.ts`/`.types.ts`/`.fixtures.ts`/`.hook.test.ts` (all line citations correct, `isGuest` not yet destructured, `usePlayer()` mock at lines 55-59 needs it), `src/testbed/registry.ts` (flat array, confirmed insertion pattern), `eslint.config.mjs:43,47` (restricted-imports groups confirmed verbatim), `button.tsx:23-28` (`icon` size is `h-10 w-10`, confirms the plan's 44×44 override math and that `cn()`/`twMerge` will let the later class win).
- Verified the one claim resting on SDK internals rather than public docs: `_forOperation` (`node_modules/firebase/node_modules/@firebase/auth/dist/browser-cjs/index-d8380d90.js:5561-5562`) awaits `_updateTokensIfNecessary`, which calls `this.auth._notifyListenersIfCurrent(this)` at line 1831 — i.e. `onAuthStateChanged` fires before `_forOperation` returns the credential, which is before `linkWithPopup`'s own caller resumes after `await`. This genuinely supports the plan's "bind the username before opening the popup, not after" ordering decision; the plan isn't overclaiming here.
- Verified the Firebase error codes the hook keys off: `credential-already-in-use`, `popup-closed-by-user`, `cancelled-popup-request` all exist in the installed SDK (same file, lines 141/156/240/332/341/395), confirming the `isCredentialAlreadyInUse`/`isCancelledPopup` helpers in the Contracts reference real codes, not invented ones.
- Design: no connected `LinkGoogleAccountButton` wrapper is the right call — `RejoinMatchPanel` is real precedent for a parent-hook-driven child, and a wrapper nothing renders would itself be the dead code `kiss-dry-solid` flags. Mobile collapse via two sibling `<Button>`s toggled by `hidden sm:inline-flex` / `sm:hidden` matches the codebase's only existing responsive convention (`headerBadge`, `roomsHint`) instead of introducing a `useIsMobile()` branch — correct choice, avoids a hydration-mismatch class of bug.
- `LinkGoogleAccountButtonErrorDialog` (`{ open, title, description }`) is a deliberate, acceptable near-duplicate of `LoginErrorDialogState` (`Login.types.ts:6-10`) rather than an extracted shared type — reasonable at two call sites with different owners (two different components' local state), not worth a premature shared-types file.
- Old-path grep: this is a pure addition (no move/rename/delete), so the "re-run the old-path grep" check doesn't apply. Confirmed with `grep -rn 'GoogleIcon|LinkGoogleAccountButton|linkWithGoogle|linkGoogleAccount|linkWithPopup'` across the repo (outside `node_modules` and this task folder) that none of these symbols exist yet anywhere — no stale references to worry about, nothing to fix or leave.
- Minor, non-blocking: the acceptance criteria's "Keyboard-only: both buttons reachable via Tab and show a visible focus ring" is listed as a goal, but Phase 2's `ui-verify` step (plan line 245) doesn't call out a Tab/focus-ring screenshot explicitly, only the 4 button states and mobile overflow/touch-target. Both buttons are plain `Button` primitives with the project's unmodified default `focus-visible:ring-2` (never overridden here), so the risk of an actual failure is low, but the step should still be checked, not assumed. Fold in: when preview-a/architect-b run `ui-verify` in Phase 2, Tab to each new button and screenshot the focus ring alongside the other checks. Not worth re-opening the plan for — call it out to whoever runs Phase 2's `ui-verify` step.
