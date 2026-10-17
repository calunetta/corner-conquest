# Plan: Icon override resolver and shared icon wiring

Status: APPROVED
Inputs: triage.md

## Goal and acceptance criteria
- [ ] A pure resolver in `src/modules/icons` returns, for a known registry icon id, the effective image `src` (saved override or registry default) and a CSS `transform` string from the saved rotation/size (or the registry defaults).
- [ ] `FightIcon`, `InfoIcon`, `ResourceIcon` render the resolved `src` and apply the resolved `transform`, with unchanged props and outer markup/classes.
- [ ] `IconEditorRow`'s local `toTransform` is removed; it imports the same transform formula from `src/modules/icons`.
- [ ] `npm run typecheck`, `npm run lint`, `npm test` pass.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `iconRegistry`, `iconOverridesConfig` | `src/modules/icons/index.ts:14-15` | Already-loaded static JSON the resolver reads; no new I/O. |
| `IconRegistryEntry`, `IconDefaultSource`, `IconOverride`, `IconOverridesConfig` | `src/modules/icons/icon-registry.types.ts:1-32` | `defaultSource` is `{kind:'lucide',name}` or `{kind:'image',src}`; `IconOverride.src/rotation/size` are all optional. |
| Registry entries `icon-fight`, `icon-info`, `icon-meat`, `icon-wood`, `icon-gold` | `src/modules/icons/icon-registry.config.json` (grepped this session) | All five are `{kind:'image', src:'/sprites/icon_*.png'}`, `defaultRotation: 0`, `defaultSize: 100`, `module: 'shared'`. |
| `icon-overrides.config.json` | `src/modules/icons/icon-overrides.config.json` | Currently `{}` — resolver output is unchanged until an override is saved. |
| `FightIcon` | `src/modules/shared/fight-icon.tsx:1-17` | Renders a fixed `<Image src="/sprites/icon_fight.png" .../>` inside a wrapper `<span>`; no transform applied today. |
| `InfoIcon` | `src/modules/shared/info-icon.tsx:1-17` | Same shape, `/sprites/icon_info.png`. |
| `ResourceIcon` | `src/modules/shared/resource-icon.tsx:1-28` | `RESOURCE_ICONS: Record<ResourceType, string>` maps `ResourceType` to a sprite **path**; returns `null` for an unmapped type. |
| `fight-icon.test.tsx`, `info-icon.test.tsx`, `resource-icon.test.tsx` | `src/modules/shared/*.test.tsx` | Assert the **outer** `<span>`'s classes (`relative inline-flex items-center justify-center shrink-0` [+ `className`]) and the `<img>`'s `src`/`alt`/`width`/`height`. `container.querySelector('span')` returns the first span in document order — adding an inner wrapper span does not break these. |
| `toTransform(rotation, size)` | `src/testbed/components/IconEditor/IconEditorRow.tsx:34-36` | `` `rotate(${rotation}deg) scale(${size / 100})` ``. Only caller: `IconEditorRow.tsx:62`. To be deleted and replaced by the shared import. |
| `IconEditor.map.ts` `resolveCurrentSource`/`toIconRowViewModel` | `src/testbed/components/IconEditor/IconEditor.map.ts:22-49` | Computes the editor's **draft** state (unsaved slider/upload values), not the saved-overrides lookup this task builds. Out of scope: do not touch this file. |
| `ResourceType` | `@/lib/types` (imported at `src/modules/shared/resource-icon.tsx:2`) | Enum with `Food`, `Wood`, `Gold` members (used, not redefined). |
| `cn` | `@/lib/utils` | Already used by all three components for the outer span's class merge. |

## Decisions
- Resolver is a single pure function `resolveIcon(id)` in a new flat file `src/modules/icons/resolve-icon.ts`, not a hook: it only reads two already-imported static JSON modules and does arithmetic, no React state or app context — matches the "Logic-only modules" layout the `icons` module already uses (flat files, no `components/<Name>/`).
  Rejected: a `useIconOverride(iconId)` hook (triage's other suggested shape) — none of the three call sites need re-render-on-change (overrides are a static import, no hot-reload per triage's Out-of-scope), so a hook would be a pass-through layer with no state of its own.
