# Plan: Lucide-capable icon resolver and combat icon wiring

Status: APPROVED
Inputs: triage.md

## Goal and acceptance criteria
- [ ] `resolveIcon(id)` resolves both `image` and `lucide` registry entries: returns the override's `src` as an `image` source when the entry has an uploaded replacement (`icon-overrides.config.json[id].src`), else the entry's own `defaultSource` (lucide name or image src) unchanged.
- [ ] `FightIcon`, `InfoIcon`, `ResourceIcon` render through the new resolver contract with unchanged DOM, alt text and classes (overrides remain empty in production today, so no visible change).
- [ ] A new `RegistryIcon` component in `src/modules/shared` renders any registry id (lucide or image) with its resolved transform.
- [ ] Every combat lucide glyph (`CombatDialog`, `ArmySelectionDialog`, `AttackSelectionDialog`, `MonsterSelectionDialog`, `MonsterCombatDialog`'s 4 screen files) renders through `RegistryIcon` instead of a direct `lucide-react` import, with the same visible icon, size and color classes as before.
- [ ] `npm run typecheck`, `npm run lint`, `npm test` pass.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `resolveIcon` | `src/modules/icons/resolve-icon.ts:39-53` | Throws for `kind: 'lucide'` today (line 41-43); return type changes. |
| `ResolvedIcon` | `src/modules/icons/resolve-icon.ts:5-10` | Current shape `{ src, transform }`; replaced by `{ source, transform }`. |
| `IconDefaultSource` | `src/modules/icons/icon-registry.types.ts:6` | `{ kind: 'lucide'; name } \| { kind: 'image'; src }`. Reused as `ResolvedIcon['source']`; no new type needed. |
| `toIconTransform` | `src/modules/icons/resolve-icon.ts:18-20` | Unchanged; still used by resolver and `IconEditorRow`. |
| `findRegistryEntry` | `src/modules/icons/resolve-icon.ts:22-28` | Unchanged. |
| `resolveCurrentSource` | `src/testbed/components/IconEditor/IconEditor.map.ts:22-28` | Same "override `src` wins, else `entry.defaultSource`" rule, but resolves the editor's live **draft** (including unsaved edits), not the saved `icon-overrides.config.json`. Not merged with `resolveIcon`: different inputs (draft vs. saved config), same rule independently expressed — not duplication by the third-copy test. |
| `lucideGlyphsByName`, `IconGlyph` | `src/testbed/components/IconEditor/IconEditorRow.tsx:21,23-31` | Local lucide-name lookup to move into `src/modules/icons`; `IconGlyph` keeps its own fill-image/bare-glyph rendering (different markup from `RegistryIcon`), only the lookup moves. |
| `iconRegistry` entries `skull`, `swords`, `trophy`, `dices`, `sparkles`, `loader-2`, `check-circle`, `clock`, `crosshair` | `src/modules/icons/icon-registry.config.json` (verified via script, all present, `kind: 'lucide'`) | Registry ids the combat phase wires to. |
| `FightIcon`, `InfoIcon`, `ResourceIcon` | `src/modules/shared/fight-icon.tsx`, `info-icon.tsx`, `resource-icon.tsx` | All three resolve an `image`-kind id only (`icon-fight`, `icon-info`, `icon-meat`/`icon-wood`/`icon-gold`); `source.kind` is always `'image'` for them today. |
| Resolver mock seam | `src/modules/shared/fight-icon.test.tsx:17-28`, `info-icon.test.tsx`, `resource-icon.test.tsx` (same seam) | `jest.mock('@/modules/icons', ...)` wraps `resolveIcon`; return shape must become `{ source: { kind: 'image', src }, transform }`. |
| `resolve-icon.test.ts` | `src/modules/icons/resolve-icon.test.ts` | Asserts `{ src, transform }` and a throw for `loader-2` (line ~98-102); both change. |
| Combat lucide usages | grep-verified, file:line list in Phase 2 below | 8 files, all direct `lucide-react` imports; no combat `*.test.tsx` references any lucide glyph name or queries an `<svg>` (verified: 0 hits), so no combat test needs an assertion change. |
| `STATUS_ICON` maps | `src/modules/combat/components/ArmySelectionDialog/ArmySelectionDialog.tsx:21-24`, `AttackSelectionDialog/AttackSelectionDialog.tsx:20-23` | Typed `Partial<Record<ArmyStatus, typeof CheckCircle>>`, store component references; become `Partial<Record<ArmyStatus, string>>` of registry ids. |
| `ArmyStatus` | `ArmySelectionDialog.types.ts:12`, `AttackSelectionDialog.types.ts:13` | `'acted' \| 'positioned' \| 'ready'`; unchanged. |
| `PositionDialog.tsx` | `src/modules/combat/components/PositionDialog/PositionDialog.tsx:14,67` | Only uses `ResourceIcon`, no direct lucide import (verified) — out of scope for Phase 2 edits. |
| next/image mock | present in all 6 combat `.test.tsx` files that render an `<Image>` (`ArmySelectionDialog`, `AttackSelectionDialog`, `CombatDialog`, `MonsterCombatDialog`, `MonsterSelectionDialog`, `PositionDialog` — all verified) | `RegistryIcon`'s image branch needs no new mock. |
| Docs | `docs/architecture/systems-and-visuals.md:182-184` | Describes the registry, the editor and `resolveIcon`'s current (image-only, throwing) contract; both phases update it (`docs-sync`). |

## Decisions
- `ResolvedIcon.source` reuses `IconDefaultSource` (`{kind:'lucide',name}` / `{kind:'image',src}`) rather than a new discriminated type, because that is exactly the shape `resolveIcon` must produce and `IconEditor.map.ts` already uses it for the same "resolved source" idea. Rejected: a new `ResolvedIconSource` type (duplicates the same two variants for no reason).
- `resolveIcon` no longer throws for `kind: 'lucide'`; override `src` wins over any default (lucide or image) exactly as `resolveCurrentSource` does for the editor's draft state. Rejected: keeping the throw and adding a second lucide-only resolver (two functions doing one job).
- Move only the lucide-name lookup (`getLucideGlyph`) into `src/modules/icons`, not `IconEditorRow`'s whole glyph-rendering: the editor's thumbnail (`fill` image, bare glyph, editor-only classes) and the game's `RegistryIcon` (fixed 32x32 image, transform-wrapped) render differently by design; sharing the lookup is the actual duplication, the markup is not.
- `RegistryIcon` takes `{ id, className, alt? }` (`alt` defaults to `''`): `FightIcon`/`InfoIcon`/`ResourceIcon` need real alt text (tests assert on it) and always resolve an `image` source; combat's lucide glyphs are decorative and pass no `alt`. Rejected: `alt` omitted entirely (breaks the three existing icons' accessibility and their tests); a second component for the alt-bearing case (duplicates the wrapper markup).
- `STATUS_ICON` maps become id strings, not component references, because `RegistryIcon` takes an id, not a component type. Rejected: keeping component references and writing a second lookup from id to component (duplicates the registry's own id→source mapping).

## File plan
### Phase 1 — resolver contract and shared icon rendering
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/icons/lucide-glyphs.ts` | new | `getLucideGlyph(name): LucideIcon \| undefined`, the lucide-name lookup moved out of `IconEditorRow` | implementer-a |
| `src/modules/icons/resolve-icon.ts` | edit | `ResolvedIcon` becomes `{ source: IconDefaultSource; transform: string }`; `resolveIcon` resolves both kinds per Decisions | implementer-a |
| `src/modules/icons/index.ts` | edit | export `getLucideGlyph` | implementer-a |
| `src/modules/shared/registry-icon.tsx` | new | `RegistryIcon({ id, className, alt? })`: resolves `id`, renders the image or the looked-up lucide glyph inside the existing span/span wrapper-and-transform markup | implementer-b |
| `src/modules/shared/fight-icon.tsx` | edit | thin wrapper: `<RegistryIcon id="icon-fight" alt="Fight" className={className} />` | implementer-b |
| `src/modules/shared/info-icon.tsx` | edit | thin wrapper: `<RegistryIcon id="icon-info" alt="Info" className={className} />` | implementer-b |
| `src/modules/shared/resource-icon.tsx` | edit | keeps `RESOURCE_ICON_IDS` and `getResourceDisplayName`; renders `<RegistryIcon id={iconId} alt={...} className={className} />` | implementer-b |
| `src/modules/shared/index.ts` | edit | export `RegistryIcon` | implementer-b |
| `src/testbed/components/IconEditor/IconEditorRow.tsx` | edit | `IconGlyph` uses `getLucideGlyph` from `@/modules/icons` instead of the local `lucideGlyphsByName`; drop the local constant and the now-unused `LucideIcon` type import | implementer-b |
| `src/modules/icons/resolve-icon.test.ts` | edit | update shape to `{ source, transform }`; replace the "throws for lucide" case with lucide-resolution cases | tester-a |
| `src/modules/icons/lucide-glyphs.test.ts` | new | `getLucideGlyph('Swords')` returns a component, `getLucideGlyph('NotAName')` returns `undefined` | tester-a |
| `src/modules/shared/fight-icon.test.tsx` | edit | update mock return shape to `{ source: { kind: 'image', src }, transform }` | tester-b |
| `src/modules/shared/info-icon.test.tsx` | edit | same mock-shape update | tester-b |
| `src/modules/shared/resource-icon.test.tsx` | edit | same mock-shape update | tester-b |
| `src/modules/shared/registry-icon.test.tsx` | new | see Test plan | tester-b |
| `docs/architecture/systems-and-visuals.md` | edit | update the "Icon resolver" paragraph (line 184) and, if the editor's lucide-override support isn't already documented, the "Icon registry"/"Icon Editor" paragraphs (182-183) | docs-sync |

### Phase 2 — combat dialogs wired to the registry
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/combat/components/CombatDialog/CombatDialog.tsx` | edit | replace `Sparkles`(52) `Trophy`(98) `Skull`(105) `Loader2`/`Dices`(118) `Loader2`(123) with `RegistryIcon id="sparkles"/"trophy"/"skull"/"loader-2"/"dices"`, same `className`; drop the `lucide-react` import | implementer-b |
| `src/modules/combat/components/ArmySelectionDialog/ArmySelectionDialog.tsx` | edit | `STATUS_ICON` (21-24) becomes `Partial<Record<ArmyStatus, string>>` with `acted: 'check-circle'`, `ready: 'clock'`; render branch (around line 110) uses `<RegistryIcon id={StatusIconId} className={styles.statusIcon} />`; drop the `lucide-react` import | implementer-b |
| `src/modules/combat/components/AttackSelectionDialog/AttackSelectionDialog.tsx` | edit | `STATUS_ICON` (20-23) becomes id map `acted: 'check-circle'`, `ready: 'crosshair'`; header `Crosshair` (42) → `RegistryIcon id="crosshair"`; status render branch same pattern as ArmySelectionDialog; drop the `lucide-react` import | implementer-b |
| `src/modules/combat/components/MonsterSelectionDialog/MonsterSelectionDialog.tsx` | edit | `Skull` (29) → `RegistryIcon id="skull"`; drop the `lucide-react` import | implementer-b |
| `src/modules/combat/components/MonsterCombatDialog/MonsterAttackScreen.tsx` | edit | `Skull`(34) `Swords`(65) `Swords`(103) → `RegistryIcon id="skull"/"swords"`; drop the `lucide-react` import | implementer-b |
| `src/modules/combat/components/MonsterCombatDialog/MonsterCombatCardSelector.tsx` | edit | `Sparkles`(27) `Dices`(65) → `RegistryIcon id="sparkles"/"dices"`; drop the `lucide-react` import | implementer-b |
| `src/modules/combat/components/MonsterCombatDialog/MonsterResultsScreen.tsx` | edit | `Trophy`(31) `Skull`(35) `Swords`(79) `Trophy`(109) `Skull`(114) → `RegistryIcon id="trophy"/"skull"/"swords"`; drop the `lucide-react` import | implementer-b |
| `src/modules/combat/components/MonsterCombatDialog/MonsterSpectatorScreen.tsx` | edit | `Skull`(17) `Loader2`(25) → `RegistryIcon id="skull"/"loader-2"`; drop the `lucide-react` import | implementer-b |
| `docs/architecture/systems-and-visuals.md` | edit | note that combat's dialog icons (skull, swords, trophy, dices, sparkles, loader, check-circle, clock, crosshair) now render through the registry, alongside the existing `FightIcon`/`InfoIcon`/`ResourceIcon` line | docs-sync |

No new files needed in Phase 2 (wiring only); no test file needs a new assertion — verified no combat `*.test.tsx` references a lucide name or queries `<svg>` — but tester-b runs the full combat suite to confirm nothing broke.

## Contracts
```ts
// src/modules/icons/icon-registry.types.ts — UNCHANGED, reused:
export type IconDefaultSource = { kind: 'lucide'; name: string } | { kind: 'image'; src: string };

// src/modules/icons/lucide-glyphs.ts — new
import type { LucideIcon } from 'lucide-react';
/** Looks up a lucide-react export by its registry `name` (e.g. "Swords"); undefined if no export
 *  matches. Shared by resolveIcon's consumers' renderers and IconEditorRow's thumbnail. */
export function getLucideGlyph(name: string): LucideIcon | undefined;

// src/modules/icons/resolve-icon.ts — changed
export interface ResolvedIcon {
  /** What to render: the registry's own default (lucide name or image src), or the override's
   *  image src if one is saved for this id, regardless of the entry's own default kind. */
  source: IconDefaultSource;
  /** CSS transform for the element that wraps the rendered icon, unchanged format. */
  transform: string;
}
/** Looks up `id` in iconRegistry, applies icon-overrides.config.json (src/rotation/size),
 *  returns the resolved source and transform. Throws only for an id absent from iconRegistry. */
export function resolveIcon(id: string): ResolvedIcon;

// src/modules/shared/registry-icon.tsx — new
export interface RegistryIconProps {
  /** icon-registry.config.json id, e.g. "skull", "icon-fight". */
  id: string;
  className?: string;
  /** Accessible text; omitted (default '') renders a decorative image (alt="") or a bare glyph
   *  with no aria attributes, matching today's combat icons. */
  alt?: string;
}
export function RegistryIcon(props: RegistryIconProps): JSX.Element;
// Markup (reused from FightIcon/InfoIcon/ResourceIcon today):
// <span className={cn('relative inline-flex items-center justify-center shrink-0', className)}>
//   <span className="relative flex h-full w-full items-center justify-center" style={{ transform }}>
//     {source.kind === 'image'
//       ? <Image src={source.src} alt={alt} width={32} height={32} className="h-full w-full object-contain select-none" unoptimized />
//       : (() => { const Glyph = getLucideGlyph(source.name); return Glyph ? <Glyph className="h-full w-full" /> : null; })()}
//   </span>
// </span>

// src/modules/shared/fight-icon.tsx / info-icon.tsx / resource-icon.tsx — each becomes:
export function FightIcon({ className }: { className?: string }) {
  return <RegistryIcon id="icon-fight" alt="Fight" className={className} />;
}
// ResourceIcon keeps RESOURCE_ICON_IDS and getResourceDisplayName(type) for alt/id lookup.

// ArmySelectionDialog.tsx / AttackSelectionDialog.tsx — STATUS_ICON becomes an id map:
const STATUS_ICON_ID: Partial<Record<ArmyStatus, string>> = {
  acted: 'check-circle',
  ready: 'clock', // 'crosshair' in AttackSelectionDialog
};
// render: StatusIconId && <RegistryIcon id={StatusIconId} className={styles.statusIcon} />
```

## Phases
### Phase 1: resolver contract and shared icon rendering
1. implementer-a: write `src/modules/icons/lucide-glyphs.ts`, edit `resolve-icon.ts`, export both `getLucideGlyph` and `resolveIcon`'s changed `ResolvedIcon` from `src/modules/icons/index.ts`.
2. implementer-b: write `src/modules/shared/registry-icon.tsx`; rewrite `fight-icon.tsx`, `info-icon.tsx`, `resource-icon.tsx` as thin wrappers; export `RegistryIcon` from `src/modules/shared/index.ts`; update `IconEditorRow.tsx`'s `IconGlyph` to call `getLucideGlyph`.
3. tester-a: update `resolve-icon.test.ts`, add `lucide-glyphs.test.ts`.
4. tester-b: update `fight-icon.test.tsx`, `info-icon.test.tsx`, `resource-icon.test.tsx`, add `registry-icon.test.tsx`.
5. docs-sync: update `docs/architecture/systems-and-visuals.md:182-184`.
6. Checks: `npm run typecheck`, `npm run lint`, `npm test`.

Model escalation: none — contract change is mechanical, no new design decisions left for builders.

### Phase 2: combat dialogs wired to the registry
1. implementer-b: edit the 8 files listed above, each replacing its direct `lucide-react` glyph(s) with `RegistryIcon`, same `className` per call site, `STATUS_ICON` maps converted to id maps in `ArmySelectionDialog.tsx` and `AttackSelectionDialog.tsx`.
2. tester-b: run the full `combat` test suite (no new assertions expected to be needed; add one only if a run reveals a real gap, e.g. a test that happens to query by lucide `data-*` attribute).
3. docs-sync: update `docs/architecture/systems-and-visuals.md` to note combat's registry-wired icons.
4. Checks: `npm run typecheck`, `npm run lint`, `npm test`.

Model escalation: none.

## Test plan
- tester-a (logic, first):
  - `resolveIcon('icon-fight')` with no override → `{ source: { kind: 'image', src: '/sprites/icon_fight.png' }, transform: 'rotate(0deg) scale(1)' }` (replaces current assertion shape).
  - `resolveIcon('icon-fight')` with `{ rotation, size }` override → source unchanged, transform reflects override.
  - `resolveIcon('icon-fight')` with `{ src }` override → `source` becomes `{ kind: 'image', src: override.src }`.
  - `resolveIcon('loader-2')` with no override → `{ source: { kind: 'lucide', name: 'Loader2' }, transform: default }` (was: throws — remove the old throw assertion for this id).
  - `resolveIcon('loader-2')` with `{ rotation, size }` override → source stays `{ kind: 'lucide', name: 'Loader2' }`, transform reflects override.
  - `resolveIcon('loader-2')` with `{ src }` override → `source` becomes `{ kind: 'image', src: override.src }` (a lucide entry can be overridden by an uploaded image).
  - `resolveIcon('icon-does-not-exist')` and `resolveIcon('')` still throw `Unknown icon id "..."`.
  - `getLucideGlyph('Swords')` returns a function (truthy); `getLucideGlyph('NotARealExport')` returns `undefined`.
- tester-b (view):
  - `RegistryIcon`: image-kind id (`icon-fight`, via the mocked `resolveIcon` seam) renders an `<img>` with the resolved `src` and `alt`; lucide-kind id renders the looked-up glyph element (query by the lucide-react mock or a role/testid already in use elsewhere in this repo's icon tests); unknown lucide name (mocked resolver returns a bogus `name`) renders nothing crash-free; `className` lands on the outer `span`; `transform` lands on the inner `span`'s `style`; omitted `alt` renders `alt=""` for an image source.
  - `FightIcon`/`InfoIcon`/`ResourceIcon`: re-run existing cases unchanged in intent, only the mock's return shape changes to `{ source, transform }`.
  - `AttackSelectionDialog.test.tsx`, `ArmySelectionDialog.test.tsx`, `CombatDialog.test.tsx`, `MonsterCombatDialog.test.tsx`, `MonsterSelectionDialog.test.tsx`: run unchanged (no existing assertion targets a lucide name or an `<svg>`); confirm green, no new cases required unless a run surfaces a gap.

## Preview states
None — no new previewable component per triage (`RegistryIcon` and `IconEditorRow` are not previewed individually; `IconEditor.preview.tsx` and the existing `FightIcon`/`InfoIcon`/`ResourceIcon` call sites already cover the visible states, and overrides stay empty so nothing visibly changes).

## Risks
- `RegistryIcon`'s lucide branch wraps the glyph in two extra `<span>`s versus today's bare `<Icon className=... />`; a `className` that assumed being on the `<svg>` directly (e.g. a `[&>svg]:` selector) would stop matching. Verified: none of the 8 combat files use such a selector (all classNames are plain Tailwind utility/color classes) — mitigation is the Phase 2 checks plus a quick visual check of one dialog in the browser (skill `ui-verify`) before calling Phase 2 done.
- `animate-spin` (`CombatDialog.styles.ts:58` `loaderIcon`) moves from the `<svg>` to the outer wrapper `span`; rotating the wrapper rotates its single child identically, so the visible effect is unchanged — called out here since it's the one non-obvious class.

## Review (architect-b)
VERDICT: APPROVED

Finding 1 from the previous round is fixed: File plan line 52 now assigns `src/modules/shared/index.ts` to implementer-b, matching the owner of `registry-icon.tsx`, `fight-icon.tsx`, `info-icon.tsx`, `resource-icon.tsx`. Phases section: implementer-a's Phase 1 step 1 (line 135) now only covers `src/modules/icons/*` and no longer mentions coordinating with implementer-b; implementer-b's step 2 (line 136) owns writing `registry-icon.tsx` and exporting it from `shared/index.ts` in the same step, same owner, no cross-agent dependency. No remaining ordering issue between implementer-a and implementer-b.

All other points checked clean (from the prior review round, still valid — no other part of the plan changed):
- `ResolvedIcon`/`resolveIcon` contract change verified against the real `src/modules/icons/resolve-icon.ts:5-53`: today's `{ src, transform }` and the lucide throw (`resolve-icon.ts:41-43`) are real, and the plan's `{ source: IconDefaultSource, transform }` with override-`src`-wins-regardless-of-kind is consistent with `resolveCurrentSource` in `src/testbed/components/IconEditor/IconEditor.map.ts:22-28` (`draft?.src` wins, else `entry.defaultSource`). `IconDefaultSource` (`src/modules/icons/icon-registry.types.ts:6`) is reused correctly, no new type needed.
- `RegistryIcon`'s `alt?` prop (defaulting to `''`) is a justified, documented deviation from triage.md:20's `(id, className)`: `FightIcon`/`InfoIcon`/`ResourceIcon` pass real alt text today (`fight-icon.tsx:12` `alt="Fight"`, `info-icon.tsx:12` `alt="Info"`, `resource-icon.tsx:24` `alt={getResourceDisplayName(type)}`) and their tests assert on it; dropping `alt` entirely would regress accessibility and break those tests. Combat's lucide glyphs get no `alt`, which is correct — they're decorative and the lucide branch doesn't render an `<img>` at all (default `''` only matters for the image branch).
- Phase 2 call sites verified by grep against the real files: every line number in the File plan (`CombatDialog.tsx:3,52,98,105,118,123`; `ArmySelectionDialog.tsx:4,21-23`; `AttackSelectionDialog.tsx:4,20-22,42`; `MonsterSelectionDialog.tsx:4,29`; `MonsterAttackScreen.tsx:12,34,65,103`; `MonsterCombatCardSelector.tsx:7,27,65`; `MonsterResultsScreen.tsx:11,31,35,79,109,114`; `MonsterSpectatorScreen.tsx:8,17,25`) matches the current source exactly. `PositionDialog.tsx` has no lucide import, confirmed. All nine registry ids (`skull`, `swords`, `trophy`, `dices`, `sparkles`, `loader-2`, `check-circle`, `clock`, `crosshair`) exist in `icon-registry.config.json` with the matching `kind: 'lucide'` names. No `src/modules/combat/components/*/*.test.tsx` references a lucide name or `<svg>` (grep: 0 hits), so no combat test needs a new assertion.
- No other `resolveIcon`/`ResolvedIcon` consumer exists outside the File plan's rows (grep confirms exactly the 9 files listed).
