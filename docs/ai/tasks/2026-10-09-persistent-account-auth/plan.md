# Plan: Persistent account system (Google sign-in)

Status: APPROVED
Inputs: triage.md

## Goal and acceptance criteria
- [ ] A player who signs in with Google, logs out, and signs back in (same device or a different one) gets the same `playerId` (the Firebase Auth `uid`) and the same username back automatically — no name-entry prompt, no identity loss.
- [ ] Logging out of an account never deletes that account's username reservation. Closing the tab (`beforeunload`) never logs an account out either — only an explicit "Logout" click does, and even then only signs out of Firebase Auth; it does not touch Firestore.
- [ ] Guest play (no Google sign-in) is unchanged: a localStorage-generated `playerId`, a username reserved for the session, released on explicit logout or `beforeunload`, exactly as today.
- [ ] A username bound to a Google account is permanent: once claimed, no client code path or Firestore rule allows renaming, releasing, or reassigning it — enforced at the rules layer, not just in the UI.
- [ ] Enabling the Google provider in the Firebase console is called out as a manual prerequisite the user performs; nothing in this plan assumes it's already done.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `usePlayerProvider` | `src/modules/session/player.hook.ts:1-130` | Current identity hook, fully replaced: localStorage `playerId` (5-20), `validateSession` against `usernames/<name>` (23-38), `logout` releases the reservation (54-64), `setUsername` reserves/releases (66-111), `beforeunload` calls `logout` unconditionally (113-127). |
| `findUsernameOwner`, `reserveUsername`, `releaseUsername` | `src/modules/session/services/player-session.service.ts:1-21` | `findUsernameOwner` is reused unchanged by the new account-naming path (it already returns whoever currently holds a name). `reserveUsername`'s `setDoc` body needs one new field (`authUid: null`); `releaseUsername` is untouched (guest path only). |
| `player-session.service.test.ts` | `src/modules/session/services/player-session.service.test.ts:61-68` | Asserts `setDoc` is called with exactly `{ playerId }` — must be updated to `{ playerId, authUid: null }` once `reserveUsername`'s body changes. |
| `PlayerContextType` | `src/modules/session/player.types.ts:1-6` | `{ playerId, username, setUsername, logout }` — gains `isGuest`, `isAuthLoading`, `signInWithGoogle`. |
| `PlayerProvider`/`usePlayer` | `src/modules/session/player.provider.tsx:1-21` | Pure passthrough of whatever `usePlayerProvider()` returns; needs **no edit** — `PlayerContextType` already describes its value. |
| `Login`/`LoginView`/`useLogin` | `src/modules/session/components/Login/Login.tsx:1-98`, `Login.hook.ts:1-50`, `Login.types.ts:1-13`, `Login.styles.ts:1-16` | `LoginView` is already pure (props only); `Login` is the one-line connected wrapper. The hook currently reads only `setUsername` from `usePlayer()`; now also reads `isGuest`, `isAuthLoading`, `signInWithGoogle`. |
| `Login.hook.test.ts`, `Login.test.tsx` | `src/modules/session/components/Login/` | Both mock `usePlayer`/construct `LoginViewProps` with the current shape (`showErrorDialog: boolean`); both need rewriting for the new `mode`/`errorDialog` shape. |
| `onLogout: logout` | `src/modules/lobby/components/Lobby/Lobby.hook.ts:15,104` | Only call site of `logout()` outside `player.hook.ts` itself. No signature change, so **no edit needed** here. |
| `usePlayer` other call sites | `src/app/page.tsx:9` (`playerId`, `username`), `src/features/game/components/GameBoard.tsx:76` (`playerId` only) | Both destructure a subset of `PlayerContextType`; adding fields doesn't break either. **No edit needed.** |
| `Player.playerId: string` | `src/lib/types/player.ts:21` | Free-form string, no format assumed. Confirmed via repo-wide `grep -rn playerId src/modules/game-rules` — every reducer treats it as an opaque id (e.g. `combat-player-resolve.reducer.ts:36-76`, `movement.reducer.ts:83-111`). Sourcing it from a Firebase `uid` instead of `player_<ts>_<rand>` needs **no change** in `game-rules`. |
| `firebaseConfig`, Firestore emulator wiring | `src/lib/firebase.ts:1-56` | `firebase/auth` is not imported anywhere yet (confirmed via repo-wide grep); `authDomain` is already in `firebaseConfig` (line 26), unused until now. Existing `connectFirestoreEmulator` pattern (lines 35-39) is the template for the new `connectAuthEmulator` call. |
| `firebase.json` | repo root | `{ firestore: {...}, emulators: { firestore: {...}, ui: {...}, singleProjectMode: true } }` — no `auth` block yet. |
| `playwright.config.ts` | repo root, lines 1-45 | `FIRESTORE_EMULATOR_HOST` constant and two-server `webServer` array (emulator, then `npm run build && npm run start` with `NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST` injected). Template for the new auth-emulator host env var. |
| `firestore.rules` | repo root, lines 1-50 | `usernames/{username}`: `allow create` only checks `playerId is string` (12); `allow update` only checks `playerId` is unchanged (18-21); `allow delete` is unconditional (24) — this unconditional delete is the rule that must become conditional for permanent bindings. |
| `firestore.rules.test.ts` | repo root, lines 43-126 | `initializeTestEnvironment` + `testEnv.authenticatedContext(uid, claims)` already used (line 49) — confirms rules tests can exercise `request.auth.uid` **without** a running Auth emulator. |
| `getAuth`, `GoogleAuthProvider`, `signInWithPopup`, `signOut`, `onAuthStateChanged`, `connectAuthEmulator`, `User`, `UserCredential` | `node_modules/firebase/node_modules/@firebase/auth/dist/auth-public.d.ts:880,1288,1489,2220,3410,3469,3803,3899` (firebase `11.9.1`, confirmed in `package-lock.json:1764`) | Exact APIs available; `User.uid: string`, `User.displayName: string \| null` (via `UserInfo`), `UserCredential.user: User`. |
| `writeBatch` | already exported from `src/lib/firebase.ts:54` | Used for the atomic two-document write in `bindUsernameToAccount` (new). |
| No Login/testbed preview today | `src/testbed/registry.ts:1-81` | No `loginPreview` entry exists; Login has never been previewable in the testbed until now. |

