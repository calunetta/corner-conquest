# Plan: No boats visible anywhere on the live game board

Status: APPROVED
Inputs: triage.md

## Goal and acceptance criteria
- [ ] On a live match (real `GameBoardProvider`/Firestore state, not the testbed), each Base tile shows its owner's anchored boat, per `docs/README.md:445`.
- [ ] Idle and farming collector overlays render on occupied tiles again.
- [ ] `TileForest` decoration renders above the terrain background again (same defect class, same fix).
- [ ] A regression test fails on the pre-fix code and passes after, so this exact defect (an off-scale `z-<n>` class that silently compiles to no CSS) can't reappear unnoticed in `src/modules/map`.
- [ ] Unit sprite clipping at a tile's bottom edge is separately verified in the browser after the fix lands: if it persists, it is reported as a new, distinct finding, not folded into this fix (see Risks).

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `IslandTileView` render order | `src/modules/map/components/IslandTile/IslandTile.tsx:90-106` | DOM order: `.terrain` (90) → `DeathEffect` (92-98) → `TileForest` (100) → `TileBoats` (102) → `.centerContent` (104) → `TileOccupants` (106). Stacking order among positioned elements follows explicit `z-index` value first, DOM order only breaks ties at the same level. |
| `styles.terrain` | `src/modules/map/components/IslandTile/IslandTile.styles.ts:47` | `'absolute inset-0 z-10 ...'` — `z-10` is a real Tailwind utility (confirmed below), so this element always has a genuine positive `z-index`. |
| `styles.centerContent` | `src/modules/map/components/IslandTile/IslandTile.styles.ts:48` | `z-20`, also a real utility. |
| `styles.container` (boats) | `src/modules/map/components/TileBoats/TileBoats.styles.ts:2` | `'pointer-events-none absolute inset-0 z-25 select-none'` — `z-25` is not a Tailwind class (see below). |
| `styles.collectorOverlay` (boats) | `src/modules/map/components/TileBoats/TileBoats.styles.ts:6` | `z-26`, same defect. |
| `styles.container` (resources) | `src/modules/map/components/TileResources/TileResources.styles.ts:2` | `z-28`, same defect — hides farming collectors. |
| `styles.collectorOverlay` (resources) | `src/modules/map/components/TileResources/TileResources.styles.ts:6` | `z-35`, same defect. |
| `styles.container` (forest) | `src/modules/map/components/TileForest/TileForest.styles.ts:2` | `z-12`, same defect. |
| `styles.root` (map decorations) | `src/modules/map/components/MapDecorations/MapDecorations.styles.ts:2` | `z-5`, same defect — happens to look correct today only because any explicit positive `z-index` beats `auto` regardless of the intended ordinal, not because `z-5` works. |
| `styles.container` (occupants) | `src/modules/map/components/TileOccupants/TileOccupants.styles.ts:4` | `z-30` — a real Tailwind utility. Confirms occupants are NOT part of this defect; the clipped-sprite report needs a separate cause (see Risks). |
| `styles.grid` | `src/modules/map/components/MapGrid/MapGrid.styles.ts:5` | `z-10`, real utility, unaffected. |
| Tailwind default `zIndex` scale | verified via `node -e "console.log(Object.keys(require('tailwindcss/defaultTheme').zIndex))"` → `['0','10','20','30','40','50','auto']` | `5, 12, 25, 26, 28, 35` are not in this list. |
| `tailwind.config.ts` | `tailwind.config.ts:14-110` | `theme.extend` has `backgroundImage`, `fontFamily`, `colors`, `borderRadius`, `keyframes`, `animation` — no `zIndex` key, so nothing widens the scale project-wide. |
| `cn()` | `src/lib/utils.ts:1-5` | `twMerge(clsx(inputs))` — confirmed this is not the cause of any corner-position class conflict in `TileOccupants`; ruled out as a contributing factor. |
| `public/sprites/boat.gif` | verified with `ls` | exists — ruled out a missing-asset cause for the boat image itself. |
| `toTileBoatsViewModel`, `useTileBoats` | `src/modules/map/components/TileBoats/TileBoats.map.ts:32-125`, `TileBoats.hook.ts:1-17` | Confirmed correct per triage (`87e4eca`); not touched by this plan. |
| `tileBoatsPreview` | `src/modules/map/components/TileBoats/TileBoats.preview.tsx:52-82` | Renders `TileBoatsView` standalone, with no `.terrain` sibling present — this is why the existing preview never reproduced the defect even though it exercises the same CSS classes. |

