# Triage: In-game lobby-style background + toggle

Request: Give the in-game board the same sky-gradient background as the lobby, and add a player-facing toggle to turn it on/off.
Type: feature
Tier: M
Pipeline: ui-designer-a ui-designer-b architect-a architect-b implementer-a implementer-b tester-a tester-b preview-a preview-b docs-sync architect-b:final-review
Overrides: none
Phases: 2

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier
- Visible UI signal: yes. The board's background changes (`src/features/game/components/GameBoard.tsx:25` currently `bg-gradient-to-b from-background via-background/95 to-black/90`) and a brand-new toggle control is added where none exists today (`src/modules/hud/components/GameBoardHeader/GameBoardHeader.tsx:54-69`, `rightGroup`, currently only a turn indicator and Start Game button).
- New component signal: yes. There is no settings/options UI anywhere in the active game screen; the toggle needs its own small component with two visual states (on/off), which is more than "implementers follow existing patterns" (S tier) — it needs a real spec for placement, icon/label, and states (`ui-designer-a/b`), hence preview-a/preview-b stay in the pipeline.
- Size/layers: spans 4 areas — `src/modules/shared` (new persisted-preference store + hook, modeled on the existing `toast-store.ts` / `use-toast.ts` split verified in that file), `src/modules/lobby` (`LobbyBackground.styles.ts:3`, extracting the gradient literal so it isn't duplicated), `src/modules/hud` (new toggle component + wiring into `GameBoardHeader`), and `src/features/game/components/GameBoard.tsx` (legacy, unlinted per `eslint.config.mjs` `LEGACY_PATHS`, but still needs the conditional class).
- Gameplay signal: no. Data signal: no — this is a client-only cosmetic preference, not a `GameState`/Firestore field. Confirmed by reading `src/modules/session/player.hook.ts:32,37,67,158` (plain-string `localStorage` key pattern, no JSON) as the convention to follow, and `src/modules/game-board/game-board.types.ts:44-64` + `game-board.reducer.ts:126-129` (`RESET_TURN_UI` spreads back to `initialUIState` every turn) — confirms the per-turn `GameBoardUIState` reducer is the **wrong** place for a persisted preference, since it would silently reset the player's choice every turn.
- Risk: low. No game-rule reducers, Firestore writes/transactions, timers or concurrency touched — no model escalation needed.

## Scope
- In:
  - A shared, localStorage-persisted "background enabled" preference (store + hook) in `src/modules/shared`, following the existing `toast-store.ts`/`use-toast.ts` shape (module-level listeners + dispatch) for cross-component sync, and the plain-string `localStorage` convention from `player.hook.ts` / `TutorialBeacon.tsx:19-38` (default-then-correct-in-effect, to avoid hydration mismatches).
  - Extracting the lobby's sky-gradient Tailwind class (`LobbyBackground.styles.ts:3`) into a single shared constant so the in-game board reuses the exact same value (DRY) instead of duplicating the literal.
  - Applying that background conditionally in `GameBoard.tsx`'s root div, defaulting to on (current dark gradient becomes the "off" state).
  - A small new toggle control, placed per `ui-designer-a/b`'s spec, most likely in `GameBoardHeader`'s `rightGroup`.
- Out:
  - The lobby's animated scene (clouds, islands, monster, knight) — the user asked for the background color/look, not the full decorative scene; the in-game map already renders its own islands.
  - Any server-side/Firestore persistence of the preference (it's a local display preference, not game state).
  - Per-player or per-match settings (this is a local client preference, same for every match).

## Open questions
- None — defaulting the new background to "on" (matches the user's framing: lobby look is the improvement, with an opt-out) and keeping the preference device-local (no Firestore field) rather than asking; both are reversible, low-risk defaults consistent with the Scope above.