## Decisions
- **`playerId` becomes the Firebase Auth `uid` for signed-in accounts, and stays the existing localStorage-generated id for guests.** No change to `Player.playerId`'s type or to any `game-rules` reducer. Rejected: a dedicated `accountId` field alongside `playerId` — doubles every reducer's player-matching logic for no behavioral gain, since nothing downstream cares which kind of id it is.
- **Permanent username binding is a second Firestore collection, `accounts/{authUid} -> { username }`**, not a flag queried via a `where` clause on `usernames`. A direct doc read by the already-known `authUid` avoids adding a composite index and matches the existing by-id-lookup pattern (`usernames/{username}`). Rejected: `where('authUid', '==', uid)` query on `usernames` — needs an index and is slower than a point read for the one thing this app needs (reverse lookup on sign-in).
- **`usernames/{username}` docs always carry an explicit `authUid: string | null` field** (never omitted), so Firestore rules can safely compare it with `==` without risking an "invalid field" evaluation on a missing key. `reserveUsername` (guest path) now writes `{ playerId, authUid: null }` instead of `{ playerId }`.
- **Permanence is enforced in `firestore.rules`, not just client code:** once a `usernames/{username}` doc has a non-null `authUid`, `allow update` and `allow delete` are both `false`, unconditionally. A client bug cannot rename or release a permanent binding.
- **"Pick once" is also enforced in rules:** creating a permanent `usernames/{username}` doc additionally requires `!exists(/databases/$(database)/documents/accounts/$(request.auth.uid))` — an account that already has a bound username cannot bind a second one, even via a direct Firestore write outside the app's own UI flow.
- **Availability checks reuse `findUsernameOwner`** for both the guest and the account naming path — it already returns whoever currently holds a name (guest or account), so a name actively held by a guest session is correctly reported as taken to an account trying to claim it, with no new query.
- **`logout()` branches on whether an account is signed in:** signed-in -> `signOut(auth)` only (no Firestore write). Guest -> exactly today's behavior (`releaseUsername` + clear `localStorage`). This is the actual fix for the triage bug (logout destroying identity) — scoped to account users, who are the ones gaining persistence.
- **`beforeunload` auto-logout now only fires for guests** (`account === null`). For a signed-in account, tab close must not sign them out — Firebase Auth's own browser persistence (default for the web SDK) already restores the session on reload, which is the entire point of this feature. This changes today's documented behavior (`docs/architecture/structure-and-state.md` §3.1) for account users only; guests are unaffected. `docs-sync` updates that section in the phase that changes it.
- **No "switch account" or "rename" UI.** Per triage Q3 (pick once, keep forever), the Login form shows the one-time naming step only when `account != null && username == null`; once bound, `page.tsx`'s existing `if (!username || !playerId) return <Login />` check (`src/app/page.tsx:12`) means Login never renders again for that identity. Rejected: letting a signed-in user type a different name later — contradicts the explicit decision.
- **No Google `displayName` prefill in the name field.** Nice-to-have, not in the acceptance criteria; skipped to keep the change minimal (KISS).
- **No new automated e2e test for the Google sign-in button.** `signInWithPopup` opens a real Google OAuth consent screen that Playwright cannot drive headlessly, and the Firebase Auth emulator does not simulate that popup either. Coverage for the sign-in flow is at the hook level (mocking `account.service`'s `signInWithGoogle`/`onAuthStateChanged`). The existing guest e2e spec (`e2e/auth-and-lobby.spec.ts`) is unaffected and must stay green. Flagged in Risks as a manual-QA item.
- **Firebase Auth wiring (`getAuth`, `signInWithPopup`, etc.) lives in a new `account.service.ts`**, not in `player-session.service.ts`. The existing file is "guest username reservation"; the new file is "account identity" (Firebase Auth session + its permanent username binding) — two reasons to change, two files, per `component-architecture`'s one-responsibility rule. `no-restricted-imports` already forbids `firebase/*` outside `*.service.ts` (`eslint.config.mjs:42-45`), including inside `*.hook.ts` (line 85-92), so `player.hook.ts` cannot call `firebase/auth` directly regardless.

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/lib/firebase.ts` | edit | Add `firebase/auth` init (`auth`, `GoogleAuthProvider`, `signInWithPopup`, `signOut`, `onAuthStateChanged`) and `connectAuthEmulator` wiring, mirroring the existing Firestore emulator block | implementer-a |
| `firebase.json` | edit | Add an `auth` emulator block (`127.0.0.1:9099`) | implementer-a |
| `playwright.config.ts` | edit | Start the auth emulator alongside Firestore; pass `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST` to the app build step | implementer-a |
| `firestore.rules` | edit | Permanent-binding rules for `usernames/{username}`; new `accounts/{authUid}` collection | implementer-a |
| `firestore.rules.test.ts` | edit | Tests for the new permanence and `accounts` rules | tester-a |
| `src/modules/session/services/account.service.ts` | new | Firebase Auth session (sign-in/out, auth-state subscription) and the `accounts` <-> `usernames` permanent binding | implementer-a |
| `src/modules/session/services/account.service.test.ts` | new | Unit tests for every function above, mocking `@/lib/firebase` | tester-a |
| `src/modules/session/services/player-session.service.ts` | edit | `reserveUsername` writes `{ playerId, authUid: null }` | implementer-a |
| `src/modules/session/services/player-session.service.test.ts` | edit | Update the `reserveUsername` `setDoc` assertion to include `authUid: null` | tester-a |
| `src/modules/session/player.types.ts` | edit | Extend `PlayerContextType`; add `AuthAccount` type | implementer-a |
| `src/modules/session/player.hook.ts` | edit | Rewrite identity logic: account vs. guest branches, `isGuest`, `isAuthLoading`, `signInWithGoogle`, scoped `logout`/`beforeunload` | implementer-a |
| `src/modules/session/player.hook.test.ts` | edit (large rewrite) | Cover account sign-in/restore, guest flow (unchanged behavior), scoped logout, scoped `beforeunload` | tester-a |
| `src/modules/session/components/Login/Login.types.ts` | edit | `LoginMode`, `errorDialog` shape, `onGoogleSignIn` | implementer-a |
| `src/modules/session/components/Login/Login.fixtures.ts` | new | One prop set per `LoginMode`, shared by the view test and the preview | implementer-a |
| `src/modules/session/components/Login/Login.hook.ts` | edit | Derive `mode` from `usePlayer()`; wire `onGoogleSignIn` | implementer-b |
| `src/modules/session/components/Login/Login.hook.test.ts` | edit | Cover `mode` derivation and `onGoogleSignIn` | tester-a |
| `src/modules/session/components/Login/Login.styles.ts` | edit | Styles for the Google button and the "or" divider | implementer-b |
| `src/modules/session/components/Login/Login.tsx` | edit | Render the Google button (guest mode only), the loading spinner, and mode-specific copy | implementer-b |
| `src/modules/session/components/Login/Login.test.tsx` | edit | Cover all three modes' rendering and copy | tester-b |
| `src/modules/session/components/Login/Login.preview.tsx` | new | Testbed states: Loading, Guest, Account (first-time naming) | preview-a |
| `src/modules/session/components/Login/Login.preview.test.tsx` | new | One assertion per preview state, following `ConfirmExitDialog.preview.test.tsx`'s pattern | tester-b |
| `src/testbed/registry.ts` | edit | Register `loginPreview` | preview-a |
| `docs/architecture/structure-and-state.md` | edit | Rewrite §3.1 for the account/guest split, the new `accounts` collection, and the scoped `logout`/`beforeunload` | docs-sync |
| `docs/architecture/systems-and-visuals.md` | edit | §6.12: mention the Auth emulator alongside the Firestore emulator in the e2e lifecycle description | docs-sync |

No change needed: `src/modules/session/player.provider.tsx` (passthrough, type-driven), `src/app/page.tsx`, `src/features/game/components/GameBoard.tsx`, `src/modules/lobby/components/Lobby/*` (all destructure a subset of `PlayerContextType`, unaffected by added fields), `e2e/auth-and-lobby.spec.ts` (guest flow unchanged), `src/modules/game-rules/**` (confirmed no format assumption on `playerId`).

## Contracts
```ts
// ---------- src/lib/firebase.ts (additions only; existing exports unchanged) ----------
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  connectAuthEmulator,
} from 'firebase/auth';

const auth = getAuth(app);

// Set by playwright.config.ts, mirroring NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST.
const authEmulatorHost = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST; // "host:port"
if (authEmulatorHost) {
  connectAuthEmulator(auth, `http://${authEmulatorHost}`);
}

export { auth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged /* , existing exports */ };

