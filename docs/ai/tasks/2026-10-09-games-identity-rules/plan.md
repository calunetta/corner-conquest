# Plan: Firestore identity enforcement for games/{gameId}

Status: APPROVED
Inputs: triage.md

## Goal and acceptance criteria
- [ ] Every client (guest or signed-in) has a Firebase Auth `uid` before it does anything else: guests get one via Anonymous Auth, not a client-generated `localStorage` id.
- [ ] `games/{gameId}` `create`, `update`, `delete` in `firestore.rules` require `request.auth.uid` to be one of the match's `players[].playerId` (the writer, or the resulting write's own new participant for the join case) — not "anyone."
- [ ] `firestore.rules.test.ts` covers: allowed participant create/update/delete, rejected unauthenticated and rejected wrong-uid create/update/delete, and the join case (new participant not yet in the stored doc).
- [ ] `usernames/{username}` and `accounts/{authUid}` rules and behavior are unchanged (out of scope).
- [ ] No regression in guest username reservation, restore-on-reload, or Google sign-in/out flows.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `readOrCreateGuestPlayerId`, `createPlayerId` | `src/modules/session/guest-session.ts:3-14` | Today's sole source of a guest's `playerId` — a client-generated string in `localStorage`, no Firebase Auth at all. Being replaced. |
| `releaseGuestReservation` | `src/modules/session/guest-session.ts:20-29` | Stays unchanged: releases a guest's `usernames/{name}` reservation and the local `username` key. Not the `playerId` key. |
| `usePlayerProvider` | `src/modules/session/player.hook.ts:14-162` | Orchestrates identity: `guestPlayerId` state, `account` state (Google only today), `playerId = account ? account.uid : guestPlayerId`, `isGuest`, `validateSession`, `restoreAccountUsername`, `logout`, `signInWithGoogle`, `setUsernameCallback`, the `beforeunload` cleanup effect. Full rewrite target. |
| `PlayerContextType` | `src/modules/session/player.types.ts:1-12` | `playerId: string \| null`, `isGuest: boolean` — shape is unchanged by this task, only what populates them changes. |
| `AuthAccount`, `toAuthAccount`, `subscribeToAuthState`, `signInWithGoogle`, `signOutOfAccount` | `src/modules/session/services/account.service.ts:1-38` | `AuthAccount` today is `{ uid, displayName }`; gains `isAnonymous`. `subscribeToAuthState` wraps `onAuthStateChanged` and already fires for any Firebase Auth user — once guests sign in anonymously, it fires for them too, no signature change needed. |
| `auth`, `onAuthStateChanged`, `GoogleAuthProvider`, `signInWithPopup`, `signOut` exports | `src/lib/firebase.ts:20-27, 49, 57-77` | `firebase/auth` already imported here; add `signInAnonymously` to the import and export lists. Auth emulator already wired (`firebase.ts:52-55`, `firebase.json:4`, `playwright.config.ts:5,33`) — no emulator config change needed. |
| `games/{gameId}` rules | `firestore.rules:48-69` | Today: `allow create;` (unconditional), `allow update: if players is list && players.size() > 0` (no identity check), `allow delete;` (unconditional). Being tightened. |
| `Player.playerId: string`, `PlayerColor` (4 members: Blue/Red/Purple/Yellow) | `src/lib/types/player.ts:5-11, 19-21` | `Player.playerId` is the identity field the new rule checks against `request.auth.uid`. `PlayerColor` has exactly 4 values, which bounds `players.length` at 4 — used to size the rule's participant check (Firestore rules cannot iterate an arbitrary-length list of maps). |
| `initializeGame` | `src/modules/game-rules/game-setup.reducer.ts:25-53` | The match creator is always written at `players[0]` — confirms `create` can check participation directly on `request.resource.data.players`. |
| `handleCreateGame` | `src/modules/lobby/components/Lobby/Lobby.hook.ts:34-69` | Calls `createGameId()` + `saveGame(newGame)` (a Firestore `create`, since the id didn't exist); for `maxPlayers === 1` immediately calls `saveGame(startedGame)` again — that second call is a Firestore `update` (doc now exists), same creator still a participant. |
| `joinOpenGame` | `src/modules/lobby/services/lobby.service.ts:48-81` | A joining player is **not yet** a participant of the stored doc (`resource.data`) but **is** one of the new doc being written (`request.resource.data`) — the `update` rule must accept either case, not just the stored one. |
| `takeBotTurn` | `src/modules/game-rules/services/bot-turn.service.ts:9-16` | Writes a bot's turn via `setDoc` from whichever human client is running it. The writer's own `uid` is already a participant of the stored doc (they're a real seated player); the rule must not require the writer's uid to match the *bot's* `playerId`. |
| `handlePlayerExit` | `src/modules/game-rules/services/player-exit.service.ts:13-118` | Deletes or updates `games/{gameId}` only for a player already seated in it (`playerIndex !== -1` check at `:23-26`) — `delete` rule can check the stored doc's participants only. |
| `firestore.rules.test.ts` games-collection tests | `firestore.rules.test.ts:408-614` | All current `create`/`update` tests use `testEnv.unauthenticatedContext()` and will fail once the rule requires `request.auth`. No `Delete` describe block exists for `games` today — must be added. |
| Lesson: identity-type transition gaps | `docs/ai/lessons-learned.md:86` | A prior task missed the "already holds identity A, switches to B" transition. Applies here three ways: (1) fresh visit → anonymous sign-in, (2) returning guest → Firebase restores the anonymous session itself (no new sign-in call), (3) Google sign-out → the listener's own `null` branch re-triggers anonymous sign-in, restoring guest status. All three need explicit test coverage, not just "fresh guest" and "fresh account." |
| `docs/architecture/structure-and-state.md` §3.1 | `docs/architecture/structure-and-state.md:49-91` | Documents today's guest identity (`localStorage` playerId) and account identity (Google). Needs updating for the anonymous-auth guest path; docs-sync owns this. |

## Decisions
- Guests sign in anonymously via Firebase Auth (`signInAnonymously`) instead of generating a `localStorage` id, because `request.auth.uid` is the only identity Firestore rules can trust; a client-chosen string can be forged by any writer. Rejected: keep `localStorage` `playerId` and have the rule trust a client-supplied field in the document body (e.g. "the write must contain the correct `playerId` somewhere") — any client can write any `playerId` into the document, so this enforces nothing.
- `AuthAccount` gains `isAnonymous: boolean` (from Firebase's own `user.isAnonymous`) instead of adding a second, parallel "is this a guest" state, because Firebase Auth already distinguishes the two and `usePlayerProvider` otherwise has to track two independent booleans that must never disagree.
- `usePlayerProvider`'s single `subscribeToAuthState` listener triggers `signInAnonymously()` itself when it observes `null`, instead of a separate `useEffect` that calls it once on mount, because mount-once sign-in would race a Google sign-out: after `logout()` calls `signOutOfAccount()`, the listener's next `null` callback is exactly the place a new guest session must be established, and a separate effect would need to duplicate that same listener logic to fire a second time.
- The new Firestore rule checks each of the match's first 4 seats individually (`players[0]`..`players[3]`) rather than a single list-membership test, because Firestore's rules language has no `list.map()`/comprehension to extract `playerId` out of a list of maps; 4 is not arbitrary — `PlayerColor` has exactly 4 values, which hard-caps `players.length`. Rejected: add a denormalized flat `playerIds: string[]` field to `GameState` solely for the rule to read — works, but duplicates data already in `players[].playerId` and needs every writer (reducers, bot-turn, player-exit) to keep it in sync forever; the bounded-index check needs no schema change and no reducer touches.
- `update` accepts a writer who is a participant of **either** the stored document or the incoming one, because `joinOpenGame` writes a joining player who, by definition, isn't in the stored document yet. Rejected: route joins through a dedicated Cloud Function that could check this server-side — no Cloud Functions exist in this project (client-only Firestore SDK, `CLAUDE.md`) and introducing one is a materially larger, different-shaped change than this task's scope.
- Existing guests lose their reserved username the first time they load the app after this ships (their new anonymous `uid` won't match the `playerId` already stored in their `usernames/{name}` doc, so `validateSession` clears it) and any already-in-progress match's human players lose write access to that match the moment the new rule deploys (their seated `playerId` is the old `localStorage` string, which can never equal any uid). Both are unavoidable without a migration bridge that would have to trust the very client-supplied id this task is removing as untrustworthy; flagged under Risks for the user to accept or time the deploy around, not fixed in code.

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/lib/firebase.ts` | edit | Import and export `signInAnonymously` from `firebase/auth`. | implementer-a |
| `src/modules/session/services/account.service.ts` | edit | `AuthAccount` gains `isAnonymous`; `toAuthAccount` maps it; add `signInAnonymously(): Promise<AuthAccount>`, importing the Firebase one aliased as `signInAnonymouslyWithFirebase` to avoid colliding with this file's own export of the same name. | implementer-a |
| `src/modules/session/player.types.ts` | edit | Comment-only: update the `isGuest` JSDoc, which currently says "never true at the same time as a signed-in account" — stale once an anonymous Firebase user counts as signed in. Type shape unchanged. | implementer-a |
| `src/modules/session/guest-session.ts` | edit | Remove `createPlayerId`/`readOrCreateGuestPlayerId` (superseded by Anonymous Auth); keep `releaseGuestReservation` only. | implementer-a |
| `src/modules/session/player.hook.ts` | edit | Identity orchestration rewrite: drop `guestPlayerId` state; `playerId`/`isGuest` derive from `account` (now populated for guests too); auth listener signs a guest in anonymously when it sees no session. | implementer-a |
| `firestore.rules` | edit | Add `isGameParticipant(players)` helper; tighten `games/{gameId}`'s `create`/`update`/`delete` to require it. | implementer-a |
| `src/modules/session/services/account.service.test.ts` | edit | Update `AuthAccount` expectations to include `isAnonymous`; add `signInAnonymously` coverage. | tester-a |
| `src/modules/session/player.hook.test.ts` | edit | Replace the `localStorage`-playerId guest tests with Anonymous-Auth-backed guest tests; add the three identity-transition cases from the lesson above. | tester-a |
| `firestore.rules.test.ts` | edit | Rewrite `games` collection `Create`/`Update` tests for the participant check (allowed + rejected cases); add a `Delete` describe block (none exists today). | tester-a |
| `docs/architecture/structure-and-state.md` | edit | §3.1 guest-path bullets 1 and 4: guest identity is now a Firebase Anonymous Auth `uid`, not a client-generated `localStorage` id. Add a short note near §3.2 (or wherever `games/{gameId}` is described) that writes require the writer to be a seated participant. | docs-sync |

## Contracts
```ts
// src/modules/session/services/account.service.ts

// Import the raw Firebase function under an alias so it doesn't collide with this file's own
// export of the same name (the same pattern this file already uses for signInWithGoogle vs.
// firebase/auth's signInWithPopup):
// import { signInAnonymously as signInAnonymouslyWithFirebase } from '@/lib/firebase';

export interface AuthAccount {
  uid: string;
  displayName: string | null;
  /** True for a guest's Firebase Anonymous Auth user; false for a Google-signed-in account. */
  isAnonymous: boolean;
}

/** Unchanged signature; now also fires for a guest's anonymous session, not just Google accounts. */
export function subscribeToAuthState(onChange: (account: AuthAccount | null) => void): () => void;

/**
 * Signs this client in anonymously, giving it a Firebase Auth uid Firestore rules can trust.
 * Throws on failure (network, or Anonymous Auth disabled on the project).
 */
export async function signInAnonymously(): Promise<AuthAccount>;

// signInWithGoogle, signOutOfAccount, findAccountUsername, bindUsernameToAccount,
// claimAccountUsername: signatures unchanged.


// src/modules/session/player.types.ts

// PlayerContextType shape UNCHANGED. Comment-only edit: the isGuest JSDoc currently reads
// "True once Firebase Auth has reported no signed-in account (never true at the same time as a
// signed-in account)." — replace with wording matching the new formula (plan.md's Behavior
// contract): true for a guest's anonymous Firebase session; false for a Google account. An
// anonymous Firebase user is itself a signed-in account, so the old "never true at the same
// time as a signed-in account" claim no longer holds.


// src/modules/session/guest-session.ts

/**
 * Frees a guest's reserved username and its local copy. Does not touch React state, so it is
 * safe to call while the auth listener is restoring an account's own username.
 */
export async function releaseGuestReservation(guestUsername: string | null): Promise<void>;
// createPlayerId and readOrCreateGuestPlayerId are deleted, not kept as dead code.


// src/modules/session/player.hook.ts

// PlayerContextType (src/modules/session/player.types.ts) is UNCHANGED:
// { playerId: string | null; username: string | null; isGuest: boolean; isAuthLoading: boolean;
//   setUsername: (name: string) => Promise<boolean>; signInWithGoogle: () => Promise<boolean>; logout: () => void }
//
// Behavior contract usePlayerProvider must implement:
// - On mount, subscribeToAuthState() starts the one listener that drives everything below.
// - Listener receives `null` (no Firebase session at all, e.g. first-ever visit, or right after
//   a Google signOut): call signInAnonymously(); do not touch isAuthLoading/account yet — the
//   anonymous sign-in's own onAuthStateChanged callback re-enters this same listener next.
//   On signInAnonymously() failure: console.error, setAccount(null), setIsAuthLoading(false).
// - Listener receives a non-null AuthAccount with isAnonymous === true (a guest, fresh or
//   returning — Firebase restores a prior anonymous session itself on reload, no sign-in call
//   needed): setAccount(it); if localStorage 'username' is set, validateSession(account.uid, that
//   username) (unchanged logic, keyed to account.uid instead of the old guestPlayerId);
//   setIsAuthLoading(false).
// - Listener receives isAnonymous === false (Google account): setAccount(it);
//   restoreAccountUsername(account.uid) (unchanged); setIsAuthLoading(false).
// - playerId = account ? account.uid : null.
// - isGuest = !isAuthLoading && account !== null && account.isAnonymous.
// - logout(): if account && !account.isAnonymous -> signOutOfAccount() (unchanged, errors
//   caught+logged); else -> releaseGuestReservation(username) + clear username state (unchanged
//   releaseGuestSession behavior, just gated on isAnonymous instead of account === null).
// - signInWithGoogle(): unchanged body, except the "release the guest reservation" branch is
//   gated on account?.isAnonymous instead of account === null.
// - setUsernameCallback(name): if !account -> log 'Player ID not initialized yet.', return false.
//   If !account.isAnonymous -> unchanged claimAccountUsername(name, account.uid) path. Else ->
//   unchanged guest reserve/release path, using account.uid wherever guestPlayerId was used
//   (no more readOrCreateGuestPlayerId fallback — account is always set by the time a user can
//   interact, because isAuthLoading gates the UI).
// - beforeunload handler: if account?.isAnonymous && localStorage.getItem('username') ->
//   releaseGuestSession() (unchanged; condition changes from `account === null` to this).


// firestore.rules

// Added inside `service cloud.firestore { match /databases/{database}/documents { ... } }`,
// before the `games/{gameId}` match block:
//
// function isGameParticipant(players) {
//   return request.auth != null &&
//     players is list &&
//     (
//       (players.size() > 0 && players[0].playerId == request.auth.uid) ||
//       (players.size() > 1 && players[1].playerId == request.auth.uid) ||
//       (players.size() > 2 && players[2].playerId == request.auth.uid) ||
//       (players.size() > 3 && players[3].playerId == request.auth.uid)
//     );
// }
//
// match /games/{gameId} {
//   allow read;
//   allow create: if isGameParticipant(request.resource.data.players);
//   allow update: if
//     request.resource.data.players is list &&
//     request.resource.data.players.size() > 0 &&
//     (isGameParticipant(resource.data.players) || isGameParticipant(request.resource.data.players));
//   allow delete: if isGameParticipant(resource.data.players);
// }
```

## Phases
### Phase 1: Guest Anonymous Auth
1. `src/lib/firebase.ts`: add `signInAnonymously` to the `firebase/auth` import and the export block. (implementer-a, sonnet)
2. `src/modules/session/services/account.service.ts`: add `isAnonymous` to `AuthAccount` and `toAuthAccount`; add `signInAnonymously()`, importing the Firebase function aliased as `signInAnonymouslyWithFirebase` to avoid colliding with this file's own `signInAnonymously` export. (implementer-a, sonnet)
3. `src/modules/session/guest-session.ts`: delete `createPlayerId`/`readOrCreateGuestPlayerId`; keep `releaseGuestReservation`. (implementer-a, sonnet)
4. `src/modules/session/player.hook.ts`: rewrite per the Contracts behavior block. (implementer-a, sonnet)
4b. `src/modules/session/player.types.ts`: comment-only edit — update the `isGuest` JSDoc (no longer "never true at the same time as a signed-in account", since an anonymous Firebase user is itself signed in). Type shape unchanged. (implementer-a, sonnet)
5. `src/modules/session/services/account.service.test.ts`: update `AuthAccount`/`toAuthAccount` expectations; add `signInAnonymously` tests (resolves `{uid, displayName, isAnonymous: true}`, rejects on failure, doesn't touch Firestore). (tester-a, sonnet)
6. `src/modules/session/player.hook.test.ts`: rewrite the `playerId initialization` and `auth state` describe blocks for the new anonymous-first flow; add the three transition cases (fresh visit → anonymous sign-in call made; returning guest → Firebase reports the anonymous account directly, no sign-in call; Google sign-out → listener's `null` branch signs a new guest in). Keep the `setUsername`/`logout`/`beforeunload` (guest) and (account) describe blocks' intent, adjusting only how the guest identity is established. (tester-a, sonnet)
7. Run `npm run typecheck`, `npm run lint`, `npx jest src/modules/session` for every file touched in this phase.
8. Commit: `feat(session): sign guests in anonymously for a trustable Firestore identity [phase 1/2]`.

Model escalation: all of Phase 1 (identity rewrite + its tests), per triage overrides.

### Phase 2: Firestore rules + docs
1. `firestore.rules`: add `isGameParticipant` and tighten `games/{gameId}`'s `create`/`update`/`delete`. (implementer-a, sonnet)
2. `firestore.rules.test.ts`: rewrite the `games` collection `Create`/`Update` describe blocks (see Test plan) and add a `Delete` describe block. (tester-a, sonnet)
3. `docs/architecture/structure-and-state.md`: update §3.1 bullets 1 and 4 for the anonymous-auth guest path; add the participant-write note. (docs-sync)
4. Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run test:e2e -- e2e/auth-and-lobby.spec.ts` (needs the Firestore+Auth emulator and Java 21; confirms the full login→lobby→game-create flow still works end to end against the tightened rules).
5. Commit: `feat(firestore): require games/{gameId} writers to be a seated participant [phase 2/2]`.

Model escalation: all of Phase 2 (Firestore rules logic + their tests), per triage overrides.

## Test plan
- tester-a — `account.service.test.ts`: `signInAnonymously` resolves `{uid, displayName, isAnonymous: true}` from the credential's user; rejects and propagates the error on failure; does not call `getDoc`/`writeBatch`. Update the two existing `toEqual({uid, displayName})` assertions (lines 76, 149 today) to include `isAnonymous`.
- tester-a — `player.hook.test.ts`:
  - Fresh visit (listener's first callback is `null`): `signInAnonymously` is called; once it resolves with an anonymous account, `playerId` becomes that uid, `isGuest` becomes true, `isAuthLoading` becomes false.
  - Returning guest (listener's first callback is already a non-null, `isAnonymous: true` account — Firebase restored the session itself): `signInAnonymously` is **not** called; `playerId`/`isGuest` populate directly.
  - `validateSession` cases (matches/mismatches/missing/error) keyed to the anonymous account's uid instead of a `localStorage` playerId — same four cases as today, re-pointed.
  - `setUsername` (guest) cases — same as today's, using the anonymous uid in place of `guestPlayerId`.
  - `logout` (guest): releases the username reservation, does not call `signOutOfAccount` — same as today, condition now keyed off `isAnonymous`.
  - Google sign-in while a guest: releases the guest reservation, same as today.
  - Google sign-out → guest restored: after `logout()` signs out the Google account and the listener reports `null`, `signInAnonymously` is called again and a fresh guest session results (`isGuest` true, new uid).
  - `signInAnonymously` rejects: `console.error` called, `account` stays `null`, `isAuthLoading` becomes `false`, `playerId` stays `null`.
- tester-a — `firestore.rules.test.ts` (`games` collection):
  - Create: allowed when `request.auth.uid` equals `players[0].playerId` (the creator); rejected when unauthenticated; rejected when `request.auth.uid` matches none of the listed players.
  - Update (existing participant): an authenticated context whose uid is already one of the stored doc's players may update it (host turn, bot-turn write, death-animation update); rejected for an authenticated context whose uid is a participant of neither the stored nor the incoming doc; rejected unauthenticated; the existing structural checks (players list present/non-empty) stay covered.
  - Update (join case): an authenticated context whose uid is **not** in the stored doc but **is** in the incoming `players` array (simulating `joinOpenGame`) is allowed.
  - Delete: allowed for an authenticated context whose uid is one of the stored doc's players; rejected unauthenticated; rejected for an authenticated context whose uid is a participant of none of the stored doc's players.
  - Re-run the existing `Integration: app read/write patterns` test with `authenticatedContext(initialPlayers[0].playerId)` instead of `unauthenticatedContext()`, since it now must authenticate as a participant to pass.

## Preview states
- None — no `.tsx`/view-layer files are touched (per triage: anonymous sign-in is invisible to the player).

## Risks
- **Deploy-time break for any match already in progress**: an in-progress match's human players carry the old `localStorage` `playerId` as their seat's `playerId`. The moment the new rule deploys, their next write authenticates with a brand-new anonymous `uid` that can never equal that stored string, so they lose write access to their own ongoing match (reads still work). No code-level fix exists without trusting the very client-supplied id this task removes as untrustworthy. Flag to the user: time the Firestore rules deploy for when no real match is in progress, or accept the loss.
- **One-time username loss for existing guests**: the first load after this ships, an existing guest's `localStorage` `username` fails `validateSession` against their new anonymous uid (the stored `usernames/{name}` doc still points at their old `playerId`) and gets cleared, so they're prompted to pick a name again. Same root cause as above, same "no fix without trusting the old id" reasoning.
- **Anonymous Auth must be enabled on the live Firebase project**, not just the emulator (`firebase.json`'s `emulators.auth` already covers local/e2e). If it's off in the Firebase console, every guest's `signInAnonymously()` call fails and `usePlayerProvider`'s catch path leaves them with `playerId: null` (no read-only fallback is designed here, since a playable session needs a writable identity regardless). Confirm this is enabled before deploying `firestore.rules`.

## Review (architect-b)
VERDICT: CHANGES REQUESTED

All cited paths/symbols verified against the repo (`src/lib/firebase.ts:20-27,49,57-77`; `firestore.rules:48-69`; `firestore.rules.test.ts:408-614` and its missing `Delete` block for `games`; `src/modules/session/{guest-session.ts,player.hook.ts,player.types.ts}`; `src/modules/session/services/account.service.ts`; `src/lib/types/player.ts:5-11,19-21`; `game-setup.reducer.ts:25-53`; `Lobby.hook.ts`; `lobby.service.ts`; `bot-turn.service.ts`; `player-exit.service.ts`; `lessons-learned.md:86`; `structure-and-state.md:49-91`). Grep for `readOrCreateGuestPlayerId`/`createPlayerId`/`guestPlayerId`/`AuthAccount` across `src/` turned up no consumer outside the files already on the File plan. No invented paths found.

1. **Naming collision not called out: `src/lib/firebase.ts` and `account.service.ts` both end up with a `signInAnonymously` binding.** `firebase.ts` is told to "Import and export `signInAnonymously` from `firebase/auth`" (File plan row 1), and `account.service.ts`'s Contracts block declares `export async function signInAnonymously(): Promise<AuthAccount>` in the same file that must `import { ... } from '@/lib/firebase'` to call the raw one. Importing and locally declaring the same identifier in one module doesn't compile. The existing `signInWithGoogle`/`signInWithPopup` pair in the same file avoids this by using different names on each side (`account.service.ts:6,24-27`) — the plan should say the same for the anonymous case: alias the import, e.g. `import { signInAnonymously as signInAnonymouslyWithFirebase } from '@/lib/firebase';`. Add one line to the Contracts section or the Phase 1 step 2 bullet so implementer-a doesn't have to invent the fix mid-build. Owner: architect-a, fold into plan.md before Phase 1 starts.

2. **`player.types.ts`'s `isGuest` JSDoc goes stale and the file isn't on the File plan.** Current text (`player.types.ts:4`): "True once Firebase Auth has reported no signed-in account (never true at the same time as a signed-in account)." Under the new contract (plan.md:108), `isGuest = !isAuthLoading && account !== null && account.isAnonymous` — an anonymous Firebase user *is* a signed-in account, so "never true at the same time as a signed-in account" becomes false. `PlayerContextType`'s shape is unchanged (correct, per Decisions), but its comment is a claim about behavior and must stay true per `code-standards` ("comments explain why... never what" is about content, but a comment that's simply wrong is worse than none). Add `src/modules/session/player.types.ts` to the File plan (edit, implementer-a, phase 1): update only the `isGuest` doc comment to reflect "true for a guest's anonymous Firebase session; false for a Google account" — no type change.

Both findings are small, mechanical fixes to the plan text (one import alias, one doc-comment line); neither changes the design, the file list's scope, or the phase split. Fix both in plan.md and this is APPROVED.

## Re-review (architect-b)
VERDICT: APPROVED

Both prior findings resolved:
1. Naming collision: File plan (`plan.md:45`) and Contracts (`plan.md:62,78`) now both state the `signInAnonymouslyWithFirebase` import alias, matching the existing `signInWithGoogle`/`signInWithPopup` pattern verified against `src/modules/session/services/account.service.ts:6-8,24-27`.
2. Stale `isGuest` JSDoc: `src/modules/session/player.types.ts` is now on the File plan (`plan.md:46`, implementer-a) with the comment-only scope stated, the new wording specified in Contracts (`plan.md:86-91`), and a phase step added (`plan.md:172`, step 4b).

No new paths or symbols introduced by the revision; no scope change. Status set to APPROVED.
