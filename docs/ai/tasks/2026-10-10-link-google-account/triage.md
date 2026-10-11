# Triage: Link Google account from guest, add Google logo to sign-in buttons

Request: Add a "Link Google account" button in the lobby for anonymously-signed-in (guest) players that links their current anonymous Firebase Auth user to a Google account via `linkWithPopup`/`linkWithCredential` (same uid, no data migration needed), and add the standard Google "G" logo to every existing "Sign in with Google" button.
Type: feature
Tier: M
Pipeline: ui-designer-a ui-designer-b architect-a architect-b implementer-a implementer-b tester-a tester-b preview-a preview-b docs-sync architect-b:final-review
Overrides: implementer-a=sonnet, tester-a=sonnet
Phases: 2

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier
- Verified files/layers touched:
  - `src/lib/firebase.ts` (legacy, unlinted) — needs `linkWithPopup`, `linkWithCredential`, `GoogleAuthProvider` re-exported for linking (currently only exports `signInWithPopup`/`signInAnonymously`).
  - `src/modules/session/services/account.service.ts` — new `linkWithGoogle()` function; only `.service.ts` files may import `@/lib/firebase` per `eslint.config.mjs` restricted-imports rule.
  - `src/modules/session/player.hook.ts`, `player.types.ts`, `player.provider.tsx` — expose a `linkWithGoogle` action and `isGuest` already exists to gate the button.
  - `src/modules/lobby/components/Lobby/Lobby.tsx` (+ `.hook.ts`/`.styles.ts`) — header-right area (next to the existing "Logout" button) is the natural, only sensible slot; no settings/profile menu exists elsewhere.
  - `src/modules/session/components/Login/Login.tsx` (+ `.styles.ts`, `.test.tsx`) — add the Google "G" logo to the existing button; current button is text-only, no icon anywhere in the codebase (`FcGoogle`/`react-icons` not installed).
  - New shared icon: no Google logo asset exists; needs a small inline-SVG `GoogleIcon` component (likely `src/modules/session/components/` or a shared location), used by both Login and the new link-account button.
  - New component: `LinkGoogleAccountButton` (or similar) under `src/modules/session/components/`, following the `.tsx`/`.hook.ts`/`.styles.ts`/`.types.ts`/`.fixtures.ts`/`.preview.tsx`/tests anatomy, to keep `Lobby.tsx` and `Login.tsx` under the 150-line limit.
  - Tests/docs: `account.service.test.ts`, `player.hook.test.ts`, `Login.test.tsx`, new component tests/preview, `docs/architecture/structure-and-state.md` §3.1 (currently documents that Google sign-in does *not* link to the guest uid — this changes that).
- Visible UI: yes (new button + new icon on two buttons) → UI designers run before the architects.
- Gameplay: no rule/economy change → game designers skipped.
- Data: no Firestore document-shape change — `linkWithCredential` keeps the existing anonymous uid, so `accounts`/`usernames` documents already keyed by that uid stay valid. No migration needed.
- Risk: moderate — Firebase Auth linking has a real failure mode (`auth/credential-already-in-use` when the Google account is already registered) that must be handled and surfaced to the user, not swallowed; escalating `implementer-a` (service/hook layer) and `tester-a` (auth-flow tests) to sonnet for that reason. View-layer work (`implementer-b`, icon, button wiring) is mechanical and stays on haiku.
- File count is >6 across logic and view layers, so split into 2 phases per the phases rule even at tier M.

## Scope
- In:
  - `linkWithGoogle()` service function using `linkWithPopup(auth.currentUser, new GoogleAuthProvider())` with `auth/credential-already-in-use` handled as a user-facing error (not a crash).
  - "Link Google account" button in the lobby header, visible only when `isGuest` is true, following the existing Login error-dialog pattern for failures.
  - A reusable `GoogleIcon` (official "G" mark) used by both the lobby button and the existing Login "Sign in with Google" button.
  - Firestore/account docs are unaffected (same uid before/after linking) — confirmed, not reimplemented.
  - `docs/architecture/structure-and-state.md` §3.1 updated to describe the new linking flow and that the limitation it documents (no linking) is resolved.
- Out:
  - Any other sign-in provider (email/password, other OAuth) — Google only, per the request.
  - Any Firestore security-rules changes — uid doesn't change, so `2026-10-09-games-identity-rules` rules remain valid; out of scope to touch.
  - Resolving what happens if a *non-guest* user clicks the button (button is `isGuest`-gated only; ui-designer should still specify the disabled/hidden state for signed-in accounts for completeness).

## Open questions
- None — proceeding with `isGuest`-gated placement in the lobby header (next to Logout), matching the existing pattern; UI designers will confirm exact copy/layout/mobile fit.
