# Triage: Persistent account system (Google/email auth)

Request: Replace the current logout behavior — which deletes the player's username reservation and effectively loses their identity — with a durable account system (Google or email sign-in) so a player keeps their name/identity across devices and after logging out. (Audit point 4.)
Type: feature
Tier: L
Pipeline: architect-a architect-b implementer-a implementer-b tester-a tester-b preview-a preview-b architect-b:final-review
Overrides: none
Phases: 3+ (see Scope/Decisions — exact count depends on answers to Open questions below; do not start Phase 1 until those are answered)

## Why this tier
- Today there is **no Firebase Auth usage anywhere in the codebase** (confirmed: `src/lib/firebase.ts` only imports `firebase/app` and `firebase/firestore`; `firebaseConfig.authDomain` is defined but unused). This is a new subsystem, not a tweak.
- Touches the identity model used everywhere a `playerId`/`username` is read: `src/modules/session/player.hook.ts`, `player.provider.tsx`, `services/player-session.service.ts`, the Login page (`src/modules/session/components/Login/Login.tsx`), the lobby join/create flow, and every `GameState.players[].playerId` reference that assumes a stable client-generated id.
- Directly interacts with the reconnect/bot-takeover feature being scoped in parallel (`2026-10-09-reconnect-bot-takeover`) — reconnecting to a left match needs a stable identity to match against, which is exactly what this task is building. These two tasks should be sequenced, not run fully in parallel, once both are approved.

## Scope
- In: how a player's identity is established and persisted (Firebase Auth), what replaces the `usernames/<name>` Firestore lock, what `logout` does now, and the Login UI changes needed.
- Out (for this task): the actual reconnect-to-left-match logic and bot-takeover-on-exit behavior — that's `2026-10-09-reconnect-bot-takeover`. This task only needs to produce a *stable, durable* `playerId` that survives logout/relogin on any device, which the reconnect task then keys off.
- Out: migrating existing in-progress matches' `players[].playerId` values — matches created before this ships keep working with their existing (session-based) ids; this task does not need a data migration.

## Open questions — answered by the user (2026-10-09)
1. **Auth method(s):** Google OAuth only. No email/password.
2. **Guest play:** stays allowed as a fallback. Guest identities remain as disposable as today (lost on logout/tab close); only signed-in account players get persistence.
3. **Existing usernames:** username ↔ account binding is permanent, like Discord — pick once, keep forever.
4. **Firebase project setup:** the user will handle enabling the Google provider in the Firebase console themselves. Architect-a's plan should still call this out as a manual prerequisite step, not something Claude can do via code.
