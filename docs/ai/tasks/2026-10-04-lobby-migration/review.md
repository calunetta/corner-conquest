# Final review: Lobby migration, phase 1 (logic layer)

VERDICT: APPROVED

## Checks run
- `npm run typecheck`: 5 errors, all expected — `Cannot find module './<Name>'` in `Lobby/index.ts`, `LobbyBackground/index.ts`, `LobbyGameRow/index.ts`, `CreateGameDialog/index.ts`, `CustomSettingsSheet/index.ts`, each pointing at the `.tsx` Phase 2 hasn't written yet. No other errors.
- `npm run lint`: clean (`eslint . --max-warnings 0 --no-error-on-unmatched-pattern`, no output). Confirms every new non-test file is under the 150-line cap (test files are exempt, `eslint.config.mjs:115-118`) and no import-boundary violation (Firestore confined to `lobby.service.ts`, no deep `@/modules/*/*` import, no `@/features/*` import in a `.hook.ts`).
- `npx jest src/modules/lobby`: `Test Suites: 8 passed, 8 total`, `Tests: 102 passed, 102 total`.
- ui-verify: not applicable this phase — no view files exist yet (Phase 2).

## Plan adherence
All 6 Phase-1 steps from `plan.md`'s Phases section are present and match the File plan and Contracts exactly:
- `lobby.service.ts`/`.test.ts`: all 4 functions (`subscribeToOpenGames`, `createGameId`, `saveGame`, `joinOpenGame`) match the contract signatures, error strings (`'Game not found.'`, `'This game has already started or is no longer available.'`, `'This game is full.'`, `'Could not add player to game. The room might be full or color unavailable.'`), and the already-in-game silent no-op. Mocks `@/lib/firebase`, never touches real Firestore.
- `Lobby.types.ts`/`.hook.ts`/`.fixtures.ts`/`index.ts`/`.hook.test.ts`: `LobbyViewModel` matches the contract field-for-field; `useLobby` ports `handleCreateGame`/`handleJoinGame` behavior exactly (solo game saves twice via `startGame`, join toasts `'Could Not Join'` with the thrown message, subscribe/unsubscribe on mount/unmount). `index.ts` pre-exports `LobbyView` for Phase 2, per the contract's `Lobby.tsx` shape.
- `LobbyBackground.types.ts`/`.map.ts`/`index.ts`/`.map.test.ts`: `LOBBY_ISLANDS`/`LOBBY_BOATS` verified byte-for-byte against `git`-tracked `src/features/lobby/components/LobbyBackground.tsx` (all 7 islands' wrapper/card classNames, sprite `src`/`alt`/dimensions, and both boats) — exact match, including the legacy `w-30 h-30` class on the ogre-pasture card kept verbatim. Test suite additionally verifies every sprite path resolves to a real file under `public/sprites`, stronger than the plan's "cross-check against the legacy file's literal strings."
- `LobbyGameRow.types.ts`/`.map.ts`/`.fixtures.ts`/`index.ts`/`.map.test.ts`: `toSettingsSummaryRows` reproduces the legacy `SettingsDisplay`'s 7 rows in the same order/labels/rounding.
- `CreateGameDialog.types.ts`/`.map.ts`/`.hook.ts`/`.fixtures.ts`/`index.ts`/`.map.test.ts`/`.hook.test.ts`: `toFactionOptions` and `useCreateGameDialog` reproduce the legacy `debugMode`-on-`maxPlayers===1`, `numBots`, `fogOfWar` and submit-guard logic exactly, including the dialog-close-only-on-success behavior.
- `CustomSettingsSheet.types.ts`/`.map.ts`/`.hook.ts`/`.fixtures.ts`/`index.ts`/`.map.test.ts`/`.hook.test.ts`: `GENERAL_SLIDERS`/`COST_SLIDERS` min/max/step values match the legacy `renderSlider` calls field-for-field; `toSliderDisplayValue` reproduces the percentage-vs-raw-number split; hook seeds state once from `initialSettings` (not re-synced), matching the "seeded once" contract note, verified by its own test.
- `src/modules/lobby/index.ts`: exports only `Lobby` and `LobbyBackground`, matching the plan's module-index precedent.

## Findings
None.

## Docs
- `docs/README.md`: not touched this phase — plan assigns that edit to implementer-b in Phase 2 (File plan, `docs/README.md` row).
