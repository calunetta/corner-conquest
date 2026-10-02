# Triage: Firestore emulator for e2e tests

Request: e2e tests must run against the Firestore emulator instead of the production Firebase project.
Type: chore
Tier: M
Pipeline: architect-a architect-b implementer-a implementer-b tester-a tester-b architect-b:final-review
Overrides: none
Phases: 1

## Why this tier
- Touches config (`firebase.json`, `.firebaserc`), the Firestore client bootstrap (`src/lib/firebase.ts`), the e2e harness (`playwright.config.ts`, `e2e/e2e-cleanup.ts`), `package.json` scripts, and docs (`CLAUDE.md`, `docs/README.md`, `.claude/skills/testing/SKILL.md`). Multiple files, one layer (infra/testing), no gameplay or visible UI change.
- No new component, so no UI designers and no preview stage.

## Scope
- In: connect the Firestore client to the emulator when `NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST` (or equivalent) is set; a `test:e2e` script that starts the emulator, waits for it, runs the Next.js server against it, runs Playwright, and tears the emulator down; emulator config for `firestore` (and `auth` only if `usernames` collection needs it — it doesn't, since `usePlayer` only uses Firestore, no Firebase Auth); update docs so the `testing` skill no longer says e2e needs real `.env.local` Firebase credentials.
- Out: changing game logic; CI pipeline changes (none exists in this repo); migrating existing unit tests (they use in-memory `GameState`, not Firestore).

## Open questions
None — recommended approach (emulator via `firebase.json` + `firebase emulators:exec`) is used.
