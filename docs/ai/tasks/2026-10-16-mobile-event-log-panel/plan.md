# Plan: Mobile Event Log expansion panel

Status: APPROVED
Inputs: triage.md, ui-design.md (Final spec)

## Goal and acceptance criteria
- [ ] Desktop (≥1024px/`lg:`): `GameBoard.tsx`'s right `aside` is pixel-identical — `ActionsPanelView` then inline `GameLog`, unchanged.
- [ ] Mobile (<768px): no inline Event Log card renders on initial load; only map, `PlayerInfoBar`, `MobileActionsBar`.
- [ ] Mobile: `MobileActionsBar` Row 1 shows a "Log" button grouped with "More Actions" on the right, always visible regardless of whose turn it is.
- [ ] Tapping "Log" opens a bottom sheet rendering `GameLogView` (title, "Show routine activity" switch, entry list) with the same data as the desktop panel for the same `GameState`.
- [ ] The sheet occupies most of the viewport height and its entry list scrolls independently.
- [ ] Opening "Log" while "More Actions" is open closes the actions sheet (no two sheets stacked), and vice versa.
- [ ] Closing the log sheet (outside tap, swipe, Escape, `X`) returns focus to "Log" and reveals the map unchanged.
- [ ] `npm run typecheck`, `npm run lint`, `npm test` pass.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `GameLogView`, `GameLog` | `src/modules/hud/components/GameLog/GameLog.tsx:46,85` | Pure view (`GameLogView`) + connected (`GameLog`) — reused as-is for the sheet's content, only gains a `variant` prop. |
| `GameLogViewModel` | `src/modules/hud/components/GameLog/GameLog.types.ts:25` | Unchanged; `variant` is NOT added to it (hook doesn't produce it) — it's a separate prop on `GameLogView`. |
| `useGameLog` | `src/modules/hud/components/GameLog/GameLog.hook.ts:6` | Reads `useGameBoard()` (`@/features/game/context/GameBoardContext`). Called again from the new sheet wrapper — same pattern as `GameLog()`'s one-liner. |
| `styles` (GameLog) | `src/modules/hud/components/GameLog/GameLog.styles.ts:1-16` | `card` (line 2), `content` (line 7), `scrollArea` (line 8) are the three tokens that must become variant-aware; everything else stays untouched. |
| `MobileActionsBar` | `src/modules/hud/components/ActionsPanel/MobileActionsBar.tsx:16-156` | Row 1 (line 46-88) holds the existing "More Actions" button (line 77-87, ref `moreActionsButtonRef` line 34) and `<MobileActionsSheet>` (line 145-153, `triggerRef` prop). New "Log" button and `<MobileEventLogSheet>` go here, same pattern. |
| `useMobileActionsBar` | `src/modules/hud/components/ActionsPanel/MobileActionsBar.hook.ts:18-46` | Owns `isSheetOpen`/`onSheetOpenChange` (line 10-11, 43-44). Gains `isLogSheetOpen`/`onLogSheetOpenChange` with mutual exclusion. Existing hook tests (`MobileActionsBar.hook.test.tsx`) assert current field names/behavior — must not break. |
| `MobileActionsSheet` | `src/modules/hud/components/ActionsPanel/MobileActionsSheet.tsx:13-67` | Sibling pattern to copy for `MobileEventLogSheet`: `Sheet`/`SheetContent side="bottom"`, `handleOpenChange` restoring focus via `triggerRef`, Escape handling. |
| `MobileActionsBar.styles.ts` | `src/modules/hud/components/ActionsPanel/MobileActionsBar.styles.ts:1-65` | `moreActionsButton` (line 43), `sheetContent` (line 52, motion-reduce override) are the tokens to mirror for the new button and sheet. |
| `Sheet`, `SheetContent` | `src/components/ui/sheet.tsx:10,56-75` | Radix Dialog underneath (`@radix-ui/react-dialog`); `SheetContent` default `p-6` (line 34) must be overridden to `p-0` for the log sheet so `GameLogView`'s own `Card` padding applies. |
| `Card`, `CardContent` | `src/components/ui/card.tsx:5-18,59-65` | `Card` has no built-in flex/height; the `sheet` variant must add `flex flex-col h-full` itself so `CardContent`'s `flex-1 min-h-0` can fill the sheet. |
| `GameBoard.tsx` inline `<GameLog />` | `src/features/game/components/GameBoard.tsx:75` | Wrap in `hidden md:block`; no other change to this file's JSX, matching `useIsMobile`'s 768px breakpoint. |
| `useIsMobile` / `MOBILE_BREAKPOINT` | `src/modules/shared/use-is-mobile.ts:3` | Confirmed 768px, same as Tailwind's `md:` — no mismatch window between the CSS wrapper and `ActionsPanel`'s JS mobile check (`ActionsPanel.tsx:124`). |
| `ScrollText` icon | `node_modules/lucide-react/dist/esm/lucide-react.js:1277` | Verified export, used for the "Log" trigger (distinct from `Clock`, already used for the `turn` category in `GameLog.tsx:16`). |
| `entries.length === 0` reachability | `src/modules/hud/components/GameLog/GameLog.test.tsx:15-20` | Test "renders nothing in the scroll area when entries is empty" proves this case is reachable today and already handled (header still renders, body is empty) — no new empty-state copy needed, confirming ui-design.md's open item. |
| cva usage precedent | `src/modules/hud/components/ActionsPanel/MobileActionsBar.styles.ts:17-27` | `row2` is already a `cva` variant lookup in this exact codebase — same mechanism to use for `GameLog.styles.ts`'s `card`/`content`/`scrollArea`. |

## Decisions
- `variant` is a prop on `GameLogView` only (`'panel' | 'sheet'`, default `'panel'`), not added to `GameLogViewModel` returned by `useGameLog` — the hook has no opinion on presentation; this keeps `GameLog.hook.ts`/`GameLog.map.ts` untouched, matching triage's "Out" scope. Rejected: adding `variant` to `GameLogViewModel` (would force `useGameLog`/every call site to pass it, no behavioral reason to).
- `MobileEventLogSheet.tsx` lives in `ActionsPanel/` (sibling of `MobileActionsSheet.tsx`), calling `useGameLog()` directly and importing `GameLogView` via relative paths (`../GameLog/GameLog`, `../GameLog/GameLog.hook`) — both components are in the same `hud` module, so this is an intra-module relative import, not a cross-module one; no public-API export changes to `src/modules/hud/index.ts` are needed. Rejected: exporting `GameLogView`/`useGameLog` from `hud/index.ts` (unnecessary — nothing outside the module needs them).
- Mutual exclusion between the two sheets lives in `useMobileActionsBar`'s two setters (opening one force-closes the other), not a new "which sheet is open" enum — keeps the existing `isSheetOpen`/`onSheetOpenChange` field names and all their current tests valid, only adding `isLogSheetOpen`/`onLogSheetOpenChange` alongside. Rejected: a single `activeSheet: 'none' | 'actions' | 'log'` field (would break the hook's existing public shape and its tests for no behavioral gain).
- `card`/`content`/`scrollArea` in `GameLog.styles.ts` become `cva` variant maps keyed by the same `variant` prop, following the existing `row2` `cva` precedent in this codebase, rather than a conditional/ternary in the `.tsx` — keeps all Tailwind classes in `.styles.ts` per `component-architecture`.
- `SheetContent` for the log sheet gets `aria-label="Event Log"` (not a new `SheetTitle`) so Radix's Dialog has an accessible name without introducing the second visible title the spec explicitly forbids. Rejected: a visually-hidden `SheetTitle` (adds a DOM node/complexity for a cosmetic Radix dev-console warning only; `aria-label` is the minimal fix).

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/hud/components/GameLog/GameLog.types.ts` | edit | Add `export type GameLogVariant = 'panel' \| 'sheet';` | implementer-a |
| `src/modules/hud/components/GameLog/GameLog.styles.ts` | edit | Make `card`, `content`, `scrollArea` `cva` variant maps keyed by `GameLogVariant`, default `'panel'`; all other tokens unchanged | implementer-a |
| `src/modules/hud/components/ActionsPanel/MobileActionsBar.hook.ts` | edit | Add `isLogSheetOpen`/`onLogSheetOpenChange` to `MobileActionsBarState`; mutual exclusion: opening one closes the other | implementer-a |
| `src/modules/hud/components/GameLog/GameLog.tsx` | edit | `GameLogView` accepts optional `variant` prop (default `'panel'`), passes it to `styles.card/content/scrollArea`; `GameLog()` unchanged | implementer-b |
| `src/modules/hud/components/ActionsPanel/MobileEventLogSheet.tsx` | new | Thin wrapper: `Sheet`/`SheetContent side="bottom"`, calls `useGameLog()`, renders `<GameLogView variant="sheet" .../>`, restores focus to `triggerRef` on close (mirrors `MobileActionsSheet.tsx`) | implementer-b |
| `src/modules/hud/components/ActionsPanel/MobileActionsBar.tsx` | edit | Add "Log" button (ref, `ScrollText` icon, `aria-label="Open event log"`, `data-testid="actions-panel-log"`) grouped with "More Actions" in Row 1; render `<MobileEventLogSheet>` | implementer-b |
| `src/modules/hud/components/ActionsPanel/MobileActionsBar.styles.ts` | edit | Add `triggerButtonGroup` (wraps Log + More Actions), `logButton`, `logSheetContent` tokens | implementer-b |
| `src/features/game/components/GameBoard.tsx` | edit | Wrap the existing `<GameLog />` call site (line 75) in `<div className="hidden md:block"><GameLog /></div>` — legacy wiring, minimal edit | implementer-b |
| `src/modules/hud/components/ActionsPanel/MobileActionsBar.hook.test.tsx` | edit | Add cases for `isLogSheetOpen` initial state, `onLogSheetOpenChange` toggling, and mutual exclusion in both directions | tester-a |
| `src/modules/hud/components/GameLog/GameLog.test.tsx` | edit | Add cases: default (`panel`) variant renders unchanged `card`/`scrollArea` classes; `variant="sheet"` renders borderless/transparent card and `flex-1 min-h-0` scroll area | tester-b |
| `src/modules/hud/components/ActionsPanel/MobileEventLogSheet.test.tsx` | new | Mount with `jest.mock('@/features/game/context/GameBoardContext')` (same pattern as `GameLog.hook.test.ts`): renders `GameLogView`'s content when `open`, nothing when closed, calls `onOpenChange(false)` and restores focus on close | tester-b |
| `src/modules/hud/components/ActionsPanel/MobileActionsBar.test.tsx` | edit | Add cases: "Log" button renders next to "More Actions"; clicking "Log" opens the log sheet; clicking "Log" while "More Actions" sheet is open closes the actions sheet (and vice versa) | tester-b |
| `src/modules/hud/components/GameLog/GameLog.preview.tsx` | edit | Add a `sheet`-variant preview state (e.g. `{ name: 'Sheet variant', render: () => <GameLogView {...mixedTwoTurnsLog} variant="sheet" /> }`) | preview-a |
| `src/modules/hud/components/ActionsPanel/MobileActionsBar.preview.tsx` | edit | No new fixture needed (existing states already show the new "Log" button); add one state with the log sheet pre-opened if trivial, otherwise leave as-is — preview-a's call once the button exists | preview-a |
| `src/testbed/registry.ts` | edit (only if a new preview export is added) | Register any new preview entry | preview-a |
| `docs/architecture/systems-and-visuals.md:72` | edit | Document the mobile "Log" trigger + bottom-sheet Event Log, and the one-sheet-at-a-time rule, alongside the existing "Mobile Actions Bar" paragraph | docs-sync |
| `docs/architecture/structure-and-state.md:14` | edit | Add `MobileEventLogSheet` to the `hud/components/` file list in the same sentence that already names `MobileActionsSheet`-adjacent files | docs-sync |

## Contracts
```ts
// src/modules/hud/components/GameLog/GameLog.types.ts — ADD (keep everything else in this file as-is)
export type GameLogVariant = 'panel' | 'sheet';
// GameLogViewModel is UNCHANGED — variant is not a field on it.

