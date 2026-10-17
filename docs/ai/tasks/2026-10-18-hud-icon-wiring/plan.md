# Plan: HUD icons through the registry

Status: APPROVED
Inputs: triage.md

## Goal and acceptance criteria
- [ ] Every lucide-react glyph in the 11 HUD files listed below renders through `RegistryIcon` (same pattern as `src/modules/combat/components/` and `src/modules/cards/components/`), so an icon-editor override for its registry id changes it.
- [ ] No HUD file under `src/modules/hud/components/` imports from `lucide-react` directly after this change (`grep -rl "lucide-react" src/modules/hud/components/` returns empty).
- [ ] Visual output is unchanged: default overrides are empty, `className` values are preserved verbatim at every call site, and every call site that set `aria-hidden="true"` directly on the glyph still does so after the swap.
- [ ] `npm run typecheck`, `npm run lint`, `npm test` pass.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `RegistryIcon` | `src/modules/shared/registry-icon.tsx:15` | Component every call site switches to. Props today: `{ id: string; className?: string; alt?: string }` (`registry-icon.tsx:6-12`); this plan adds `aria-hidden?: boolean`, forwarded to the outer `<span>` (`registry-icon.tsx:18`). |
| `RegistryIcon` export | `src/modules/shared/index.ts:11` | Import path is `@/modules/shared`. |
| `getLucideGlyph` | `src/modules/icons/lucide-glyphs.ts` | Confirmed (grep, below) every lucide name used by HUD is present. |
| icon registry | `src/modules/icons/icon-registry.config.json` | Confirmed every lucide name used by HUD resolves to exactly one `id` (node script run this session, no ambiguous matches). |
| Precedent usage | `src/modules/cards/components/CardsDialog/CardsDialog.tsx:29,47,61,74` | Same glyph-to-`<RegistryIcon id="..." className={...} />` swap pattern, static JSX, no dynamic component refs. |
| `styles.*` values used as icon className | `src/modules/hud/components/GameBoardHeader/GameBoardHeader.styles.ts:8,16,19-22`, `GameStatusBadge.styles.ts:6,17`, `GameLog.styles.ts:37-38`, `ActionsPanel/MobileActionsBar.styles.ts:52` | All are plain strings or `cva(...)` results (strings at call time) — safe to pass straight through to `className`. |