// ---------- firebase.json (full file) ----------
{
  "firestore": { "rules": "firestore.rules" },
  "emulators": {
    "firestore": { "host": "127.0.0.1", "port": 8080 },
    "auth": { "host": "127.0.0.1", "port": 9099 },
    "ui": { "enabled": false },
    "singleProjectMode": true
  }
}

// ---------- playwright.config.ts (edits only) ----------
// const FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';  // unchanged
const AUTH_EMULATOR_HOST = '127.0.0.1:9099'; // new — must match emulators.auth in firebase.json
// webServer[0].command: `npx firebase emulators:start --only firestore,auth --project ${EMULATOR_PROJECT_ID}`
// webServer[0].url stays the Firestore emulator URL (Playwright's webServer only polls one URL per entry).
// webServer[1].env gains: NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: AUTH_EMULATOR_HOST

// ---------- firestore.rules (full file) ----------
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /usernames/{username} {
      allow read;

      // A guest reservation has authUid == null; an account reservation has authUid == the
      // owning Firebase Auth uid and additionally requires that account not already own a
      // username ("pick once, keep forever" — src/modules/session/services/account.service.ts).
      allow create: if request.resource.data.playerId is string &&
        (request.resource.data.authUid == null ||
         (request.resource.data.authUid is string &&
          request.auth != null &&
          request.resource.data.authUid == request.auth.uid &&
          !exists(/databases/$(database)/documents/accounts/$(request.auth.uid))));

      // Guest reservations can be re-claimed with the same playerId, exactly as before.
      // Account reservations (authUid != null) are permanent: no update, ever.
      allow update: if
        resource.data.authUid == null &&
        request.resource.data.authUid == null &&
        resource.data.playerId is string &&
        request.resource.data.playerId is string &&
        resource.data.playerId == request.resource.data.playerId;

      // Guest reservations can be released on logout/beforeunload, exactly as before.
      // Account reservations are permanent: no delete, ever.
      allow delete: if resource.data.authUid == null;
    }

    // Reverse lookup: which username does this Firebase Auth account own. Written once,
    // atomically with the usernames/{username} doc, by account.service.ts's bindUsernameToAccount.
    match /accounts/{authUid} {
      allow read;
      allow create: if request.auth != null &&
        request.auth.uid == authUid &&
        request.resource.data.username is string;
      allow update: if false; // picking a username is a one-time action
      allow delete: if false; // never released, by design
    }

    match /games/{gameId} {
      // unchanged from the current file
      allow read;
      allow create;
      allow update: if
        request.resource.data.players is list &&
        request.resource.data.players.size() > 0;
      allow delete;
    }
  }
}