// src/modules/hud/components/GameLog/GameLog.styles.ts — card/content/scrollArea become cva, rest unchanged
import { cva } from 'class-variance-authority';

export const styles = {
  card: cva('backdrop-blur-xl', {
    variants: {
      variant: {
        panel: 'bg-background/40 bg-black border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]',
        sheet: 'border-none shadow-none bg-transparent flex flex-col h-full',
      },
    },
    defaultVariants: { variant: 'panel' },
  }),
  header: 'p-3 pb-1 flex items-center justify-between gap-2', // unchanged
  title: 'text-xs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap', // unchanged
  toggleRow: 'flex items-center gap-1.5 shrink-0', // unchanged
  toggleLabel: 'text-[10px] font-medium text-muted-foreground whitespace-nowrap', // unchanged
  content: cva('p-3 pt-0', {
    variants: { variant: { panel: '', sheet: 'flex-1 min-h-0 flex flex-col' } },
    defaultVariants: { variant: 'panel' },
  }),
  scrollArea: cva('w-full', {
    variants: { variant: { panel: 'h-32 sm:h-36', sheet: 'flex-1 min-h-0' } },
    defaultVariants: { variant: 'panel' },
  }),
  entriesContainer: 'space-y-1.5 pr-2', // unchanged
  entry: 'text-xs text-muted-foreground leading-relaxed flex items-start gap-1.5', // unchanged
  entryIcon: 'h-3 w-3 mt-0.5 shrink-0 text-muted-foreground', // unchanged
  milestoneIcon: 'h-3 w-3 mt-0.5 shrink-0 text-yellow-400', // unchanged
  entryText: 'flex-1', // unchanged
  divider: 'flex items-center gap-2 pt-2 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70', // unchanged
  dividerLine: 'h-px flex-1 bg-white/10', // unchanged
} as const;

