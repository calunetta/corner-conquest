# Triage: Login/Lobby animated background not rendering

Request: fix the Login/Lobby animated background (floating islands, boats, glow blobs) never painting — backlog item 3 at docs/ai/tasks/2026-10-04-ui-ux-review/ui-design.md.
Type: bug
Tier: S
Pipeline: tester-a implementer-a
Overrides: none
Phases: 1

## Why this tier
- Root cause confirmed by both `ui-designer-a` and `ui-designer-b` (pixel-sampling, computed-style probes): `LobbyBackground.styles.ts:1` — `root: 'fixed inset-0 -z-10 ...'`. Verified directly in this session:
  - `src/modules/session/components/Login/Login.styles.ts:2` — `root: 'relative flex h-screen w-screen ... overflow-hidden'`, no explicit `z-index` → `position:relative` with `z-index:auto` does not establish a new stacking context.
  - `src/modules/lobby/components/Lobby/Lobby.styles.ts:1` — `root: 'relative min-h-screen w-full ... overflow-x-hidden'`, same pattern: no explicit `z-index`.
  - Both wrapping divs render `<LobbyBackground />` as a sibling to their `Card` (`Login.tsx:36`, `Lobby.tsx:18`); the `Card` in both cases has an explicit `z-10` (`Login.styles.ts` card, `Lobby.styles.ts` card). Because neither root div establishes its own stacking context, `LobbyBackground`'s `-z-10` is compared against the page's real root stacking context, where it paints behind opaque ancestor backgrounds (confirmed by ui-designer-b's pixel sampling: every sampled pixel on the Login screen is exactly the raw `--background` token color, not a blend).
  - Fix direction already specified: give `LobbyBackground.styles.ts` root `z-0` instead of `-z-10`, and give `Login.styles.ts` root and `Lobby.styles.ts` root an explicit `z-0` (not `z-index:auto`) so each becomes its own stacking context — mirrors the project's existing `z-20`/`z-30` layering convention (map/HUD).
- 3 files, one layer (styles only, no logic/markup change), solution fully specified by the prior design review — no new ui-designer pass needed.
- Bug with known root cause → `tester-a` first (regression test proving the background paints), then `implementer-a`.
- No gameplay, Firestore, or `GameState` change. No new visual pattern — reuses the existing z-index layering convention.

## Scope
- In: `src/modules/lobby/components/LobbyBackground/LobbyBackground.styles.ts`, `src/modules/session/components/Login/Login.styles.ts`, `src/modules/lobby/components/Lobby/Lobby.styles.ts`. Re-verify both Login and in-game Lobby screens, plus the `lobby-background` testbed preview, render the diorama (gradient, glow blobs, islands, boats) visibly.
- Out: any other backlog item (map hydration, aria-labels, deck copy, player-info labels — already shipped in phase 1; game-log colors, mobile actions-panel reachability — separate tasks).

## Open questions
- None.