// ---------- src/modules/session/services/account.service.ts (new) ----------
import {
  auth,
  db,
  doc,
  getDoc,
  writeBatch,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from '@/lib/firebase';

export interface AuthAccount {
  uid: string;
  displayName: string | null;
}

/** Opens the Google OAuth popup. Throws on failure or if the user closes the popup. */
export async function signInWithGoogle(): Promise<AuthAccount> { /* signInWithPopup(auth, new GoogleAuthProvider()) */ }

export async function signOutOfAccount(): Promise<void> { /* signOut(auth) */ }

/** Fires once immediately with the current session (or null), then on every change. Returns the unsubscribe fn. */
export function subscribeToAuthState(onChange: (account: AuthAccount | null) => void): () => void { /* onAuthStateChanged(auth, ...) */ }

/** Reads accounts/{authUid}.username, or null if this account hasn't claimed one yet. */
export async function findAccountUsername(authUid: string): Promise<string | null> { /* getDoc(doc(db, 'accounts', authUid)) */ }

/**
 * Atomically creates usernames/{username} (authUid set) and accounts/{authUid} (pointing back
 * at username). Both writes are in one batch so neither can succeed without the other.
 */
export async function bindUsernameToAccount(username: string, authUid: string): Promise<void> {
  /* const batch = writeBatch(db);
     batch.set(doc(db, 'usernames', username), { playerId: authUid, authUid });
     batch.set(doc(db, 'accounts', authUid), { username });
     await batch.commit(); */
}

// ---------- src/modules/session/services/player-session.service.ts (diff only) ----------
export async function reserveUsername(username: string, playerId: string): Promise<void> {
  const usernameDocRef = doc(db, 'usernames', username);
  await setDoc(usernameDocRef, { playerId, authUid: null }); // was: { playerId }
}
// findUsernameOwner and releaseUsername: unchanged.

// ---------- src/modules/session/player.types.ts ----------
export interface PlayerContextType {
  playerId: string | null;
  username: string | null;
  /** True once Firebase Auth has reported no signed-in account (never true at the same time as a signed-in account). */
  isGuest: boolean;
  /** True until the first onAuthStateChanged callback fires; Login shows a spinner during this window. */
  isAuthLoading: boolean;
  setUsername: (name: string) => Promise<boolean>;
  /** Opens the Google sign-in popup. Resolves false (not throws) on failure, for the Login hook to show an error dialog. */
  signInWithGoogle: () => Promise<boolean>;
  logout: () => void;
}

// ---------- src/modules/session/player.hook.ts (behavior contract) ----------
// State: account: AuthAccount | null; guestPlayerId: string | null; username: string | null;
//        isAuthLoading: boolean (true until the first subscribeToAuthState callback).
// Derived: playerId = account ? account.uid : guestPlayerId; isGuest = account === null (and !isAuthLoading).
//
// Mount:
//   1. Guest id init: identical to today's player.hook.ts:10-20 (read-or-create localStorage 'playerId'),
//      always runs, result unused while an account is signed in.
//   2. subscribeToAuthState(async (nextAccount) => {
//        setAccount(nextAccount);
//        if (nextAccount) {
//          const boundUsername = await findAccountUsername(nextAccount.uid);
//          setUsernameState(boundUsername); // null => Login shows the one-time naming form
//        } else {
//          // Falls back to today's guest flow exactly: read localStorage 'username', validateSession
//          // against findUsernameOwner (player.hook.ts:23-38, unchanged body).
//        }
//        setIsAuthLoading(false);
//      }), cleaned up on unmount.
//
// signInWithGoogle(): calls account.service's signInWithGoogle(); the resulting state is picked up by the
//   subscription above (no direct setState here). Returns true on success, false on any thrown error (logged).
//
// setUsername(name): if account != null, check findUsernameOwner(name); if taken by a different uid, return
//   false; else bindUsernameToAccount(name, account.uid), setUsernameState(name), return true. No localStorage
//   writes. If account == null (guest), identical to today's body (player.hook.ts:66-111), unchanged.
//
// logout(): if account != null, signOutOfAccount() only — no Firestore write, no localStorage write for the
//   account's username. If account == null (guest), identical to today's body (player.hook.ts:54-64), unchanged.
//
// beforeunload listener: only invokes the guest release path when account == null. Signed-in accounts: no-op
//   on tab close (today's player.hook.ts:113-127 fires unconditionally; this is the one intentional behavior
//   change called out in Decisions and mirrored in structure-and-state.md §3.1 by docs-sync).

// ---------- src/modules/session/components/Login/Login.types.ts ----------
export type LoginMode = 'loading' | 'guest' | 'account';

export interface LoginErrorDialogState {
  open: boolean;
  title: string;
  description: string;
}

export interface LoginViewProps {
  mode: LoginMode;
  name: string;
  isLoading: boolean;
  isHydrated: boolean;
  errorDialog: LoginErrorDialogState;
  onNameChange: (value: string) => void;
  onNameKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
  onGoogleSignIn: () => void;
  onErrorDialogOpenChange: (open: boolean) => void;
}

// ---------- src/modules/session/components/Login/Login.hook.ts (behavior contract) ----------
// Reads { isGuest, isAuthLoading, setUsername, signInWithGoogle } from usePlayer().
// mode = isAuthLoading ? 'loading' : isGuest ? 'guest' : 'account'.
// onSubmit: unchanged body (player.hook.ts:66-111's caller), but on failure sets
//   errorDialog = { open: true, title: 'Username Taken', description: 'This username is already in use. Please choose a different one.' }.
// onGoogleSignIn: sets isLoading true, calls signInWithGoogle(); on false result sets
//   errorDialog = { open: true, title: 'Sign-In Failed', description: 'Could not sign in with Google. Please try again.' }; sets isLoading false in a finally.
```

## Phases
### Phase 1: Firebase Auth emulator + Firestore rules
1. Edit `src/lib/firebase.ts` per Contracts. (implementer-a)
2. Edit `firebase.json` per Contracts. (implementer-a)
3. Edit `playwright.config.ts` per Contracts. (implementer-a)
4. Edit `firestore.rules` per Contracts. (implementer-a)
5. Extend `firestore.rules.test.ts`: permanent-binding create/update/delete rejections, guest reservation unaffected, `accounts/{uid}` create/update/delete rules, the "pick once" `!exists(...)` check. Run via `npm run test:rules`. (tester-a)
6. `npm run typecheck`, `npm run lint` on every edited file.

Model escalation: none — config/rules edits, mechanical.

### Phase 2: Account service + identity hook
1. Create `src/modules/session/services/account.service.ts` per Contracts. (implementer-a)
2. Create `src/modules/session/services/account.service.test.ts`: mock `@/lib/firebase`; cover sign-in success/failure, sign-out, `subscribeToAuthState`'s immediate-and-on-change firing, `findAccountUsername` found/not-found, `bindUsernameToAccount`'s batch call shape. (tester-a)
3. Edit `src/modules/session/services/player-session.service.ts` per Contracts (one-line `reserveUsername` change). (implementer-a)
4. Edit `src/modules/session/services/player-session.service.test.ts`: update the `reserveUsername` assertion to `{ playerId, authUid: null }`. (tester-a)
5. Edit `src/modules/session/player.types.ts` per Contracts. (implementer-a)
6. Edit `src/modules/session/player.hook.ts` per the behavior contract. (implementer-a, sonnet — the account/guest branching and the scoped `beforeunload` are easy to get subtly wrong)
7. Rewrite `src/modules/session/player.hook.test.ts`: every existing guest-path test must still pass unchanged in behavior (rename as needed); add account-path cases (first sign-in with no bound username, returning sign-in restores username without a name prompt, `setUsername` binds permanently and never writes `localStorage`, `logout` for an account calls `signOutOfAccount` and not `releaseUsername`, `beforeunload` is a no-op while an account is signed in). (tester-a, sonnet — matches implementer-a's escalation; this file is the primary regression net for the behavior change)
8. `npm run typecheck`, `npm run lint`, `npx jest src/modules/session`.

Model escalation: implementer-a and tester-a on steps 6-7 (sonnet).

### Phase 3: Login UI
1. Edit `src/modules/session/components/Login/Login.types.ts` per Contracts. (implementer-a)
2. Create `src/modules/session/components/Login/Login.fixtures.ts`: one `LoginViewProps` object per `LoginMode` (`loading`, `guest`, `account`), all callbacks as `jest.fn()`-free no-ops (plain functions, since fixtures are also used by the non-Jest preview). (implementer-a)
3. Edit `src/modules/session/components/Login/Login.hook.ts` per the behavior contract. (implementer-b)
4. Edit `src/modules/session/components/Login/Login.styles.ts`: add `googleButton`, `divider`, `dividerLine`, `dividerText`, `loadingWrap` (or equivalent), reusing existing tokens (`bg-black/40`, `border-white/10`, `text-muted-foreground`, etc. — no new raw colors). (implementer-b)
5. Edit `src/modules/session/components/Login/Login.tsx`: `mode === 'loading'` renders a centered spinner inside the existing `Card` shell (no form); `mode === 'guest'` renders the existing name form plus a divider and a "Sign in with Google" button above it; `mode === 'account'` renders the existing name form with copy changed to "Choose your permanent commander name — this cannot be changed later," no Google button. `errorDialog.title`/`errorDialog.description` replace the hardcoded "Username Taken" text. (implementer-b)
6. Edit `src/modules/session/components/Login/Login.hook.test.ts`: cover `mode` derivation for all three states and `onGoogleSignIn`'s success/failure paths. (tester-a)
7. Edit `src/modules/session/components/Login/Login.test.tsx`: cover each mode's rendered copy and controls (Google button present only in `guest`; spinner only in `loading`; no Google button in `account`), update the error-dialog assertions for the new `errorDialog` prop shape. (tester-b)
8. Create `src/modules/session/components/Login/Login.preview.tsx`: three states (Loading, Guest, Account) rendering `LoginView` with `Login.fixtures.ts`'s objects, following `ConfirmExitDialog.preview.tsx`'s pattern (no provider needed — `LoginView` is pure). (preview-a)
9. Create `src/modules/session/components/Login/Login.preview.test.tsx`: one assertion per state (e.g. Guest shows the Google button; Account doesn't; Loading shows the spinner and no input), following `ConfirmExitDialog.preview.test.tsx`. (tester-b)
10. Edit `src/testbed/registry.ts`: import and register `loginPreview`. (preview-a)
11. `npm run typecheck`, `npm run lint`, `npx jest src/modules/session src/testbed`.
12. `ui-verify`: screenshot all three Login preview states at `/testbed`.

Model escalation: none — view wiring following an established pattern (`LoginView`/`Login` split already exists).

### Phase 4: Docs and full verification
1. Edit `docs/architecture/structure-and-state.md` §3.1: describe the account/guest split, the `accounts` collection, `signInWithGoogle`, and the scoped `logout`/`beforeunload` behavior; keep the guest-path description (today's §3.1 bullets 1-4) since it's unchanged. (docs-sync)
2. Edit `docs/architecture/systems-and-visuals.md` §6.12: mention the Auth emulator starting alongside Firestore. (docs-sync)
3. Full verification: `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:rules`, `npm run test:e2e -- e2e/auth-and-lobby.spec.ts` (must stay green, unchanged guest flow), `npm run build`.
4. Manual QA note in this plan's Risks (not automatable): verify the real Google sign-in popup against a Firebase project with the Google provider enabled, once the user has done that console step.

Model escalation: none.

## Test plan
- tester-a (logic, first):
  - `firestore.rules.test.ts`: permanent binding create (with/without a prior `accounts` doc), permanent binding update/delete always rejected, guest create/update/delete unaffected, `accounts/{uid}` create only by the owning uid, `accounts` update/delete always rejected.
  - `account.service.test.ts`: `signInWithGoogle` resolves `{ uid, displayName }` on success, throws on popup failure; `signOutOfAccount` calls `signOut`; `subscribeToAuthState` invokes the callback with the current user immediately and again on each `onAuthStateChanged` firing, including `null`; `findAccountUsername` returns the stored username or `null` for a missing doc; `bindUsernameToAccount` writes both documents in one `writeBatch` and commits it.
  - `player-session.service.test.ts`: `reserveUsername` now asserts `setDoc` called with `{ playerId, authUid: null }`.
  - `player.hook.test.ts`: every existing guest-path case stays green; new cases — first Google sign-in with no `accounts` doc leaves `username` null; returning sign-in with an `accounts` doc restores `username` with no Firestore write to `usernames`; `setUsername` while signed in calls `bindUsernameToAccount` and never touches `localStorage`; `setUsername` while signed in returns false and does not bind when `findUsernameOwner` returns a different uid; `logout` while signed in calls `signOutOfAccount` and not `releaseUsername`; `beforeunload` while signed in does not call `logout`; `beforeunload` while a guest still calls `logout` (today's behavior, unchanged).
  - `Login.hook.test.ts`: `mode` is `'loading'` while `isAuthLoading`, `'account'` when `!isGuest` and not loading, `'guest'` otherwise; `onGoogleSignIn` toggles `isLoading` and sets the sign-in-failed `errorDialog` on a false result.
- tester-b (view and e2e):
  - `Login.test.tsx`: Loading mode shows a spinner and no name input; Guest mode shows the Google button, the name input, and "Enter Lobby"; Account mode shows the "permanent name" copy and no Google button; `errorDialog`'s title/description render from props (not hardcoded); OK button still calls `onErrorDialogOpenChange(false)`.
  - `Login.preview.test.tsx`: one assertion per state confirming the mode-specific control is present (Google button in Guest, spinner in Loading, no Google button in Account).
  - e2e: `e2e/auth-and-lobby.spec.ts` runs unchanged and must stay green (guest flow). No new e2e spec for Google sign-in (see Decisions and Risks).

## Preview states
- `Login` (`loginPreview`, group "Session"): Loading (spinner, no form), Guest (name form + Google button + divider), Account (name form, "permanent name" copy, no Google button).

## Risks
- **Firebase console setup is manual and outside this repo.** The user enables the Google provider (and, for local dev/e2e, nothing extra — the Auth emulator doesn't need the real provider enabled) in the Firebase console themselves before this feature works against the real project. Nothing in this plan's code assumes that step is done; `signInWithPopup` will simply fail with a clear Firebase error if it isn't.
- **No automated coverage for the real Google OAuth popup.** Mitigated by hook-level mocking (Phase 2) and a manual-QA pass against a project with the provider enabled, called out in Phase 4 step 4. If this risk is unacceptable, flag it back to the user before Phase 3 ships.
- **Sequencing with `2026-10-09-reconnect-bot-takeover`:** that task keys reconnect-matching off a stable `playerId`, which this task produces. Land this one first; re-triage the other task's plan afterward if it was drafted against the old (guest-only) identity model.
- **`reserveUsername`'s body change is a breaking change to its existing unit test's exact assertion** (`player-session.service.test.ts:67`) — flagged explicitly in the File plan and Phase 2 step 4 so tester-a doesn't miss it.

## Review (architect-b)

Verified against the repo: `src/modules/session/player.hook.ts` (10-20, 23-38, 54-64, 66-111, 113-127), `src/modules/session/services/player-session.service.ts` (1-21), `src/modules/session/player.types.ts`, `src/modules/session/components/Login/{Login.tsx,Login.hook.ts,Login.types.ts,Login.styles.ts}`, `src/lib/firebase.ts`, `firestore.rules`, `firestore.rules.test.ts` (43-126, `authenticatedContext` at line 49), `firebase.json`, `playwright.config.ts`, `eslint.config.mjs` (`RESTRICTED_IMPORTS.firestore` blocks `*.hook.ts`), `package.json`'s `test:rules` script, `docs/architecture/structure-and-state.md` §3.1, `node_modules/firebase/node_modules/@firebase/auth/dist/auth-public.d.ts` (all cited Auth APIs exist, firebase `11.9.1` per `node_modules/firebase/package.json`), `ConfirmExitDialog.preview.tsx`/`.preview.test.tsx`, `src/testbed/registry.ts`, `src/app/page.tsx:9,12`, `src/features/game/components/GameBoard.tsx:76`, `src/modules/lobby/components/Lobby/Lobby.hook.ts:15,104`. No invented paths or symbols found.

**Fixed in this review (trivial, folded in):** File plan row and Phase 4 step 1 both cited `docs/architecture/systems-and-visuals.md` §6.11 for the e2e-lifecycle Auth-emulator note. §6.11 is "Tutorial System" (line 65); the actual E2E lifecycle section is §6.12, "End-to-End (E2E) Testing & Match Cleanup Lifecycle" (line 71), which already documents the Firestore emulator. Corrected both references to §6.12.

**Firestore rules "pick once" check** (`!exists(/databases/$(database)/documents/accounts/$(request.auth.uid))` on `usernames/{username}` create): correct. Traced the race the check is meant to prevent — a `set()` on an already-existing document evaluates under `allow update`, not `allow create`, in Firestore rules, so a second `bindUsernameToAccount` batch for the same account hits the already-existing `accounts/{authUid}` doc's `allow update: if false` even if two concurrent requests somehow both observed a pre-write snapshot where the doc didn't exist yet — the two writes share that one document, so Firestore serializes them and the loser's writes (both the `accounts` update and the `usernames` create, since the batch is atomic) are rejected together. The "pick once" invariant is enforced redundantly (via `!exists` on the new username, and via `update: false` on the existing account doc), not just once — no gap found.

**`beforeunload` scoping** (guest-only auto-release vs. accounts only signing out on an explicit click): correct and consistent with Firebase Auth's default `browserLocalPersistence`, which survives tab close without any client action — so doing nothing on `beforeunload` for a signed-in account is the intended fix for the triage bug, not an oversight. Confirmed the contract keeps this as a guard on the `beforeunload` listener itself (`account == null`), not by routing through the shared `logout()` function — if `beforeunload` called the shared `logout()` unconditionally (as today's code does) and relied on `logout()`'s internal account/guest branch, it would call `signOutOfAccount()` on every tab close, signing accounts out on tab close exactly as this feature set out to stop. The plan's phrasing ("only invokes the guest release path", not "calls `logout()`") avoids that trap. Checked the loading-race edge case (tab closes before the first `onAuthStateChanged` fires): `account` and `username` are both still null at that point regardless of which identity type it turns out to be, so the guest release path's `if (username)` guard is a no-op and `localStorage.removeItem('username')` on an absent key is harmless — no real bug, just confirmed it's inert.

No other findings.

VERDICT: APPROVED
