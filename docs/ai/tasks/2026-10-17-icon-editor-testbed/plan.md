# Plan: Icon Editor testbed (XL roadmap)

Status: ROADMAP APPROVED — L-task #1 ready to triage
Inputs: triage.md

This is a roadmap for an Epic (tier XL), not an implementation plan. Section "L-task #1" below is
specified to build-ready detail (File plan/Contracts/Phases/Test plan) because it is this round's
actual deliverable. "Roadmap: later sub-tasks" lists future L-tier work at scope-only detail; each
gets its own triage and plan.md before anyone builds it, per triage.md's Pipeline note.

## Goal and acceptance criteria
- [ ] The user reviews and approves (or sends back) this roadmap before any sub-task is triaged.
- [ ] L-task #1 is specified in enough detail that a future `architect-a` run could skip straight to
      implementer hand-off, or the user can ask for it to be built immediately as its own task.
- [ ] Every later roadmap item cites file counts verified by grep in this session, not estimated.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `TileDecorationEditor` (38 files) | `src/testbed/components/TileDecorationEditor/*` | Closest precedent: registry (`DecorationLayoutsConfig`, JSON file), dev-only API routes under `src/app/api/tile-decoration-editor/`, `.hook.ts`/`.map.ts`/`.service.ts` split, `TileDecorationEditorCanvas`/`Rail`/`Inspector` sub-view split, mode tabs (`decorations` vs `default-elements`). L-task #1 reuses this shape, scoped to icons instead of tile decorations. |
| `DecorationLayoutsConfig`, `DECORATION_LAYOUTS_CONFIG_PATH`, `DECORATION_SCENARIO_KEYS` | `src/testbed/components/TileDecorationEditor/TileDecorationEditor.types.ts:1`, `src/modules/map/decoration-layouts.types.ts` (re-exported via `@/modules/map`) | Precedent for a config type + a `DECORATION_LAYOUTS_CONFIG_PATH`-style string constant the save route resolves with `path.join(process.cwd(), ...)`. |
| `listDecorationImages`, `saveDecorationLayouts`, `saveDefaultElements` | `src/testbed/components/TileDecorationEditor/TileDecorationEditor.service.ts:10-46` | Precedent for the only-`fetch`-callers file; icon editor's service mirrors this (`listIconImages`, `saveIconOverrides`). |
| Two dev-only API routes, `NODE_ENV==='production'` gate, not `isTestbedEnabled()` | `docs/ai/tasks/2026-10-15-tile-decoration-editor/plan.md` Decisions (route gate), `find src/app/api` precedent | Same gate reused for the icon editor's routes — filesystem writes must 404 in any deployed build regardless of the QA testbed-in-prod flag. |
| `FightIcon`, `InfoIcon`, `ResourceIcon` | `src/modules/shared/fight-icon.tsx:4-17`, `src/modules/shared/info-icon.tsx`, `src/modules/shared/resource-icon.tsx`, re-exported `src/modules/shared/index.ts:11-13` | The only 3 places a sprite-based icon is already behind a shared component, not a raw inline `<Image>`. The future override-resolution layer (roadmap item 2) wires these first because they need no new call-site refactor. |
| 47 files import from `lucide-react` | grepped this session: `grep -rl "from 'lucide-react'" src \| wc -l` → 47 | Every glyph is a direct `<IconName />` JSX call at its render site — no shared wrapper exists for lucide icons today. Confirms triage.md's "~43 files" estimate (47 here; triage's count likely predated 4 new files since). |
| 34 files import from `next/image`, excluding `.test.tsx`/`.preview.tsx` | grepped this session: `grep -rl "from 'next/image'" src \| grep -v -E "\.(test\|preview)\.(ts\|tsx)$" \| wc -l` → 34 | Sprite/image icon usage, overlapping somewhat with the lucide set per file (a dialog can use both). |
| Per-module file counts (union of lucide + next/image hits, de-duplicated, tests/previews excluded), grepped this session | combat 10, cards 8, hud 11, map 11, lobby 7, session 5, game-board 1, features/game 2, shared 3 | Direct basis for splitting the "wire overrides into render sites" work into L-sized (~6-11 files) module sub-tasks in the roadmap below. |
| `LEGACY_PATHS` | `eslint.config.mjs:12-17` (`src/features/**`, `src/lib/**`, `src/ai/**`, config files) | `src/features/game/components/GameBoard.tsx` and `PlayerInfoBar.tsx` (2 of the 47 lucide hits) sit in this exemption — any future wiring there is minimal legacy-wiring edits only, not a full module migration, consistent with CLAUDE.md's "Where code goes." |
| `resolveJsonModule: true` | `tsconfig.json:12` (re-verified from the decoration-editor plan's own citation; not re-read this session, carried from that precedent) | Lets the icon registry/config be a plain `.json`, statically imported by both game code and the editor, same as `decoration-layouts.config.json`. |
| `public/sprites/decorations/` seeded via dev API route | `docs/ai/tasks/2026-10-15-tile-decoration-editor/plan.md` File plan Phase 2 | Precedent for triage's resolved storage answer: `public/sprites/` via a dev-only API route, not Firebase Storage. |

## Decisions
- **L-task #1 builds only the registry, config schema, upload/rotate/size UI and testbed-only live preview — no render-site wiring**, because triage.md's resolved open question says so explicitly ("Live wiring: not required for v1") and the TileDecorationEditor precedent shows this layer alone is a full L-tier task (~15-20 files for logic+view+tests+previews, comparable to Phases 2-3 of that precedent, 20 files total). Rejected: bundling the registry with even one module's wiring (makes L-task #1 itself XL, defeats the point of the roadmap split).
- **One flat icon registry entry shape covers both lucide glyphs and sprite images** (`defaultSource: { kind: 'lucide'; name: string } | { kind: 'image'; src: string }`), because triage's resolved scope is "everything" and a future render site needs one lookup call regardless of which kind the icon originally was — two separate registries would force every future wiring task to know which table to check. Rejected: splitting into `lucideIconRegistry`/`spriteIconRegistry` (simpler schema per table, but doubles the config/service/route surface for no benefit the UI needs — the testbed list groups by module either way, not by source kind).
- **Per-icon override config is a separate JSON file from the registry** (registry is a generated/curated catalog of what exists; overrides are what the user has customized), mirroring the decoration editor's split between `decoration-layouts.config.json` (the real data) and the registry/catalog implicit in `DECORATION_SCENARIO_KEYS`. This keeps "reset to default" trivial (delete the override entry) and keeps the registry file hand-curated/reviewable in a PR without override noise. Rejected: one merged file (simpler to load, but every override edit would rewrite catalog entries the user never touched, producing noisy diffs).
- **The registry is hand-authored, not auto-discovered by scanning source files for `lucide-react`/`next/image` imports.** Triage's 47+34 file counts are evidence of *usage sites*, not a stable list of *distinct icons* (many files reuse the same lucide glyph or the same sprite path). Auto-discovery would need an AST scan step with its own correctness risk; hand-authoring the registry in L-task #1 (seeded from this session's grep output, deduplicated by icon identity) is simpler and auditable. Rejected: a build-time codemod scanning imports (overkill for a dev tool whose whole icon catalog turns over slowly).
- **Module-wiring roadmap items are grouped by the file-system module boundary already in place** (`src/modules/<domain>/`), not by UI concept (e.g. "all resource icons across modules"), because CLAUDE.md's import boundaries already make cross-module edits the expensive case — grouping by module keeps each wiring sub-task's owner inside one module's `index.ts` boundary. Rejected: grouping by icon *type* across modules (e.g. "all card-suit icons") — would touch combat, cards and hud files in the same sub-task, each needing a different module owner.
- **A new "override-resolution" roadmap item (item 2) comes before any per-module wiring item**, because every module-wiring task needs the same lookup primitive (`resolveIcon(id)` or equivalent) to exist first — building it once, wired into the 3 existing shared wrappers (`FightIcon`/`InfoIcon`/`ResourceIcon`) as its proof, avoids each of the 6 later per-module tasks re-deriving the resolution contract independently. Rejected: let the first per-module task (combat) invent the resolver inline (couples an unrelated module's task to designing shared infrastructure, and the other 5 modules would then depend on combat's task finishing first anyway).

