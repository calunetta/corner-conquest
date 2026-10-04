# Triage: Migrate Lobby domain to src/modules

Request: Move `src/features/lobby/components/Lobby.tsx`, `LobbyBackground.tsx`, `LobbyGameRow.tsx`, `CreateGameDialog.tsx`, `CustomSettingsSheet.tsx` into `src/modules/<domain>/` per the component-architecture standard (row #9 of `docs/ai/refactor.md`). No row dependencies.
Type: refactor
Tier: M
Pipeline: architect-a architect-b implementer-a implementer-b tester-a tester-b preview-a preview-b architect-b:final-review
Overrides: implementer-a=sonnet, tester-a=sonnet
Phases: 2

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier
- Files touched (verified, 5 files / 1152 LOC): [Lobby.tsx](../../../../src/features/lobby/components/Lobby.tsx) (307), [LobbyBackground.tsx](../../../../src/features/lobby/components/LobbyBackground.tsx) (266), [CreateGameDialog.tsx](../../../../src/features/lobby/components/CreateGameDialog.tsx) (232), [CustomSettingsSheet.tsx](../../../../src/features/lobby/components/CustomSettingsSheet.tsx) (203), [LobbyGameRow.tsx](../../../../src/features/lobby/components/LobbyGameRow.tsx) (144).
- Firestore/impurity check: `Lobby.tsx` imports `db, collection, doc, query, where, onSnapshot, setDoc, runTransaction` from `@/lib/firebase` and calls `runTransaction` to join a game — a real-time listener plus a transactional write, not a pure view. The other four files have no `firebase`, `Math.random`, or `Date.now` hits — pure view/state.
- `max-lines` cap (`eslint.config.mjs:73`, 150 lines, legacy-exempt): `Lobby.tsx`, `CreateGameDialog.tsx` and `LobbyBackground.tsx` are all over the cap and lose their legacy exemption on the move, forcing a split (e.g. `Lobby.tsx`'s Firestore subscription/join logic into a `.hook.ts`, matching the `useGameBoard` precedent from row #1). `CustomSettingsSheet.tsx` (203) also needs a split; `LobbyGameRow.tsx` (144) fits as-is.
- Call sites (grep across `src e2e docs scripts .claude CLAUDE.md`): all five are imported only within the lobby tree itself (`Lobby.tsx` imports the other four) except the entry point `src/app/page.tsx`, which imports `Lobby` and `LobbyBackground` directly (row #11, pending, depends on this row). `docs/README.md` documents all five by name and must be updated. Two in-flight migration plans (`game-rules-core-migration`) already repointed two import lines inside `CreateGameDialog.tsx` and `CustomSettingsSheet.tsx` to `@/modules/game-rules` — verify those land before this row's implementers touch the same lines, to avoid reverting them.
- No gameplay/rule change, no `GameState` or Firestore document-shape change, no new visible UI — behavior and visuals must stay identical, same contract as rows #5–#7. Comparable in size to row #3 (877 LOC/3 files, M tier, 3 phases); this row is larger (1152 LOC/5 files) but one file's Firestore transaction is the only real-risk surface, so it stays at M with a sonnet escalation on the layer that owns it rather than jumping to L.
- Risk: `Lobby.tsx`'s `onSnapshot` listener and `runTransaction` join flow are the one piece of real risk (concurrent joins, listener cleanup) — escalate `implementer-a` and `tester-a` (the layer that will own the extracted hook/service) to sonnet per the Firestore-writes/transactions rule. The remaining four files are straightforward view moves.

## Scope
- In: moving the 5 named files into `src/modules/<domain>/` per component-architecture, preserving exact current behavior and visuals; splitting any file over the 150-line cap (expected: `Lobby.tsx`, `CreateGameDialog.tsx`, `LobbyBackground.tsx`, `CustomSettingsSheet.tsx`) into view/hook/styles/types per the standard anatomy; updating the import site in `src/app/page.tsx`; testbed previews for each visual component; updating `docs/README.md`'s lobby section and refactor.md row #9 status.
- Out: any change to lobby content, copy, layout, join/create flow behavior, or the `GameState`/Firestore document shape; migrating `src/app/page.tsx` itself (row #11, depends on this row); resolving the two still-legacy `@/modules/game-rules` import lines if `game-rules-core-migration` has not yet landed them (architect-a checks status first and coordinates, doesn't duplicate the edit).

## Open questions
- none