// src/modules/hud/components/GameLog/GameLog.tsx — GameLogView signature change only
import type { DisplayedLogEntry, GameLogVariant, GameLogViewModel, LogMessageSegment } from './GameLog.types';

export function GameLogView({
  entries,
  showRoutineActivity,
  onToggleShowRoutineActivity,
  variant = 'panel',
}: GameLogViewModel & { variant?: GameLogVariant }) {
  // <Card className={styles.card({ variant })}> ... <CardContent className={styles.content({ variant })}>
  //   <ScrollArea className={styles.scrollArea({ variant })} data-testid="game-log-scroll"> ... unchanged body
}
// GameLog() connected component: UNCHANGED (still `<GameLogView {...useGameLog()} />`, implicit variant='panel').

// src/modules/hud/components/ActionsPanel/MobileActionsBar.hook.ts — extend state + mutual exclusion
export interface MobileActionsBarState {
  barRef: React.RefObject<HTMLDivElement>;
  barHeightPx: number;
  isSheetOpen: boolean;
  onSheetOpenChange: (open: boolean) => void;
  isLogSheetOpen: boolean;
  onLogSheetOpenChange: (open: boolean) => void;
}
// Opening the actions sheet (onSheetOpenChange(true)) closes the log sheet if it was open, and vice versa.
// Existing isSheetOpen/onSheetOpenChange field names and default-false/independent-of-barHeightPx behavior
// are preserved exactly — do not rename or restructure them.

