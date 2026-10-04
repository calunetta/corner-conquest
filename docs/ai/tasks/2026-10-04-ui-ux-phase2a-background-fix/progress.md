# Progress: Login/Lobby animated background not rendering

Tier: S · Phases: 1

## Phase 1: fix z-index stacking so the background paints
- [x] regression test proving the background renders (tester-a)
- [x] implementation (implementer-a): LobbyBackground, Login, Lobby stacking-context fix
- [x] checks: typecheck, lint, unit tests
- [x] UI verified (ui-verify) on Login, Lobby, lobby-background testbed preview
- [x] committed: e22eca0

## Log
- 2026-10-04 tester-a: DONE, added 3 failing regression tests (LobbyBackground, Login, Lobby `root stacking context` describe blocks).
- 2026-10-04 implementer-a: DONE, LobbyBackground root -z-10 → z-0; Login and Lobby roots gain explicit z-0 to establish stacking context. All 3 regression tests pass, 1803 tests total passing, typecheck/lint clean, ui-verify screenshots confirm the diorama now renders on Login and the lobby-background testbed preview.
- 2026-10-04 coordinator: independently re-checked test-results/ui-verify/home--desktop.png — full gradient/glow/island diorama visible behind the Login card, not just regex-asserted.