## Root cause (bugs only)
- Reproduction: render `IslandTile` inside the real game board (any live match) and inspect a Base tile's computed styles — the `TileBoats` container's `z-index` computes to `auto`, not `25`, because Tailwind never generated a `.z-25` rule.
- Cause: `TileBoats.styles.ts:2,6`, `TileResources.styles.ts:2,6`, `TileForest.styles.ts:2`, and `MapDecorations.styles.ts:2` use bare numeric `z-<n>` classes (`z-5`, `z-12`, `z-25`, `z-26`, `z-28`, `z-35`) that are outside Tailwind's default `zIndex` scale (`0,10,20,30,40,50,auto`, confirmed above) and not in Tailwind's arbitrary-value bracket syntax. Tailwind's JIT compiler silently skips unrecognized utility names — it does not error, and the class string still appears in the DOM, so RTL/`data-testid` assertions in existing tests pass. The element keeps `position: absolute` (from the same class string) but gets no `z-index` declaration, i.e. `z-index: auto`. `.terrain` (`z-10`, a real utility, `IslandTile.styles.ts:47`) always paints above any sibling at `z-index: auto` regardless of DOM order, so `TileBoats` and `TileForest` — rendered after `.terrain` in the DOM (`IslandTile.tsx:100,102`) — are fully hidden behind the opaque terrain background image on every tile, including Base tiles. The same defect hides `TileResources`'s farming-collector overlay. `TileOccupants` (`z-30`, a real utility) is unaffected, which is why unit/army sprites still render — their separately reported clipping has a different, unverified cause (see Risks).
- Why existing tests and the testbed preview missed it: unit tests render through RTL/jsdom, which doesn't compute real CSS cascade/paint order from Tailwind's generated stylesheet, so an absent `z-index` rule is invisible to `toHaveClass`-style assertions. `tileBoatsPreview` (`TileBoats.preview.tsx:52-82`) renders `TileBoatsView` in isolation, with no sibling `.terrain` element to occlude it, so the preview looked correct independent of whether `z-25` actually compiled.