## Decisions
- Swap `<Glyph className={...} />` → `<RegistryIcon id="<registry-id>" className={...} />` 1:1, because this is the established pattern (combat, cards) and `RegistryIcon` already carries override/transform logic. Rejected: a new HUD-specific icon wrapper (unnecessary layer, violates KISS).
- Add an optional `aria-hidden?: boolean` prop to `RegistryIconProps` (`src/modules/shared/registry-icon.tsx:6-12`), forwarded onto the outer `<span>` (`registry-icon.tsx:18`), default unset, because `aria-hidden="true"` on a decorative icon is an established, deliberate convention in this codebase (8 files use it today, architect-b review finding 1) and the 4 call sites this task touches (`GameBoardHeader.tsx:59`, `GameLog.tsx:28`, `GameLog.tsx:34`, `MobileSheetTriggers.tsx:32`) would otherwise lose it, a real regression this task introduces rather than a pre-existing gap — lucide's default SVG carries no `role`/`aria-hidden` of its own. This is in scope even though `RegistryIcon` lives in `src/modules/shared`: it is the minimal, backward-compatible fix needed to preserve current behavior at call sites this task edits, not a speculative addition. Rejected: dropping `aria-hidden` and accepting the regression (overruled by architect-b); a HUD-local wrapper around `RegistryIcon` just to add the attribute (extra layer, violates KISS, and the prop is generically useful).
- `GameLog.tsx`'s `CATEGORY_ICONS: Record<LogCategory, typeof Swords>` (`GameLog.tsx:17-23`) maps a category to a lucide *component reference*, then renders it dynamically (`GameLog.tsx:33-34`: `const Icon = CATEGORY_ICONS[entry.category]; return <Icon .../>`). `RegistryIcon` takes an `id` string, not a component, so this must become `CATEGORY_ICON_IDS: Record<LogCategory, string>` mapping to registry ids, with `<RegistryIcon id={CATEGORY_ICON_IDS[entry.category]} className={styles.entryIcon} />`. This is the one file where the swap is structural, not line-for-line — mark it for sonnet.

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/shared/registry-icon.tsx` | edit | Add optional `aria-hidden?: boolean` to `RegistryIconProps`, forwarded to the outer `<span>` | implementer-b |
| `src/modules/shared/registry-icon.test.tsx` | edit | Add a case covering `aria-hidden` forwarded to the outer span, and a case confirming it is absent when the prop is omitted | implementer-b |
| `src/modules/hud/components/PlayerInfo/PlayerInfo.tsx` | edit | Swap `Trophy` for `RegistryIcon id="trophy"` | implementer-b |
| `src/modules/hud/components/PlayerInfo/PlayerInfoStats.tsx` | edit | Swap `Zap`, `Album` for `RegistryIcon` | implementer-b |
| `src/modules/hud/components/PlayerInfo/BuffIcons.tsx` | edit | Swap `Sparkles`, `Compass`, `ShieldCheck`, `Zap`, `Hammer`, `Forward`, `Ban` for `RegistryIcon` | implementer-b |
| `src/modules/hud/components/GameStatusBadge/GameStatusBadge.tsx` | edit | Swap `Hourglass`, `Timer` for `RegistryIcon` | implementer-b |
| `src/modules/hud/components/GameBoardHeader/GameBoardHeader.tsx` | edit | Swap `Loader2`, `ArrowLeft`, `Trophy`, `ImageIcon`, `Timer`, `Play` for `RegistryIcon`; keep `aria-hidden` on the `ImageIcon` call site | implementer-b |
| `src/modules/hud/components/ActionsPanel/ActionsPanel.tsx` | edit | Swap `XCircle` (x2), `Zap` for `RegistryIcon` | implementer-b |
| `src/modules/hud/components/ActionsPanel/MobileActionsBar.tsx` | edit | Swap `XCircle` (x2), `Zap` for `RegistryIcon` | implementer-b |
| `src/modules/hud/components/ActionsPanel/ActionButton.tsx` | edit | Swap `Shield`, `ShoppingCart`, `Zap`, `Album`, `University` (in `staticActionIconMap`) for `RegistryIcon` | implementer-b |
| `src/modules/hud/components/ActionsPanel/MobileSheetTriggers.tsx` | edit | Swap `ScrollText`, `ChevronUp` for `RegistryIcon`; keep `aria-hidden` on the `ScrollText` call site | implementer-b |
| `src/modules/hud/components/GameLog/GameLog.tsx` | edit | Swap `Trophy` and the `CATEGORY_ICONS` component map for `RegistryIcon`; keep `aria-hidden` on both icon call sites | implementer-b (sonnet) |
| `src/modules/hud/components/TutorialBeacon/TutorialBeacon.tsx` | edit | Swap `X` for `RegistryIcon` | implementer-b |
| `docs/architecture/systems-and-visuals.md` | edit | Append the HUD module and its registry ids to the sentence at line 185, matching the existing combat/cards sentences | docs-sync |

No test file needs a logic change: grep (this session) found no HUD test asserting lucide output structure (svg tag, lucide class names, or a `typeof Icon` check) — only `data-testid`, text content, and `className` substring matches on wrapper elements, all of which `RegistryIcon`'s wrapping `<span>` preserves at the same DOM position. tester-b re-runs the existing suites per phase and only adds a case if a swap exposes a gap.

## Contracts
Every call site keeps its existing `className` value unchanged. One prop is added to the existing `RegistryIconProps`:
```ts
// src/modules/shared/registry-icon.tsx
export interface RegistryIconProps {
  id: string;
  className?: string;
  alt?: string; // unused here: these are all decorative (no alt text in the current glyphs)
  'aria-hidden'?: boolean; // new: forwarded to the outer span, default unset
}