- `resolveIcon` only resolves `kind: 'image'` registry entries (throws for an unknown id or a `kind: 'lucide'` entry). The three call sites always pass one of the five known image ids; failing fast on a wrong id surfaces a typo immediately instead of silently rendering nothing.
  Rejected: returning a fallback image/placeholder for an unknown id — triage's scope is these three known call sites only; a silent fallback would hide a real bug (a typo'd id) instead of failing the build/tests.
- The rotate+scale formula moves to a shared, exported `toIconTransform(rotation, size)` in `resolve-icon.ts`, re-exported from `src/modules/icons/index.ts`. `resolveIcon` calls it internally; `IconEditorRow.tsx` imports it directly (it doesn't need id-based lookup, only the formula, since the editor already has its own draft rotation/size numbers).
- `ResourceIcon` keeps a lookup table but changes its value type from sprite **path** to registry **id** (`RESOURCE_ICON_IDS: Record<ResourceType, string>`), so the path itself has exactly one source of truth (`icon-registry.config.json`, via `resolveIcon`) instead of two (the table and the registry).
  Rejected: looking up the id by reusing `RESOURCE_ICONS`'s existing path strings to find the matching registry entry (e.g. `iconRegistry.find(e => e.defaultSource.src === RESOURCE_ICONS[type])`) — adds an indirect, fragile string-match lookup for no benefit over naming the id directly.
- Each of the three views wraps its `<Image>` in one new inner `<span>` that carries the resolved `transform` as an inline `style` (a runtime value, allowed in a `style` prop per `component-architecture`), sized `h-full w-full` like the `<Image>` it wraps. The outer `<span>` (existing classes, existing `className` merge) is untouched, so the three existing tests' outer-span assertions keep passing unmodified.
  Rejected: adding a `.styles.ts` file to formalize these three components' classes while touching them — out of scope (triage says "keeping their props and markup"); the existing inline-`cn()` convention in these three flat files is left as is.

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/icons/resolve-icon.ts` | new | `resolveIcon(id)` and `toIconTransform(rotation, size)`, pure, no React | implementer-a |
| `src/modules/icons/resolve-icon.test.ts` | new | Unit tests for both functions | tester-a |
| `src/modules/icons/index.ts` | edit | Export `resolveIcon`, `toIconTransform`, `ResolvedIcon` type | implementer-a |
| `src/modules/shared/fight-icon.tsx` | edit | Call `resolveIcon('icon-fight')`; render resolved `src`/`transform` | implementer-b |
| `src/modules/shared/info-icon.tsx` | edit | Call `resolveIcon('icon-info')`; render resolved `src`/`transform` | implementer-b |
| `src/modules/shared/resource-icon.tsx` | edit | `RESOURCE_ICON_IDS` table (id, not path); call `resolveIcon`; render resolved `src`/`transform` | implementer-b |
| `src/modules/shared/fight-icon.test.tsx` | edit | Add override-applied case; keep existing cases passing unmodified | tester-b |
| `src/modules/shared/info-icon.test.tsx` | edit | Add override-applied case; keep existing cases passing unmodified | tester-b |
| `src/modules/shared/resource-icon.test.tsx` | edit | Add override-applied case; keep existing cases passing unmodified | tester-b |
| `src/testbed/components/IconEditor/IconEditorRow.tsx` | edit | Delete local `toTransform`/`PERCENT_PER_UNIT`; import `toIconTransform` from `@/modules/icons` | implementer-b |

No other file imports `IconEditorRow`'s `toTransform` (grepped this session: the only reference is its own definition and its one call site, both in `IconEditorRow.tsx`) — no further repoint needed. `IconEditor.test.tsx`/`IconEditor.preview.tsx` reference neither `toTransform` nor any `transform:` style assertion (grepped this session) — no edit needed in those files.

## Contracts
```ts
// src/modules/icons/resolve-icon.ts

export interface ResolvedIcon {
  /** Public path to render, e.g. "/sprites/icon_fight.png" or an uploaded override's path. */
  src: string;
  /** CSS transform to apply to the element that wraps the <Image>, e.g. "rotate(0deg) scale(1)". */
  transform: string;
}

/**
 * Looks up `id` in `iconRegistry`, applies any matching entry in `iconOverridesConfig`
 * (src/rotation/size override the registry default when present), and returns the resolved
 * image src and CSS transform.
 *
 * Throws if `id` is not in `iconRegistry`, or if the matching entry's `defaultSource.kind`
 * is `'lucide'` (this resolver only resolves image icons; the three current call sites are
 * all image-kind registry entries).
 */
export function resolveIcon(id: string): ResolvedIcon;

/** `rotate(${rotation}deg) scale(${size / 100})`. Shared by resolveIcon and IconEditorRow. */
export function toIconTransform(rotation: number, size: number): string;
```

```ts
// src/modules/icons/index.ts additions (alongside the existing exports)
export { resolveIcon, toIconTransform } from './resolve-icon';
export type { ResolvedIcon } from './resolve-icon';
```

```tsx
// src/modules/shared/fight-icon.tsx shape (InfoIcon mirrors this with 'icon-info'/"Info")
import { resolveIcon } from '@/modules/icons';

export function FightIcon({ className }: { className?: string }) {
  const { src, transform } = resolveIcon('icon-fight');
  return (
    <span className={cn('relative inline-flex items-center justify-center shrink-0', className)}>
      <span className="relative flex h-full w-full items-center justify-center" style={{ transform }}>
        <Image src={src} alt="Fight" width={32} height={32}
               className="h-full w-full object-contain select-none" unoptimized />
      </span>
    </span>
  );
}
```

```ts
// src/modules/shared/resource-icon.tsx table change
const RESOURCE_ICON_IDS: Record<ResourceType, string> = {
  [ResourceType.Food]: 'icon-meat',
  [ResourceType.Wood]: 'icon-wood',
  [ResourceType.Gold]: 'icon-gold',
};
// ResourceIcon: const iconId = RESOURCE_ICON_IDS[type]; if (!iconId) return null;
// const { src, transform } = resolveIcon(iconId); // same wrapper/Image shape as FightIcon above, alt = getResourceDisplayName(type)
```

## Phases
### Phase 1: Resolver and wiring
1. Write `src/modules/icons/resolve-icon.ts` per the contracts block. (implementer-a)
2. Add the two exports to `src/modules/icons/index.ts`. (implementer-a)
3. Edit `fight-icon.tsx`, `info-icon.tsx`, `resource-icon.tsx` per the contracts block. (implementer-b)
4. Edit `IconEditorRow.tsx`: delete `toTransform` and the now-unused `PERCENT_PER_UNIT` constant; import and call `toIconTransform` from `@/modules/icons` at its one call site (line 62). (implementer-b)
5. Write `resolve-icon.test.ts` (tester-a, logic, before tester-b).
6. Extend the three `*.test.tsx` files with an override-applied case each (tester-b).
7. `npm run typecheck`, `npm run lint`, `npm test`. Fix any failure in the owning file.
8. docs-sync: record the new resolver path in architecture docs (see Notes below).

Model escalation: none — all steps are mechanical given the contracts block.

## Test plan
- tester-a (`resolve-icon.test.ts`, logic first):
  - Known id, no override → returns the registry default `src` and `transform: 'rotate(0deg) scale(1)'` (e.g. `resolveIcon('icon-fight')` against the real seeded registry/overrides, both already `import`ed by `resolve-icon.ts` — no fixture needed, overrides are `{}` today).
  - Known id, override with only `rotation`/`size` (no `src`) → `src` stays the registry default, `transform` reflects the override's numbers. Use `jest.mock('./icon-overrides.config.json', () => ({ 'icon-fight': { rotation: 45, size: 50 } }))` (module path relative to `resolve-icon.ts`).
  - Known id, override with `src` → returned `src` is the override's path, not the registry default.
  - Unknown id → throws.
  - Id whose registry entry is `kind: 'lucide'` → throws. (Pick a real lucide-kind id from `icon-registry.config.json` at test-write time; don't invent one — grep the file for a `"kind": "lucide"` entry.)
  - `toIconTransform(0, 100)` → `'rotate(0deg) scale(1)'`; `toIconTransform(45, 50)` → `'rotate(45deg) scale(0.5)'`.
- tester-b (view):
  - `FightIcon`/`InfoIcon`/`ResourceIcon`: existing 4 (resp. 4) cases keep passing unmodified.
  - New case per component: `jest.mock('@/modules/icons', ...)` (keep the module's other real exports via `jest.requireActual` and override only `resolveIcon`) to return a distinct `src`/`transform`, then assert the rendered `<img src>` matches and the inner wrapper span's inline `style.transform` matches.
  - No e2e needed: triage confirms no new render sites and no visual state change (overrides config is `{}`).

## Preview states
None — triage drops the preview stage (no new visual state while `icon-overrides.config.json` is `{}`).

## Risks
- `jest.mock` of a relative `.json` path inside `resolve-icon.test.ts` must match the exact relative specifier used by `resolve-icon.ts`'s import, or the mock silently misses and the test reads the real (empty) file. Verify by making one assertion fail deliberately first, or by asserting an override-dependent value differs from the no-override case in the same test file.

## Review (architect-b)
VERDICT: APPROVED

Checks run this session:
1. `kind` enumeration — `grep -o '"kind": *"[a-z]*"' src/modules/icons/icon-registry.config.json | sort | uniq -c` → `5 "image"`, `51 "lucide"`. `IconDefaultSource` (`src/modules/icons/icon-registry.types.ts:6`) is a closed union of exactly these two kinds, so "throws for unknown id or `kind: 'lucide'`" covers every real entry, not just the five shared image ones. Confirmed.
2. Call sites — `grep -rln` for `FightIcon`/`InfoIcon`/`ResourceIcon` outside their own definition files found 4 + 1 + 7 = 12 real usages (`CombatDialog.tsx`, `ArmySelectionDialog.tsx`, `PlayerInfoStats.tsx`, `ActionButton.tsx`, `TutorialBeacon.tsx`, `PositionDialog.tsx`, `WealthyDialog.tsx`, `ProductiveCardDialog.tsx`, `AbilitiesDialog.tsx`, `ResourceSelectionStep.tsx`, `GameBoardHeader.tsx`, plus `PlayerInfoStats.tsx` again for the resource icon), matching the plan's "12 call sites". Every one passes only `className` (and `type` for `ResourceIcon`) — the exact props the current signatures (`fight-icon.tsx:4`, `resource-icon.tsx:12`) already accept and the plan leaves unchanged. Confirmed no call site needs touching.
3. `IconEditorRow` reuse — current `toTransform` (`IconEditorRow.tsx:34-36`) is `` `rotate(${rotation}deg) scale(${size / PERCENT_PER_UNIT})` `` with `PERCENT_PER_UNIT = 100` (`IconEditorRow.tsx:16`), used once at `IconEditorRow.tsx:62`. This is byte-identical to the contract's `toIconTransform(rotation, size)` formula; swapping the import produces the same string for every input, so the editor's rendered `style.transform` is unchanged. Confirmed.

No other findings. Verified context, decisions, file plan, contracts and test plan all check out against the real code (`src/modules/icons/index.ts:1-16`, `resource-icon.tsx`, `fight-icon.tsx`). Status → APPROVED.