## Decisions
- Fix each of the six bare numbers by switching to Tailwind's arbitrary-value bracket syntax (`z-5` → `z-[5]`, `z-12` → `z-[12]`, `z-25` → `z-[25]`, `z-26` → `z-[26]`, `z-28` → `z-[28]`, `z-35` → `z-[35]`), preserving the exact intended stacking order and every other class in the string unchanged. This is a guaranteed-valid Tailwind 3 JIT feature (no version check needed beyond the confirmed installed major), requires no config change, and keeps the chosen numbers next to the component that uses them, matching this codebase's existing convention (no prior use of `theme.extend.zIndex`). Rejected: adding named steps to `tailwind.config.ts`'s `theme.extend.zIndex` (e.g. `boats: 25`) — rejected because it splits one piece of knowledge (a tile's stacking order) across a dozen component files and a shared config file, more machinery than six numbers need.
- Add one regression test, `src/modules/map/z-index-scale.test.ts`, that reads every `*.styles.ts` file under `src/modules/map/components/**`, extracts every `z-<token>` class, and fails if `<token>` is a bare integer not in `{0,10,20,30,40,50}` (bracketed `z-[...]` and `z-auto` are exempt). This is a plain-text/regex check, not a React test — logic-only, no DOM. Because the actual defect is "a magic stacking number without brackets, outside the scale, compiles to nothing, silently," not "four specific typos" — the same mistake can recur anywhere in this tile-stacking system. Scoped to `src/modules/map` (where `IslandTile`'s shared stacking order lives), not the whole repo, since other modules don't participate in that order. Rejected: no guard test, fix only the four known files — a future edit could reintroduce the same class of bug and nothing short of a manual browser check would catch it.
- Do not touch `TileOccupants.styles.ts` or investigate the clipped-sprite report further in this plan — its `z-30` is a real utility, so it isn't part of this root cause, and no other verified-in-session evidence points to its actual cause yet. Tracked as a Risk below instead of guessed at.

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/map/z-index-scale.test.ts` | new | Regression guard: fails if any `*.styles.ts` under `src/modules/map/components/**` uses a bare `z-<n>` class outside `{0,10,20,30,40,50}`. Written and run first — must fail against today's code before any style file is edited. | tester-a |
| `src/modules/map/components/TileBoats/TileBoats.styles.ts` | edit | `z-25` → `z-[25]` (line 2), `z-26` → `z-[26]` (line 6). No other change. | implementer-b |
| `src/modules/map/components/TileResources/TileResources.styles.ts` | edit | `z-28` → `z-[28]` (line 2), `z-35` → `z-[35]` (line 6). No other change. | implementer-b |
| `src/modules/map/components/TileForest/TileForest.styles.ts` | edit | `z-12` → `z-[12]` (line 2). No other change. | implementer-b |
| `src/modules/map/components/MapDecorations/MapDecorations.styles.ts` | edit | `z-5` → `z-[5]` (line 2). No other change. | implementer-b |

implementer-a: no files this phase — the defect and its fix are CSS class literals only; no `.map/.hook/.service/.types/.fixtures` change is needed. Confirm this by re-reading `TileBoats.map.ts` and `TileBoats.hook.ts` (already correct per `87e4eca`) and report accordingly rather than inventing work.

preview-a / preview-b: no new preview files. Use the existing `IslandTile.preview.tsx` (composes the full tile tree, including `.terrain`) and `TileBoats.preview.tsx`'s "Contested base" state in the testbed (`npm run dev` → `/testbed`) to visually confirm, with `ui-verify`, that boats, the base boat, idle/farming collectors and forest decoration now render on top of the terrain background. This is the check the old isolated `TileBoatsView`-only preview could not perform (see Root cause).

## Contracts
No new types, props, hooks or services. The only non-style-literal file is the regression test; its shape:

```ts
// src/modules/map/z-index-scale.test.ts
// Pure Node/Jest test, no React, no DOM.
// 1. Glob: all files matching src/modules/map/components/**/*.styles.ts
// 2. Read each file's text; match every occurrence of the regex /\bz-(\[[^\]]+\]|auto|-?\d+)\b/g
//    inside the quoted class strings.
// 3. For each match that is a bare integer (not "[...]", not "auto"), assert
//    Number(token) is one of [0, 10, 20, 30, 40, 50].
// 4. Fail with the offending file path and the exact invalid token if not.
```

## Phases
### Phase 1: Fix the stacking defect and guard against recurrence
1. tester-a writes `src/modules/map/z-index-scale.test.ts` per the Contracts block above; runs `npx jest src/modules/map/z-index-scale.test.ts` and confirms it **fails**, quoting the failure (the six offending tokens: `z-5` in `MapDecorations.styles.ts`, `z-12` in `TileForest.styles.ts`, `z-25`/`z-26` in `TileBoats.styles.ts`, `z-28`/`z-35` in `TileResources.styles.ts`). (tester-a)
2. implementer-b edits the four `.styles.ts` files per the File plan — bracket the six numbers, nothing else. (implementer-b)
3. tester-a re-runs `npx jest src/modules/map/z-index-scale.test.ts`, confirms it now passes, and re-runs the full existing `TileBoats`, `TileForest`, `TileResources`, `MapDecorations`, `IslandTile` test suites to confirm no existing assertion broke (none should, since no test asserts the literal old class string — confirmed by grep in this plan's investigation). (tester-a)
4. tester-b runs the full `IslandTile.test.tsx` / view-layer suite for the same components, confirming nothing broke. (tester-b)
5. preview-a and preview-b open `/testbed`, check `IslandTile` and `TileBoats` previews with `ui-verify` (`node .claude/skills/ui-verify/scripts/snapshot.mjs <url>`), confirm boats/collectors/forest now render over terrain, and separately load a live/dev match if available to confirm the Base-tile boat and occupied-tile collectors are visible there too — this is the one check that must happen outside a preview, since the preview alone cannot prove a cross-component stacking defect is fixed. (preview-a, preview-b)
6. Whoever runs step 5's live-match check also looks at a tile with multiple stacked army sprites and reports, in one line, whether the bottom-edge clipping from the triage report is still present. If yes, note it is a separate, unverified-cause finding for a new triage, not something this phase fixes. (preview-a or preview-b)

Model escalation: none — every step is a one-line class edit or a mechanical regex test; no step needs sonnet.

## Test plan
- tester-a (logic, first): `src/modules/map/z-index-scale.test.ts` — (a) fails pre-fix on the six known offenders with exact file+token in the message; (b) passes post-fix; (c) passes on a file using a valid default class (`z-30`, e.g. `TileOccupants.styles.ts`) and on a bracketed class (`z-[25]`) — these must not be flagged as violations.
- tester-b (view): re-run existing `TileBoats.test.tsx`, `TileResources.test.tsx`, `TileOccupants.test.tsx`, `IslandTile.test.tsx` unchanged — confirm green, since this fix is not expected to need new view-test cases (RTL can't observe computed `z-index`; the regression is owned by the new logic test plus the manual browser check in Phase 1 step 5).

## Preview states
- No new preview states. Re-verify existing states: `TileBoats.preview.tsx` → "Contested base (real map function)"; `IslandTile.preview.tsx` → any state with occupants/a base tile, now checked against the live `.terrain` background instead of in isolation.

## Risks
- The reported sprite clipping at a tile's bottom edge is not explained by this root cause (`TileOccupants.styles.ts:4` already uses a real `z-30` utility). Mitigation: Phase 1 step 6 requires an explicit browser re-check after the fix lands; if clipping persists, it is reported as a new finding for a separate triage rather than guessed at or silently folded into this fix's "done".
- `public/tiny-swords/` and `scripts/asset-tools/` are untracked, in-progress work from a different session (per triage, out of scope). This plan's four edited files (`TileBoats.styles.ts`, `TileResources.styles.ts`, `TileForest.styles.ts`, `MapDecorations.styles.ts`) do not reference any Tiny Swords asset path — confirmed by reading each file in full during this investigation — so this fix cannot conflict with that other session's uncommitted work.

## Review (architect-b)
VERDICT: APPROVED
- Re-read every file in the File plan and Verified context table directly: `IslandTile.tsx:90-106`, `IslandTile.styles.ts:47-48`, `TileBoats.styles.ts:2,6`, `TileResources.styles.ts:2,6`, `TileForest.styles.ts:2`, `MapDecorations.styles.ts:2`, `TileOccupants.styles.ts:4`, `MapGrid.styles.ts:5`. All class strings and line numbers match exactly.
- Confirmed Tailwind's default `zIndex` scale with `node -e "console.log(Object.keys(require('tailwindcss/defaultTheme').zIndex))"` → `['0','10','20','30','40','50','auto']`, and `tailwind.config.ts:14-111` has no `zIndex` key under `theme.extend` — matches the plan's claim.
- Ran a full `grep -rnoE "z-(\[[^]]+\]|auto|-?[0-9]+)" src/modules/map/components/**/*.styles.ts` myself: the six offenders (`z-5`, `z-12`, `z-25`, `z-26`, `z-28`, `z-35`) are exactly the ones in the File plan; no other `src/modules/map` component has a bare out-of-scale number. Nothing missed, nothing invented.
- `grep -rn "z-25\|z-26\|z-28\|z-35\|z-12\b\|z-5\b" src/modules/map --include="*.test.ts*"` found zero hits outside the `.styles.ts` files — no existing test asserts the literal old class string, confirming the plan's claim that the fix can't break existing view tests.
- Design is the simplest correct fix: six one-line bracket edits plus one regex-based regression test, scoped to `src/modules/map` where the shared stacking order actually lives. Rejecting a `theme.extend.zIndex` config addition is the right call — it would spread one piece of knowledge across a config file and a dozen components for no benefit over inline brackets. No invented files, no speculative abstraction.
- File plan owners and scope are clean: tester-a owns the guard test (written and proven failing first), implementer-b owns all four style edits (single responsibility, no logic touched), implementer-a correctly has no files. Risks section correctly keeps the unrelated clipping report out of this fix's scope instead of guessing at its cause.
- No Firestore, hook, map, or type file is touched — matches the triage's root-cause class (a view-layer CSS defect, not a data-shape mismatch), so no escalation to the user is needed.