/** Renders any registry icon (image or lucide) with its resolved override and transform. */
export function RegistryIcon({ id, className, alt = '', 'aria-hidden': ariaHidden }: RegistryIconProps) {
  const { source, transform } = resolveIcon(id);
  return (
    <span
      className={cn('relative inline-flex items-center justify-center shrink-0', className)}
      aria-hidden={ariaHidden}
    >
      <span className="relative flex h-full w-full items-center justify-center" style={{ transform }}>
        <RegistryIconGlyph source={source} alt={alt} />
      </span>
    </span>
  );
}
```

`GameLog.tsx`'s new lookup table (replaces `CATEGORY_ICONS: Record<LogCategory, typeof Swords>`):
```ts
// src/modules/hud/components/GameLog/GameLog.tsx
const CATEGORY_ICON_IDS: Record<LogCategory, string> = {
  combat: 'swords',
  economy: 'coins',
  cards: 'layers',
  turn: 'clock',
  system: 'info',
};

function EntryIcon({ entry }: { entry: DisplayedLogEntry }) {
  if (entry.isMilestone) {
    return <RegistryIcon id="trophy" className={styles.milestoneIcon} aria-hidden />;
  }
  if (!entry.category) {
    return null;
  }
  return <RegistryIcon id={CATEGORY_ICON_IDS[entry.category]} className={styles.entryIcon} aria-hidden />;
}
```

Exact glyph -> registry id map (verified against `icon-registry.config.json`, every name present in `lucide-glyphs.ts`, 1:1, no ambiguity):

| lucide import | registry id |
|---|---|
| `Trophy` | `trophy` |
| `Album` | `album` |
| `Zap` | `zap` |
| `Forward` | `forward` |
| `Ban` | `ban` |
| `Compass` | `compass` |
| `ShieldCheck` | `shield-check` |
| `Sparkles` | `sparkles` |
| `Hammer` | `hammer` |
| `Timer` | `timer` |
| `Hourglass` | `hourglass` |
| `XCircle` | `x-circle` |
| `Shield` | `shield` |
| `ShoppingCart` | `shopping-cart` |
| `University` | `university` |
| `ChevronUp` | `chevron-up` |
| `ScrollText` | `scroll-text` |
| `ArrowLeft` | `arrow-left` |
| `Play` | `play` |
| `Loader2` | `loader-2` |
| `ImageIcon` | `image-icon` |
| `Clock` | `clock` |
| `Coins` | `coins` |
| `Info` | `info` |
| `Layers` | `layers` |
| `Swords` | `swords` |
| `X` | `x` |

Exact call sites, by file (every line verified this session; swap `<Glyph className={X} />` -> `<RegistryIcon id="<id>" className={X} />` unless noted):

**`src/modules/hud/components/PlayerInfo/PlayerInfo.tsx`**
- `:8` `import { Trophy } from 'lucide-react';` -> delete; add `import { RegistryIcon } from '@/modules/shared';`
- `:86` `<Trophy className="h-3.5 w-3.5" />` -> `<RegistryIcon id="trophy" className="h-3.5 w-3.5" />`

**`src/modules/hud/components/PlayerInfo/PlayerInfoStats.tsx`**
- `:5` `import { ResourceIcon, FightIcon, toCollectorIdleSprite } from '@/modules/shared';` -> add `RegistryIcon` to this import
- `:6` `import { Album, Zap } from 'lucide-react';` -> delete
- `:69` `<Zap className={cn(styles.statIcon, 'text-yellow-400')} />` -> `<RegistryIcon id="zap" className={cn(styles.statIcon, 'text-yellow-400')} />`
- `:82` `<Album className={cn(styles.statIcon, 'text-purple-400')} />` -> `<RegistryIcon id="album" className={cn(styles.statIcon, 'text-purple-400')} />`

**`src/modules/hud/components/PlayerInfo/BuffIcons.tsx`**
- `:1` `import { Zap, Forward, Ban, Compass, ShieldCheck, Sparkles, Hammer } from 'lucide-react';` -> delete; add `import { RegistryIcon } from '@/modules/shared';`
- `:4` `collector: <Sparkles className="h-2.5 w-2.5 text-emerald-400" />,` -> `id="sparkles"`
- `:5` `explorer: <Compass className="h-2.5 w-2.5 text-cyan-400" />,` -> `id="compass"`
- `:6` `reinforce: <ShieldCheck className="h-2.5 w-2.5 text-blue-400" />,` -> `id="shield-check"`
- `:7` `efficient: <Zap className="h-2.5 w-2.5 text-amber-400" />,` -> `id="zap"`
- `:8` `builder: <Hammer className="h-2.5 w-2.5 text-orange-400" />,` -> `id="hammer"`
- `:9` `'extra-move': <Forward className="h-2.5 w-2.5 text-yellow-300" />,` -> `id="forward"`
- `:10` `sabotaged: <Ban className="h-2.5 w-2.5 text-red-400" />,` -> `id="ban"`

**`src/modules/hud/components/GameStatusBadge/GameStatusBadge.tsx`**
- `:3` `import { Timer, Hourglass } from 'lucide-react';` -> delete; add `import { RegistryIcon } from '@/modules/shared';`
- `:22` `<Hourglass className={styles.hourglassIcon} />` -> `id="hourglass"`
- `:31` `<Timer className={styles.countdownIcon({ isExpiring })} />` -> `id="timer"`

**`src/modules/hud/components/GameBoardHeader/GameBoardHeader.tsx`**
- `:3` `import { ArrowLeft, Play, Trophy, Loader2, Timer, ImageIcon } from 'lucide-react';` -> delete
- `:6` `import { ResourceIcon } from '@/modules/shared';` -> add `RegistryIcon`
- `:36` `{isExiting ? <Loader2 className={styles.exitButtonLoader} /> : <ArrowLeft className={styles.exitButtonArrow} />}` -> `{isExiting ? <RegistryIcon id="loader-2" className={styles.exitButtonLoader} /> : <RegistryIcon id="arrow-left" className={styles.exitButtonArrow} />}`
- `:41` `<Trophy className={styles.vpGoalIcon} />` -> `id="trophy"`
- `:59` `<ImageIcon className={styles.backgroundIcon} aria-hidden="true" />` -> `<RegistryIcon id="image-icon" className={styles.backgroundIcon} aria-hidden />`
- `:70` `<Timer className={styles.turnTimerIcon({ isExpiring: turnTimer.isExpiring })} />` -> `id="timer"`
- `:79` `<Play className={styles.startGameIcon} />` -> `id="play"`

**`src/modules/hud/components/ActionsPanel/ActionsPanel.tsx`**
- `:7` `import { XCircle, Zap } from 'lucide-react';` -> delete
- `:9` `import { useIsMobile } from '@/modules/shared';` -> add `RegistryIcon`
- `:54` `<XCircle className="mr-1 h-3.5 w-3.5" />` (Cancel button) -> `id="x-circle"`
- `:66` `<XCircle className="mr-1 h-3.5 w-3.5" />` (Deselect button) -> `id="x-circle"`
- `:97` `<Zap className="h-4 w-4 text-amber-400 shrink-0" />` -> `id="zap"`

**`src/modules/hud/components/ActionsPanel/MobileActionsBar.tsx`**
- `:5` `import { XCircle, Zap } from 'lucide-react';` -> delete; add `import { RegistryIcon } from '@/modules/shared';`
- `:58` `<XCircle className="mr-1 h-3.5 w-3.5" />` (Cancel) -> `id="x-circle"`
- `:70` `<XCircle className="mr-1 h-3.5 w-3.5" />` (Deselect) -> `id="x-circle"`
- `:76` `<Zap className="h-4 w-4 text-amber-400 shrink-0" />` -> `id="zap"`

**`src/modules/hud/components/ActionsPanel/ActionButton.tsx`**
- `:7` `import { Shield, ShoppingCart, Zap, Album, University } from 'lucide-react';` -> delete
- `:8` `import { FightIcon, toCollectorIdleSprite } from '@/modules/shared';` -> add `RegistryIcon`
- `:12-19` `staticActionIconMap`: `deploy: <Shield className="h-4 w-4" />` -> `id="shield"`; `upgrade: <Zap className="h-4 w-4" />` -> `id="zap"`; `'buy-card': <ShoppingCart className="h-4 w-4" />` -> `id="shopping-cart"`; `'show-cards': <Album className="h-4 w-4" />` -> `id="album"`; `'abilities-shop': <University className="h-4 w-4" />` -> `id="university"`. `attack: <FightIcon className="h-4 w-4" />` is untouched (already a `RegistryIcon`-based component).

**`src/modules/hud/components/ActionsPanel/MobileSheetTriggers.tsx`**
- `:3` `import { ChevronUp, ScrollText } from 'lucide-react';` -> delete; add `import { RegistryIcon } from '@/modules/shared';`
- `:32` `<ScrollText className={styles.logButtonIcon} aria-hidden="true" />` -> `<RegistryIcon id="scroll-text" className={styles.logButtonIcon} aria-hidden />`
- `:44` `<ChevronUp className="h-3.5 w-3.5" />` -> `id="chevron-up"`

**`src/modules/hud/components/GameLog/GameLog.tsx`** (sonnet: structural change, see Decisions and Contracts above)
- `:3` `import { Clock, Coins, Info, Layers, Swords, Trophy } from 'lucide-react';` -> delete; add `import { RegistryIcon } from '@/modules/shared';`
- `:17-23` `CATEGORY_ICONS: Record<LogCategory, typeof Swords>` -> `CATEGORY_ICON_IDS: Record<LogCategory, string>` per the Contracts block
- `:26-35` `EntryIcon` -> rewritten per the Contracts block (`aria-hidden` kept at both returns, forwarded through the new `RegistryIconProps` prop)

**`src/modules/hud/components/TutorialBeacon/TutorialBeacon.tsx`**
- `:6` `import { X } from 'lucide-react';` -> delete
- `:7` `import { InfoIcon } from '@/modules/shared';` -> `import { InfoIcon, RegistryIcon } from '@/modules/shared';`
- `:65` `<X className="h-4 w-4" />` -> `id="x"`

## Phases
### Phase 1: PlayerInfo, PlayerInfoStats, BuffIcons, GameStatusBadge, GameBoardHeader
1. Add `aria-hidden?: boolean` to `RegistryIconProps` in `src/modules/shared/registry-icon.tsx`, forwarded to the outer `<span>`, per the Contracts block; add the two `registry-icon.test.tsx` cases listed in the File plan. (implementer-b)
2. Swap all glyphs in `PlayerInfo.tsx`, `PlayerInfoStats.tsx`, `BuffIcons.tsx`, `GameStatusBadge.tsx`, `GameBoardHeader.tsx` per the Contracts call-site list, keeping `aria-hidden` on `GameBoardHeader.tsx:59`. (implementer-b)
3. Run and, if a swap exposes a gap, extend the existing tests: `PlayerInfo.test.tsx`, `GameStatusBadge.test.tsx`, `GameBoardHeader.test.tsx`. No new test files expected beyond `registry-icon.test.tsx` (tester-b)
4. docs-sync: append PlayerInfo/BuffIcons/GameStatusBadge/GameBoardHeader's registry ids to the HUD sentence at `docs/architecture/systems-and-visuals.md:185` (new sentence, same form as the existing combat/cards ones).
5. Checks: `npm run typecheck`, `npm run lint`, `npx jest src/modules/hud src/modules/shared/registry-icon.test.tsx`.
6. UI check: `npm run dev`, HUD testbed preview(s) for `PlayerInfo`, `GameStatusBadge`, `GameBoardHeader` — confirm no visual change (`ui-verify`).

Model escalation: none in phase 1 — the `RegistryIconProps` addition and every HUD file are 1:1, non-structural changes.

### Phase 2: ActionsPanel, MobileActionsBar, ActionButton, MobileSheetTriggers, GameLog, TutorialBeacon
1. Swap all glyphs in `ActionsPanel.tsx`, `MobileActionsBar.tsx`, `ActionButton.tsx`, `MobileSheetTriggers.tsx`, `TutorialBeacon.tsx` per the Contracts call-site list, keeping `aria-hidden` on `MobileSheetTriggers.tsx:32`. (implementer-b)
2. Rewrite `GameLog.tsx`'s `CATEGORY_ICONS` map and `EntryIcon` per the Contracts block, keeping `aria-hidden` on both `EntryIcon` returns. (implementer-b, sonnet)
3. Run and, if a swap exposes a gap, extend the existing tests: `ActionsPanel.test.tsx`, `MobileActionsBar.test.tsx`, `MobileActionsSheet.test.tsx`, `MobileEventLogSheet.test.tsx`, `GameLog.test.tsx`. No new test files expected (tester-b)
4. docs-sync: extend the same sentence at `docs/architecture/systems-and-visuals.md:185` with ActionsPanel/MobileActionsBar/ActionButton/MobileSheetTriggers/GameLog/TutorialBeacon's registry ids.
5. Checks: `npm run typecheck`, `npm run lint`, `npx jest src/modules/hud`.
6. UI check: `npm run dev`, HUD testbed preview(s) for `ActionsPanel` (desktop + mobile), `GameLog`, `TutorialBeacon` — confirm no visual change (`ui-verify`).

Model escalation: step 2 (`GameLog.tsx`) needs sonnet — it is the one structural rewrite, not a line swap.

## Test plan
- tester-b (view, no new logic in this task): re-run the existing suites per phase file list above; add an assertion only if a swap changes observable output (e.g. if `GameLog.test.tsx` does not currently cover the milestone vs. category icon branches, add a case asserting the right icon renders for a milestone entry and for each `LogCategory`). No `.map.ts`/`.hook.ts`/`.service.ts` changed, so no tester-a cases.
- e2e: none — no user-facing behavior changes (triage.md: "default overrides are empty, so output is unchanged").

## Preview states
No new components, no new props. Existing previews for `PlayerInfo`, `GameStatusBadge`, `GameBoardHeader`, `ActionsPanel` (desktop/mobile), `GameLog`, `TutorialBeacon` are reused for the `ui-verify` check in each phase; none need a new state.

## Risks
- `GameLog.tsx`'s rewrite touches a type (`Record<LogCategory, typeof Swords>` -> `Record<LogCategory, string>`); a typo in a registry id string will not be caught until `resolveIcon` throws at render (`resolve-icon.ts` "throws only for an id absent from the registry" per `docs/architecture/systems-and-visuals.md:185`) — tester-b's test run and the `ui-verify` check both exercise every `LogCategory` and the milestone branch, which should catch it.

## Review (architect-b)
VERDICT: APPROVED

1. **Resolved — finding 1 (aria-hidden drop).** Plan now adds `'aria-hidden'?: boolean` to `RegistryIconProps` (`Contracts`, matches the file plan's `src/modules/shared/registry-icon.tsx` entry), forwarded to the outer `<span>` as `aria-hidden={ariaHidden}` (Contracts code block) — confirmed this is syntactically valid: a quoted hyphenated key in a TS interface and destructuring `'aria-hidden': ariaHidden` are both legal, and an `undefined` value omits the DOM attribute, so every other `RegistryIcon` call site is unaffected. The 4 call sites (`GameBoardHeader.tsx:59`, `GameLog.tsx:28,34`, `MobileSheetTriggers.tsx:32`) now keep `aria-hidden` through the swap (File plan rows, call-site list, Contracts' `EntryIcon`, phase 1/2 steps). Acceptance criterion at line 9 updated to require it explicitly. The Risks bullet about the regression and the "accept the regression" rejected-alternative are gone, replaced with an accurate rejected-alternatives note in Decisions. `registry-icon.tsx` and `registry-icon.test.tsx` are correctly filed under phase 1 (the phase that needs them first, `GameBoardHeader.tsx`), owned by implementer-b, with two new test cases scoped (forwarded / absent-when-omitted) — appropriately minimal, no scope creep into the rest of `RegistryIcon`'s behavior. Verified `registry-icon.test.tsx` exists today (so File plan's "edit" is correct, not "new").
2. Findings 2–4 from the prior review (GameLog rewrite, phase split, glyph/call-site accuracy) are unchanged by this revision and remain verified correct.

No further issues found in this revision. Plan is approved for build.
