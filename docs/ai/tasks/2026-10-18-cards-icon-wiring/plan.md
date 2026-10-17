# Plan: Cards dialogs icons through the registry

Status: APPROVED
Inputs: triage.md

## Goal and acceptance criteria
- [ ] Every lucide glyph used in `src/modules/cards/components/` renders through `RegistryIcon` (`src/modules/shared`) by registry id, with the same visible icon, size and color classes as before (className unchanged per call site).
- [ ] Each of the 7 files' `lucide-react` import is removed once no glyph from it remains.
- [ ] No behavior change: `icon-overrides.config.json` is empty today, so rendered output is pixel-identical; only the render path changes.
- [ ] `npm run typecheck`, `npm run lint`, `npm test` pass.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `RegistryIcon` | `src/modules/shared/registry-icon.tsx:15-24`, exported `src/modules/shared/index.ts:11` | `{ id, className?, alt? }`; renders the resolved lucide glyph or image inside a transform-wrapped span. Already used by combat (`docs/ai/tasks/2026-10-17-combat-icon-wiring`). |
| `getLucideGlyph` | `src/modules/icons/lucide-glyphs.ts:68-70` | Backs `RegistryIcon`'s lucide branch; confirms a glyph name resolves. |
| Registry ids used here | `src/modules/icons/icon-registry.config.json` (verified via script): `sparkles`→`Sparkles`, `zap`→`Zap`, `shield`→`Shield`, `play`→`Play`, `trending-up`→`TrendingUp`, `check`→`Check`, `ban`→`Ban`, `check-circle`→`CheckCircle`, `award`→`Award`, `arrow-left`→`ArrowLeft`, `hand-metal`→`HandMetal`, `dices`→`Dices`, `x-circle`→`XCircle` | Every id already exists with `kind: 'lucide'`; no registry edit needed. |
| Glyph names in lookup | `src/modules/icons/lucide-glyphs.ts:4-56` (import list) and `62-114` (`LUCIDE_GLYPHS` map) | All 13 names above (`Sparkles`, `Zap`, `Shield`, `Play`, `TrendingUp`, `Check`, `Ban`, `CheckCircle`, `Award`, `ArrowLeft`, `HandMetal`, `Dices`, `XCircle`) are present; no glyph-map edit needed. |
| `jest.setup.js` lucide mock | `jest.setup.js:19-25` | Mocks every `lucide-react` export as `<span data-testid="lucide-icon-<name>">`. `RegistryIcon`'s lucide branch calls `getLucideGlyph` from `@/modules/icons`, which still imports the real (mocked) `lucide-react` components — so `RegistryIcon`'s rendered glyph is still the `lucide-icon-*` mock span, just wrapped in `RegistryIcon`'s two extra `<span>` wrappers. No cards test queries `lucide-icon-*` or `<svg>` (verified below), so this wrapping needs no test change. |
| Cards test files, grep-verified | `CardsDialog.test.tsx`, `ProductiveCardDialog.test.tsx`, `SabotageDialog.test.tsx`, `AbilitiesDialog.test.tsx`, `StealResourceDialog.test.tsx`, `SpecialIslandRollDialog.test.tsx` (all in their component folders under `src/modules/cards/components/`) | None references a lucide name, `data-testid="lucide-icon-*"`, or queries an `<svg>`; all assert on text, `data-testid` values the component itself sets, or `toBeInTheDocument()`. No test-file edits needed. |
| 7 files with direct `lucide-react` imports, grep-verified | `src/modules/cards/components/CardsDialog/CardsDialog.tsx:15`, `.../ProductiveCardDialog/ProductiveCardDialog.tsx:14`, `.../SabotageDialog/SabotageDialog.tsx:13`, `.../AbilitiesDialog/AbilitiesDialog.tsx:17`, `.../StealResourceDialog/ResourceSelectionStep.tsx:7`, `.../StealResourceDialog/PlayerSelectionStep.tsx:6`, `.../SpecialIslandRollDialog/SpecialIslandRollDialog.tsx:13` | Exhaustive; `WealthyDialog` (8th cards component) has no `lucide-react` import (grep-verified) — out of scope, matches triage. |
| `SpecialIslandRollDialog.tsx:28-35` | same file | Header icon is `next/image` (`/sprites/icon_gold.png`), not lucide — out of scope, triage explicitly excludes non-icon-role and non-lucide usages. |
| Docs line to update | `docs/architecture/systems-and-visuals.md:185` | Current sentence ends "...so an override for any of those ids changes that glyph." after listing combat's registry ids; cards' ids are added the same way. |

