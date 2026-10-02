# Triage: Harden firestore.rules

Request: firestore.rules currently allows public read/write to every game and username document; replace it with rules that match the app's real access pattern.
Type: chore (security)
Tier: S
Pipeline: implementer-a tester-a
Overrides: none
Phases: 1

## Why this tier
- One file of rules plus one rules-test file. Depends on the Firestore emulator (2026-10-02-firestore-emulator) to run `@firebase/rules-unit-testing` against real rules instead of guessing.
- No UI, no gameplay rule change — purely an access-control fix.

## Scope
- In: `firestore.rules` rewritten to the weakest rules that still let the app work unauthenticated (this app has no Firebase Auth — identity is a client-generated `playerId` compared against document contents), `firestore.rules.test.ts` using the emulator to prove the new rules block cross-player writes other than the app's own update pattern and allow the app's own reads/writes.
- Out: adding Firebase Authentication (would be a much larger change the user didn't ask for); changing `usePlayer`/`useGameEngine` client code beyond what the new rules require.

## Open questions
None — recommended approach: scope `usernames/{username}` writes to the document's own `playerId` field (can't be reassigned to an existing player's id) and `games/{gameId}` writes to documents whose `players` array already contains the caller's `playerId`, with a bypass for creating a brand-new game.