## L-task #1: Icon registry, override config, testbed editor

### File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/icons/icon-registry.types.ts` | new | `IconSourceKind`, `IconDefaultSource` (discriminated union lucide/image), `IconRegistryEntry { id, label, module, defaultSource, defaultRotation, defaultSize }`, `IconOverride { src?, rotation?, size? }`, `IconOverridesConfig = Record<string, IconOverride>`, `ICON_OVERRIDES_CONFIG_PATH` | implementer-a |
| `src/modules/icons/icon-registry.config.json` | new | Hand-authored catalog, one entry per *distinct* icon identity (deduplicated lucide name / sprite path), grouped by `module` field; seeded from this session's grepped file lists | implementer-a |
| `src/modules/icons/icon-overrides.config.json` | new | Starts as `{}` (no overrides yet) | implementer-a |
| `src/modules/icons/index.ts` | new | Barrel: types, both config objects, `ICON_OVERRIDES_CONFIG_PATH` | implementer-a |
| `src/testbed/components/IconEditor/IconEditor.types.ts` | new | View-model/handler shapes (mirrors `TileDecorationEditorViewModel`'s shape, scoped to icons) | implementer-a |
| `src/testbed/components/IconEditor/IconEditor.map.ts` | new | Pure helpers: `toModuleGroups(registry)`, `toIconViewModel(entry, override)`, `clampRotation`, `clampSize` | implementer-a |
| `src/testbed/components/IconEditor/IconEditor.fixtures.ts` | new | Small sample registry + overrides config + sample uploaded-image list, for hook/view tests and the preview | implementer-a |
| `src/testbed/components/IconEditor/IconEditor.service.ts` | new | `listIconUploads()`, `saveIconOverrides(config)` — only files that call `fetch` | implementer-a |
| `src/testbed/components/IconEditor/IconEditor.hook.ts` | new | `useIconEditor()`: loads registry (static import) + overrides (fetched or static import, TBD in Contracts of that task's own plan), per-icon upload/rotation/size handlers, save | implementer-a |
| `src/testbed/components/IconEditor/index.ts` | new | Barrel | implementer-a |
| `src/app/api/icon-editor/uploads/route.ts` | new | `GET`: list previously uploaded files in `public/sprites/icon-overrides/`; `POST`: accept a multipart upload, write it into that folder, return its public path. Both 404 in production | implementer-a |
| `src/app/api/icon-editor/overrides/route.ts` | new | `POST`: validate body against `IconOverridesConfig`, write `ICON_OVERRIDES_CONFIG_PATH`. 404 in production | implementer-a |
| `src/testbed/components/IconEditor/IconEditor.map.test.ts` | new | Pure-helper cases | tester-a |
| `src/testbed/components/IconEditor/IconEditor.hook.test.ts` | new | Hook cases (service mocked) | tester-a |
| `src/app/api/icon-editor/uploads/route.test.ts` | new | GET/POST cases, `fs/promises` mocked | tester-a |
| `src/app/api/icon-editor/overrides/route.test.ts` | new | POST cases, `fs/promises` mocked | tester-a |
| `src/testbed/components/IconEditor/IconEditor.styles.ts` | new | Tailwind classes for the grouped list + per-icon controls + live preview | implementer-b |
| `src/testbed/components/IconEditor/IconEditor.tsx` | new | Composes module-grouped list, per-icon upload/rotation/size controls, live preview, from `useIconEditor()` | implementer-b |
| `src/testbed/components/IconEditor/IconEditorRow.tsx` | new | One icon's row: label, current/override thumbnail, upload button, rotation slider, size slider | implementer-b |
| `src/testbed/components/IconEditor/IconEditor.test.tsx` | new | View test, hook mocked | tester-b |
| `src/testbed/components/IconEditor/IconEditor.preview.tsx` | new | One state, "Editor", against fixtures | preview-a |
| `src/testbed/registry.ts` | edit | Add `iconEditorPreview` import + array entry | preview-a |

This File plan is a scope estimate for sizing (~20 files, matching the TileDecorationEditor logic+view
precedent), not a build contract. A dedicated `architect-a`/`architect-b` pass re-derives the exact
Contracts block (full `IconRegistryEntry` shape, the hook's return type, the two routes' request/response
bodies, and the seeded registry's actual entries deduplicated from the per-module file lists above) when
this sub-task is triaged on its own, per triage.md's Epic rule.

### Test plan (scope only, detailed cases deferred to that task's own plan.md)
- tester-a: registry/override map helpers (`toModuleGroups`, clamp functions), hook state transitions (upload sets override, rotation/size slider changes mark dirty, save calls the service), both API routes (list, upload-write, override-write, production 404s).
- tester-b: row renders current vs override thumbnail, rotation/size controls fire the right handlers, save button states (idle/saving/saved/error) matching the decoration editor's precedent.

### Preview states
- `IconEditor`: one state, "Editor", rendering the real component against `IconEditor.fixtures.ts`'s sample registry (a handful of icons spanning combat/hud/map so the "grouped by module" list isn't trivially one group) and a small sample overrides config (at least one icon already overridden, one not), service mocked at the preview level (same pattern as `TileDecorationEditor.preview.tsx`).

## Roadmap: later sub-tasks (each triaged separately; file counts grepped this session)

1. **Override-resolution core: resolver + wire the 3 shared icon primitives.**
   - Scope: build the lookup primitive every later wiring task depends on (e.g. a `useIconOverride(iconId)` hook or a `resolveIconSrc(iconId)` map function reading `icon-overrides.config.json`), then wire it into `FightIcon`, `InfoIcon`, `ResourceIcon` as its first real call sites — these already sit behind a shared component, so no call-site refactor is needed to prove the resolver works end to end.
   - Files: `src/modules/shared/fight-icon.tsx`, `info-icon.tsx`, `resource-icon.tsx` (edit, 3 files, verified at `src/modules/shared/index.ts:11-13`), plus a new resolver module (e.g. `src/modules/icons/resolve-icon.ts` or similar, 1-2 files) and its tests (2-3 files). ~8 files total.
   - Why L not M/S: new shared infrastructure plus 3 call sites plus tests/preview updates for each — more than a single-file fix, but bounded to 3 known files, well under XL.

2. **Wire overrides — Combat module.**
   - Scope: replace direct lucide/`next/image` icon usage in combat dialogs with the resolver from item 1.
   - Files (verified this session, union of lucide + next/image hits, 10 files): `MonsterCombatDialog/MonsterResultsScreen.tsx`, `MonsterAttackScreen.tsx`, `MonsterCombatCardSelector.tsx`, `MonsterSpectatorScreen.tsx`, `MonsterSelectionDialog/MonsterSelectionDialog.tsx`, `CombatDialog/CombatDialog.tsx`, `CombatDialog/CombatantCard.tsx`, `AttackSelectionDialog/AttackSelectionDialog.tsx`, `ArmySelectionDialog/ArmySelectionDialog.tsx`, `PositionDialog/PositionDialog.tsx` (all under `src/modules/combat/components/`).
   - Why L not XL: 10 files, one module boundary, each edit is a mechanical swap (import the resolver, replace the icon element) — no new abstraction needed after item 1 exists.

3. **Wire overrides — Cards module.**
   - Scope: same swap for card dialogs.
   - Files (8, verified, `src/modules/cards/components/`): `CardsDialog/CardsDialog.tsx`, `ProductiveCardDialog/ProductiveCardDialog.tsx`, `SabotageDialog/SabotageDialog.tsx`, `AbilitiesDialog/AbilitiesDialog.tsx`, `StealResourceDialog/ResourceSelectionStep.tsx`, `StealResourceDialog/PlayerSelectionStep.tsx`, `SpecialIslandRollDialog/SpecialIslandRollDialog.tsx`, `WealthyDialog/WealthyDialog.tsx`.
   - Why L not XL: 8 files, one module, mechanical swap.

4. **Wire overrides — HUD module.**
   - Scope: same swap for HUD chrome (player info, actions panel, game log, status badges).
   - Files (11, verified, `src/modules/hud/components/`): `PlayerInfo/PlayerInfo.tsx`, `PlayerInfo/PlayerInfoStats.tsx`, `PlayerInfo/BuffIcons.tsx`, `GameStatusBadge/GameStatusBadge.tsx`, `ActionsPanel/ActionButton.tsx`, `ActionsPanel/ActionsPanel.tsx`, `ActionsPanel/MobileActionsBar.tsx`, `ActionsPanel/MobileSheetTriggers.tsx`, `GameLog/GameLog.tsx`, `GameBoardHeader/GameBoardHeader.tsx`, `TutorialBeacon/TutorialBeacon.tsx`.
   - Why L not XL: "about 6 files or one module's worth" — this is one module's worth (11), same mechanical swap pattern as items 2-3, no new design decisions; triage's own sizing rule allows a whole module even above 6 files when the work per file is uniform and small.

5. **Wire overrides — Map/sprites module.**
   - Scope: same swap for map-rendered sprites (island tiles, boats, fog, effects) — the one place sprite *size/rotation* overrides are most likely to be visually load-bearing (these are `next/image fill` elements inside positioned containers, not fixed-size UI icons).
   - Files (11, verified, `src/modules/map/components/`): `MapZoomControls/MapZoomControls.tsx`, `IslandTile/IslandTile.tsx`, `TileBoats/TileBoats.tsx`, `CardRevealEffect/CardRevealEffect.tsx`, `MapDecorations/MapDecorations.tsx`, `AnimatedMonster/AnimatedMonster.tsx`, `TileResources/TileResources.tsx`, `DeathEffect/DeathEffect.tsx`, `TileOccupants/TileOccupants.tsx`, `TileDecorations/TileDecorations.tsx`, `TileFog/TileFog.tsx`.
   - Why L not XL: one module's worth (11), but flag in that task's own triage that rotation/size overrides on `fill`-positioned sprites may need a different CSS treatment than fixed-box UI icons (worth a design decision there, not here) — still bounded to known files, not open-ended.

6. **Wire overrides — Lobby module.**
   - Scope: same swap for lobby screens.
   - Files (7, verified, `src/modules/lobby/components/`): `RejoinMatchPanel/RejoinMatchPanel.tsx`, `Lobby/Lobby.tsx`, `CreateGameDialog/CreateGameDialog.tsx`, `CreateGameDialog/CreateGameDialog.types.ts`, `CreateGameDialog/CreateGameDialog.map.ts`, `LobbyGameRow/LobbyGameRow.tsx`, `LobbyBackground/LobbyBackground.tsx`.
   - Why L not M: 7 files, one module, but `CreateGameDialog` touches its `.types.ts`/`.map.ts` too (icon choice appears to feed a map function, not just the view) — slightly more than a pure view swap, still bounded and single-module.

7. **Wire overrides — Session dialogs + legacy misc.**
   - Scope: same swap for session-lifecycle dialogs, plus the two `LEGACY_PATHS`-exempt legacy files and the one `game-board` dialog that also use icons — grouped together because each is small (1-5 files) and none alone clears M-tier's "worth its own task" bar.
   - Files (8 total, verified): `src/modules/session/components/` — `VictoryDialog/VictoryDialog.tsx`, `HostLeaveDialog/HostLeaveDialog.tsx`, `ConfirmExitDialog/ConfirmExitDialog.tsx`, `LinkGoogleAccountButton/LinkGoogleAccountButton.tsx`, `Login/Login.tsx` (5); `src/modules/game-board/components/ConnectionWarningDialog/ConnectionWarningDialog.tsx` (1); legacy `src/features/game/components/GameBoard.tsx`, `PlayerInfoBar.tsx` (2, `LEGACY_PATHS`-exempt per `eslint.config.mjs:12-17` — minimal wiring only, no module migration).
   - Why L not M or XL: spans 3 small module/legacy boundaries that don't individually justify separate tasks (5, 1, 2 files), but together are still a single mechanical pattern applied ≤8 times — not open-ended enough to be XL, not small enough to be one M task per CLAUDE.md's "about 6 files" guidance for a single task.

Items 2-7 are independent of each other once item 1 exists; they can be triaged and built in any order,
or in parallel by different coordinator runs, since each touches only its own module's files and the
shared registry/override config files (read-only from their side).

## Risks
- **Registry staleness.** A hand-authored `icon-registry.config.json` (L-task #1) will drift from the
  real render sites as the app changes, unlike an auto-discovered one. Mitigated by scoping L-task #1's
  registry to "icons in active use as of this session's grep" and treating future additions as a normal
  part of whichever module-wiring task touches that file next — not solved generically here.
- **Map/sprites module (roadmap item 5) may need a design decision this roadmap doesn't make**: whether
  rotation/size overrides apply the same way to `next/image fill` sprites as to fixed-box UI icons. Flagged
  in item 5 above; deferred to that sub-task's own triage/plan, not decided here.
- **This session's per-module file counts will shift between now and when each roadmap item is actually
  triaged** (the repo keeps changing). Each sub-task's own `architect-a` must re-grep before finalizing its
  File plan, not trust the counts in this roadmap verbatim.

## Review (architect-b)

VERDICT: APPROVED

Re-ran every grep cited in this plan rather than trusting the numbers (per the plan's own
drift warning):
- `lucide-react` (47), `next/image` excl. test/preview (34): both confirmed exact.
- Per-module file lists for combat (10), cards (8), hud (11), map (11), lobby (7), session (5),
  game-board (1), `features/game` (2): every file name and count matches `grep -l`, including
  the `.types.ts`/`.map.ts` members of the lobby's `CreateGameDialog` set.
- `src/modules/shared/index.ts:11-13` exports `ResourceIcon`/`FightIcon`/`InfoIcon`: confirmed,
  lines match exactly.
- `tsconfig.json:12` `resolveJsonModule: true`, `eslint.config.mjs:12-17` `LEGACY_PATHS`
  (`src/features/**`, `src/lib/**`, …), decoration editor's `NODE_ENV === 'production'` gate
  (`src/app/api/tile-decoration-editor/images/route.ts:11`) and
  `DECORATION_LAYOUTS_CONFIG_PATH` (`src/modules/map/decoration-layouts.types.ts:59-60`): all
  confirmed as cited.
- Found and fixed three numeric drifts (folded in directly, no re-review needed):
  `TileDecorationEditor` is 38 files, not 34 (`find … -type f | wc -l`); its Phases 2-3 are 20
  files, not 22 (12 + 8 rows); roadmap item 7's file list sums to 8 (5+1+2), not 11 — its own
  "why" line double-counted the same error. None of these numbers were load-bearing for a
  decision (the "why L" arguments still hold at the corrected counts), so no re-approval needed.
- Full-repo re-grep for the old `TileForest`/decoration-editor naming patterns this plan might
  collide with: none found outside the precedent's own folder; no invented paths elsewhere in
  `.claude/`, scripts or docs reference this task's new paths yet (nothing to collide with,
  since none of its files exist).

Design review:
- Scope boundary holds throughout: L-task #1's File plan touches only
  `src/modules/icons/*`, `src/testbed/components/IconEditor/*`,
  `src/app/api/icon-editor/*` and one edit to `src/testbed/registry.ts`. No render site
  (`FightIcon`, any combat/cards/hud/map/lobby/session component) is touched — confirmed by
  reading every row of the File plan against the Decisions' explicit "no render-site wiring"
  rule.
- L-task #1 matches the Tile Decoration Editor precedent's shape (File plan, Decisions, Test
  plan, Preview states) and is detailed enough to triage directly: types, config shape, hook
  surface, both route contracts' responsibilities and test scope are all named. Deferring the
  exact `Contracts` block (full `IconRegistryEntry` shape, hook return type, route
  request/response bodies) to that sub-task's own `architect-a` pass is correct per triage.md's
  Epic rule ("each sub-task gets triaged on its own") — it is not a gap in this roadmap, it's the
  boundary the Epic tier draws on purpose.
- Sequencing is right: item 1 (override-resolution core, wired into the 3 existing shared icon
  components as proof) must land before any of items 2-7's per-module swaps, since every one of
  them calls the same resolver. Items 2-7 are correctly flagged independent of each other once
  item 1 exists.
- Each of items 1-7 is bounded to a verified file list (8, 10, 8, 11, 11, 7, 8 files
  respectively) with a one-module or one-new-primitive scope and a uniform, mechanical edit
  pattern per file — none reads as accidentally XL (no item needs a new cross-module
  abstraction beyond item 1's resolver) or accidentally M (each is justified against
  CLAUDE.md's "about 6 files" phase-split heuristic, used here as a rough sizing signal since
  the triage skill itself ties L/XL to scope, not a hard file count).
- The registry-is-hand-authored and one-flat-registry-shape decisions are each justified against
  a rejected alternative with a concrete reason (noisy diffs, doubled route surface, AST-scan
  risk) — not asserted without a tradeoff.

No blocking findings. Status set to ROADMAP APPROVED — L-task #1 ready to triage.