## Decisions
- Reuse `RegistryIcon` as-is; no prop or contract change needed because every glyph here is decorative (no `alt` needed, matches combat's usage pattern). Rejected: a cards-specific icon wrapper (duplicates `RegistryIcon` for no reason).
- Keep each call site's existing `className` unchanged, passed straight to `RegistryIcon`'s `className` prop, preserving current size/color exactly. Rejected: normalizing classNames while swapping (out of scope, risks a visible change).
- One phase, implementer-b only (no new types, no hook/map changes) because this is a pure JSX swap in files implementer-b already owns under component-architecture's view-layer split. Rejected: splitting file edits between implementer-a/b (no logic-layer file is touched).

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/cards/components/CardsDialog/CardsDialog.tsx` | edit | Replace `Sparkles` (line 29), `Zap` (line 47), `Play` (line 61), `Shield` (line 74) with `<RegistryIcon id="sparkles"/"zap"/"play"/"shield">`, same `className` each; remove `lucide-react` import (line 15); add `RegistryIcon` import from `@/modules/shared` | implementer-b |
| `src/modules/cards/components/ProductiveCardDialog/ProductiveCardDialog.tsx` | edit | Replace `TrendingUp` (line 30), `Check` (line 52) with `<RegistryIcon id="trending-up"/"check">`, same `className`; remove `lucide-react` import (line 14); add `RegistryIcon` import, merge into existing `@/modules/shared` import (line 13) | implementer-b |
| `src/modules/cards/components/SabotageDialog/SabotageDialog.tsx` | edit | Replace `Ban` (lines 27, 58) with `<RegistryIcon id="ban">`, same `className` each; remove `lucide-react` import (line 13); add `RegistryIcon` import from `@/modules/shared` | implementer-b |
| `src/modules/cards/components/AbilitiesDialog/AbilitiesDialog.tsx` | edit | Replace `CheckCircle` (line 50), `Award` (line 31) with `<RegistryIcon id="check-circle"/"award">`, same `className`; remove `lucide-react` import (line 17); add `RegistryIcon` import, merge into existing `@/modules/shared` import (line 15) | implementer-b |
| `src/modules/cards/components/StealResourceDialog/ResourceSelectionStep.tsx` | edit | Replace `HandMetal` (line 26), `Check` (line 56), `ArrowLeft` (line 83) with `<RegistryIcon id="hand-metal"/"check"/"arrow-left">`, same `className` each; remove `lucide-react` import (line 7); add `RegistryIcon` import, merge into existing `@/modules/shared` import (line 6) | implementer-b |
| `src/modules/cards/components/StealResourceDialog/PlayerSelectionStep.tsx` | edit | Replace `HandMetal` (line 17) with `<RegistryIcon id="hand-metal">`, same `className`; remove `lucide-react` import (line 6); add `RegistryIcon` import from `@/modules/shared` | implementer-b |
| `src/modules/cards/components/SpecialIslandRollDialog/SpecialIslandRollDialog.tsx` | edit | Replace `Dices` (lines 49, 87), `Sparkles` (line 63), `XCircle` (line 74) with `<RegistryIcon id="dices"/"sparkles"/"x-circle">`, same `className` each; remove `lucide-react` import (line 13); add `RegistryIcon` import from `@/modules/shared` | implementer-b |
| `docs/architecture/systems-and-visuals.md` | edit | Extend the sentence at line 185 listing which modules' dialogs draw through `RegistryIcon`: add the cards dialogs and their ids (`sparkles`, `zap`, `shield`, `play`, `trending-up`, `check`, `ban`, `check-circle`, `award`, `arrow-left`, `hand-metal`, `dices`, `x-circle`) alongside the existing combat list | docs-sync |

No test file needs an edit (verified above); tester-b runs the existing cards suite to confirm nothing broke.

## Contracts
No new or changed types, props or signatures. `RegistryIcon` (`src/modules/shared/registry-icon.tsx:6-12`) is reused unmodified:
```ts
export interface RegistryIconProps {
  id: string;
  className?: string;
  alt?: string; // omitted here: every glyph replaced is decorative, matching combat's usage
}
```
Replacement pattern, applied verbatim at each site listed in the File plan, e.g.:
```tsx
// before
import { Sparkles } from 'lucide-react';
<Sparkles className={styles.icon} />

// after
import { RegistryIcon } from '@/modules/shared';
<RegistryIcon id="sparkles" className={styles.icon} />
```

## Phases
### Phase 1: cards dialogs wired to the registry
1. implementer-b: edit the 7 `.tsx` files per the File plan, each glyph replaced 1:1 with `RegistryIcon` at its id, same `className`; drop each file's now-unused `lucide-react` import; merge `RegistryIcon` into an existing `@/modules/shared` import where one is already present (ProductiveCardDialog, AbilitiesDialog, ResourceSelectionStep), else add a new import line.
2. tester-b: run `npx jest src/modules/cards` (no new assertions expected; add one only if a run reveals a real gap).
3. docs-sync: update `docs/architecture/systems-and-visuals.md:185` per the File plan.
4. Checks: `npm run typecheck`, `npm run lint`, `npm test`.

Model escalation: none — mechanical glyph-for-id swap, no new design decisions.

## Test plan
- tester-a (logic, first): none — no `.map.ts`, `.hook.ts` or `.service.ts` touched.
- tester-b (view and e2e): run the existing suites for all 6 affected dialogs (`CardsDialog.test.tsx`, `ProductiveCardDialog.test.tsx`, `SabotageDialog.test.tsx`, `AbilitiesDialog.test.tsx`, `StealResourceDialog.test.tsx`, `SpecialIslandRollDialog.test.tsx`) unmodified; confirm all still pass with `RegistryIcon` wrapping in place. No new case needed since no test asserts on lucide markup.

## Preview states
- None new. Default overrides are empty, so every existing preview (`*.preview.tsx` per component, unchanged) renders identically; preview-a does not run this phase (triage: "no new preview state").

## Risks
- A missed `className` when swapping a call site would silently change icon size/color. Mitigation: File plan names the exact className per site (copy verbatim, do not rewrite).
- Merging `RegistryIcon` into an existing `@/modules/shared` import vs. adding a new line is a per-file judgment; mitigation: File plan states which files already import from `@/modules/shared` (ProductiveCardDialog line 13, AbilitiesDialog line 15, ResourceSelectionStep line 6) so implementer-b merges there and adds a fresh import only in the other four files.

## Review (architect-b)
VERDICT: APPROVED
- All 7 files with direct `lucide-react` imports verified by independent grep over `src/modules/cards/components/`; matches File plan exactly, no 8th file missed.
- Every call site's glyph name, line number and `className` checked against the current file contents (`CardsDialog.tsx:15,29,47,61,74`; `ProductiveCardDialog.tsx:14,30,52`; `SabotageDialog.tsx:13,27,58`; `AbilitiesDialog.tsx:17,31,50`; `ResourceSelectionStep.tsx:7,26,56,83`; `PlayerSelectionStep.tsx:6,17`; `SpecialIslandRollDialog.tsx:13,49,63,74,87`) — all match the plan's File plan rows.
- All 13 registry ids confirmed present with `kind: 'lucide'` in `src/modules/icons/icon-registry.config.json`; all 13 glyph names confirmed in `LUCIDE_GLYPHS`/import list in `src/modules/icons/lucide-glyphs.ts`.
- `SpecialIslandRollDialog.tsx:28-35` header icon confirmed `next/image` (`src="/sprites/icon_gold.png"`), not lucide — correctly out of scope.
- `WealthyDialog` (`src/modules/cards/components/WealthyDialog/WealthyDialog.tsx`) confirmed to have no `lucide-react` import — correctly out of scope.
- Grepped all 6 cards `.test.tsx` files for `lucide`/`svg`: zero hits. No cards test depends on lucide DOM structure, so wrapping each glyph in `RegistryIcon`'s extra spans is safe without test edits.
- `RegistryIcon` contract (`src/modules/shared/registry-icon.tsx:6-11`) matches the plan's quoted interface; exported from `src/modules/shared/index.ts:11-12`.
- Docs line (`docs/architecture/systems-and-visuals.md:185`) confirmed to end with the combat registry-id sentence the plan proposes extending.
- File plan, contracts, test plan and phase scoping are appropriately minimal for a mechanical glyph swap; no simpler design exists (reusing `RegistryIcon` as-is is correct, no new wrapper needed).