// src/modules/hud/components/ActionsPanel/MobileEventLogSheet.tsx — new
export interface MobileEventLogSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerRef?: React.RefObject<HTMLButtonElement>;
}
export function MobileEventLogSheet(props: MobileEventLogSheetProps): JSX.Element;
// Internals: const logViewModel = useGameLog(); render <Sheet open={props.open} onOpenChange={...}>
//   <SheetContent side="bottom" className={styles.logSheetContent} aria-label="Event Log">
//     <GameLogView {...logViewModel} variant="sheet" />
//   </SheetContent></Sheet>
// onOpenChange wrapper: calls props.onOpenChange(newOpen), and on newOpen===false with triggerRef present,
// setTimeout(() => triggerRef.current?.focus(), 0) — identical pattern to MobileActionsSheet.tsx:22-31.

// src/modules/hud/components/ActionsPanel/MobileActionsBar.styles.ts — ADD (existing tokens unchanged)
triggerButtonGroup: 'flex items-center gap-1.5', // wraps Log + More Actions as the single right-hand Row 1 child
logButton: 'h-7 text-xs px-2 whitespace-nowrap flex items-center gap-1', // same sizing as moreActionsButton
logSheetContent: 'h-[75vh] max-h-[85vh] flex flex-col p-0 motion-reduce:duration-0 motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none',
```

## Phases
### Phase 1: Mobile Event Log panel
1. implementer-a: add `GameLogVariant` to `GameLog.types.ts`; convert `card`/`content`/`scrollArea` in `GameLog.styles.ts` to `cva` per the contract (sonnet — must preserve every existing class token byte-for-byte while reshaping to `cva`).
2. implementer-a: extend `MobileActionsBar.hook.ts` with `isLogSheetOpen`/`onLogSheetOpenChange` and mutual-exclusion setters, without renaming or changing the behavior of `isSheetOpen`/`onSheetOpenChange`/`barHeightPx` (sonnet — must not break `MobileActionsBar.hook.test.tsx`'s existing 8 cases).
3. implementer-b: update `GameLog.tsx`'s `GameLogView` to accept and thread the `variant` prop per the contract; `GameLog()` stays a one-liner.
4. implementer-b: add `triggerButtonGroup`/`logButton`/`logSheetContent` tokens to `MobileActionsBar.styles.ts`.
5. implementer-b: create `MobileEventLogSheet.tsx` per the contract (sonnet — must get the focus-restore and `aria-label` right without a second visible title).
6. implementer-b: edit `MobileActionsBar.tsx` — wrap "More Actions" and the new "Log" button in `styles.triggerButtonGroup`; add the "Log" button (ref, `ScrollText` icon, `aria-label="Open event log"`, `data-testid="actions-panel-log"`, `onClick={() => onLogSheetOpenChange(true)}`); render `<MobileEventLogSheet open={isLogSheetOpen} onOpenChange={onLogSheetOpenChange} triggerRef={logButtonRef} />` alongside the existing `<MobileActionsSheet>`.
7. implementer-b: edit `GameBoard.tsx:75` — wrap `<GameLog />` in `<div className="hidden md:block">`.
8. tester-a: extend `MobileActionsBar.hook.test.tsx` with the mutual-exclusion cases.
9. tester-b: extend `GameLog.test.tsx` with the two variant cases; create `MobileEventLogSheet.test.tsx`; extend `MobileActionsBar.test.tsx` with the "Log" button/sheet cases.
10. preview-a: add the sheet-variant state to `GameLog.preview.tsx`; confirm `MobileActionsBar.preview.tsx` already exercises the new button (edit only if a dedicated "Log sheet open" state is trivial to add); update `src/testbed/registry.ts` only if a new preview export is created.
11. docs-sync: update `docs/architecture/systems-and-visuals.md:72` and `docs/architecture/structure-and-state.md:14` per the File plan.
12. Run `npm run typecheck`, `npm run lint`, `npm test`; verify in the browser at both <768px and ≥1024px with `node .claude/skills/ui-verify/scripts/snapshot.mjs` (desktop unchanged, mobile shows "Log" button, sheet opens/closes, focus restores, map stays visible).

Model escalation: steps 1, 2, 5 (sonnet) — a `cva` reshape that must preserve every class token exactly, a stateful mutual-exclusion hook with existing test coverage to protect, and a new sheet wrapper getting focus-restore/a11y right without a second title. All other steps: haiku.

## Test plan
- tester-a (logic, first):
  - `MobileActionsBar.hook.test.tsx`: `isLogSheetOpen` starts `false`; `onLogSheetOpenChange(true)` sets it `true` and, if `isSheetOpen` was `true`, closes it; `onSheetOpenChange(true)` symmetrically closes an open log sheet; opening/closing one sheet when the other is already closed doesn't touch the other's state; `isLogSheetOpen` is independent of `barHeightPx` updates (mirrors the existing `isSheetOpen`-vs-height test at line 201-245).
- tester-b (view and e2e; no e2e needed, same tier/precedent as `MobileActionsSheet`, which has none):
  - `GameLog.test.tsx`: default/no-`variant` render keeps the current `card`/`scrollArea` classes (regression — reuse `legacyOnlyLog` fixture); `variant="sheet"` render has `border-none`/`shadow-none`/`bg-transparent` on the card and `flex-1`/`min-h-0` on the scroll area, and still shows the title/switch/entries (reuse `mixedTwoTurnsLog`).
  - `MobileEventLogSheet.test.tsx` (mock `GameBoardContext` as `GameLog.hook.test.ts` does): renders `GameLogView`'s "Event Log" title and entries when `open=true`; renders nothing visible when `open=false`; calling the sheet's close triggers `onOpenChange(false)` and (with a `triggerRef`) focuses it after close.
  - `MobileActionsBar.test.tsx`: "Log" button renders with `data-testid="actions-panel-log"` next to `actions-panel-more-actions`, in every fixture state (`myTurnNoSelection`, `notMyTurn`, etc. — always visible); clicking "Log" shows the sheet's "Event Log" title; clicking "Log" while "More Actions" is open closes the actions sheet (its "Actions" title disappears) and vice versa.

## Preview states
- `GameLogView` (`GameLog.preview.tsx`): existing 7 states unchanged, plus `Sheet variant` (`variant="sheet"` with `mixedTwoTurnsLog` data) to visually confirm the borderless/transparent chrome against a dark backdrop.
- `MobileActionsBar` (`MobileActionsBar.preview.tsx`): existing 5 states now also show the "Log" button (no fixture change needed since it renders unconditionally); preview-a's call whether a 6th "Log sheet open" state is worth adding.

## Risks
- Radix's Dialog expects an accessible name; using `aria-label="Event Log"` on `SheetContent` instead of a `SheetTitle` avoids a second visible title (per spec) but implementer-b must verify no Radix dev-console warning appears — check in the browser, not just `npm test` (jsdom doesn't surface Radix's console warning the same way).
- `ScrollArea`'s `flex-1 min-h-0` for the `sheet` variant depends on every ancestor in the chain (`SheetContent` → `GameLogView`'s `Card` → `CardContent`) actually being a flex column with a bounded height; if `SheetContent`'s own `h-[75vh] max-h-[85vh] flex flex-col` (on `logSheetContent`) isn't applied correctly the log won't scroll independently — verify visually, not just via class assertions in tests.

## Review (architect-b)
VERDICT: APPROVED

Verified every path/symbol in "Verified context" and the File plan against the repo (not just grep hits — read each cited file):
- `GameLog.tsx:46,85`, `GameLog.types.ts:25`, `GameLog.styles.ts:2,7-8`, `GameLog.hook.ts:6` — exact match.
- `MobileActionsBar.tsx:34` (`moreActionsButtonRef`), `:77-87` (More Actions button), `:145-153` (`<MobileActionsSheet>`) — exact match.
- `MobileActionsBar.hook.ts:5-12` (`MobileActionsBarState`), `:43-44` (return) — exact match; existing hook test file is 246 lines with the height-independence case the plan must not break (`MobileActionsBar.hook.test.tsx:201-245`), confirmed present.
- `MobileActionsSheet.tsx:13-67` full component, `:22-31` focus-restore `setTimeout` pattern — exact match, correct sibling to copy.
- `MobileActionsBar.styles.ts:43` `moreActionsButton`, `:52` `sheetContent` motion-reduce override, `:17-27` `row2` `cva` precedent — exact match.
- `GameBoard.tsx:75` is `<GameLog />` inside the right `aside` — exact match.
- `use-is-mobile.ts:3` `MOBILE_BREAKPOINT = 768` — exact match, confirmed same width Tailwind's `md:` resolves to and the same value `ActionsPanel.tsx:124` reads via `useIsMobile()`.
- `sheet.tsx`: `SheetContent` default `p-6` on the `sheetVariants` base (not line 34 exactly but same string) — present as cited, Radix Dialog underneath confirmed (`SheetPrimitive = @radix-ui/react-dialog`).
- `card.tsx:59-65` `CardContent` — `cn("p-6 pt-0", className)`, confirms the plan's claim that the existing `styles.content` string already overrides the Card default via `className`, so the `sheet` variant's `flex-1 min-h-0 flex flex-col` will apply the same way.
- `lucide-react.js:1277` exports `ScrollText` — confirmed.
- `GameLog.test.tsx:15-19` "renders nothing in the scroll area when entries is empty" — confirmed reachable and already handled (title still renders), so the plan's call to not invent new empty-state copy is correct.
- `systems-and-visuals.md:72` and `structure-and-state.md:14` — both exact lines for the "Mobile Actions Bar" bullet and the `hud/components/` file list.
- `hud/index.ts` does not export `GameLogView`/`useGameLog` today, confirming the decision not to add them is a no-op, not a regression.
- `ActionsPanel.types.ts:42` `ActionsPanelViewProps`, `:46` `MobileActionsSheetProps` — both exist as the plan assumes.

Design:
- Reuse over invention: the only new file is `MobileEventLogSheet.tsx`, a thin wrapper mirroring `MobileActionsSheet.tsx`'s already-shipped pattern; `GameLogView` stays the single source of truth for log rendering, `useGameLog` untouched.
- Responsibilities split cleanly: implementer-a owns the two logic-adjacent edits (types/styles `cva` reshape, hook state), implementer-b owns the view-threading and new wiring — no overlap, contracts in the plan are concrete enough (full `cva` config shown, full prop interfaces shown) for both to work without talking to each other.
- `variant` as a `GameLogView`-only prop (not on `GameLogViewModel`) is the right call: `useGameLog` has no presentation concerns, and adding it to the view model would force every caller to pass it for no behavioral reason.
- Mutual exclusion kept as two independent booleans with cross-closing setters, not a new `activeSheet` enum — correctly preserves `isSheetOpen`/`onSheetOpenChange`'s existing name and behavior (and its test coverage) while adding the minimum needed state.
- `aria-label="Event Log"` instead of a second `SheetTitle` is the minimal fix for Radix's accessible-name requirement without violating the spec's "exactly one title" rule.
- `cva` reshape preserves every original class token: original `card` string `'bg-background/40 bg-black backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]'` is byte-equivalent to the proposed `base: 'backdrop-blur-xl'` + `panel: 'bg-background/40 bg-black border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]'` (cva concatenates base+variant) — no token lost or altered.
- Test plan correctly orders logic (hook mutual-exclusion) before view (GameLogView variant, sheet mount, bar integration), per `testing` skill.
- Risks section correctly flags the two things jsdom can't catch (Radix console warning, visual flex-chain correctness) and routes them to browser verification instead of over-trusting unit tests.

No changes requested.
