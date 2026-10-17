# Plan: Lobby icons through the registry

Status: APPROVED
Inputs: triage.md

## Goal and acceptance criteria
- [ ] Every lucide-react glyph rendered by `src/modules/lobby/components/*` (Lobby, RejoinMatchPanel, LobbyGameRow, CreateGameDialog, CreateGameDialog.preview) renders through `RegistryIcon`, so an override for that registry id changes it.
- [ ] `CreateGameDialog.map.ts`'s `FormatOption.icon` is a registry id (`string`), not a `LucideIcon` component reference; `CreateGameDialog.types.ts` drops the `LucideIcon` import.
- [ ] `npm run typecheck`, `npm run lint`, `npm test` pass.
- [ ] No visible change in the browser (default overrides are empty).

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `RegistryIcon` | `src/modules/shared/registry-icon.tsx:17` exported via `src/modules/shared/index.ts:11` | Replacement component. Props: `id: string; className?: string; alt?: string; 'aria-hidden'?: boolean` (no `data-testid`). Resolves via `resolveIcon(id)` then `getLucideGlyph(name)` for `kind: 'lucide'` ids; the wrapper `<span>` carries `className`, the glyph itself is always `h-full w-full`, so the existing size classes (e.g. `h-4 w-4`) must move to `RegistryIcon`'s `className`. |
| `resolveIcon` | `src/modules/icons/resolve-icon.ts:38`, re-exported `src/modules/icons/index.ts` | Pure, synchronous — no hook, no Firestore. |
| `getLucideGlyph` | `src/modules/icons/lucide-glyphs.ts:106` | All 14 glyphs below are already registered here: `Compass, Loader2, Swords, Trophy, Shield, BookOpen, Sparkles, Power, Crown, Users, Info, Bot, HelpCircle, Settings`. No glyph map edit needed. |
| icon-registry.config.json ids | `src/modules/icons/icon-registry.config.json` (python-verified) | `Compass→compass, Loader2→loader-2, Swords→swords, Trophy→trophy, Shield→shield, BookOpen→book-open, Sparkles→sparkles, Power→power, Crown→crown, Users→users, Info→info, Bot→bot, HelpCircle→help-circle, Settings→settings`. |
| lucide-react jest mock | `jest.setup.js:19-30` | Global `jest.mock('lucide-react', ...)` returns `data-testid="lucide-icon-${name.toLowerCase()}"` for any export name. `getLucideGlyph` imports from `lucide-react`, so `RegistryIcon` still renders that same test id under test — no view-test rewrite needed for existing `lucide-icon-*` assertions. |
| `CreateGameDialog.map.test.ts` icon test | `src/modules/lobby/components/CreateGameDialog/CreateGameDialog.map.test.ts:43-60` | Asserts `typeof option.icon === 'function'` and 4 distinct function refs, with a comment deferring exact icon-to-value checks to the render test because the lucide mock returns a new function per property access. Once `icon` is a string id this ambiguity is gone; test must be rewritten to assert the exact id per format value. |
| `CreateGameDialog.test.tsx` icon test | `src/modules/lobby/components/CreateGameDialog/CreateGameDialog.test.tsx:206-224` | Asserts `lucide-icon-bot/swords/users/crown` inside each format card. Passes unchanged once `toFormatOptions()` returns those same lucide names via registry ids (verified above). |
| Pattern precedent | `src/modules/combat/components/MonsterCombatDialog/MonsterResultsScreen.tsx:31` etc. | `<RegistryIcon id="trophy" className="h-5 w-5" />` — same idiom to follow. |

## Root cause (bugs only)
Not a bug.

## Decisions
- Keep `FormatOption.icon` as a plain `string` (registry id), not a literal union, because the 4 values (`bot`, `swords`, `users`, `crown`) are only ever read by `CreateGameDialog.tsx`/`.preview.tsx` to build a `RegistryIcon`. Rejected: a `RegistryIconId` type alias (adds a layer with no second consumer, against KISS).
- Drop `CreateGameDialog.types.ts`'s `import type { LucideIcon } from 'lucide-react'` entirely because, after the map change, nothing in the module references the lucide type. Rejected: keeping it unused (fails lint's no-unused-vars/import rules).
- Drop `data-testid="reclaim-spinner"` from `RejoinMatchPanel.tsx`'s loader icon because `RegistryIconProps` has no `data-testid` slot and no test (`RejoinMatchPanel.test.tsx`, verified) reads it. Rejected: adding a `data-testid` prop to `RegistryIconProps` (would touch a shared component for one unused call site, out of scope per triage).
- Rewrite `CreateGameDialog.map.test.ts`'s icon test to assert exact ids (`['bot', 'swords', 'users', 'crown']`) and delete the now-obsolete comment about lucide-mock reference ambiguity, because a string id makes the exact assertion possible at the map layer instead of only at render time.

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/lobby/components/Lobby/Lobby.tsx` | edit | Swap 8 lucide glyph usages for `RegistryIcon` | implementer-b |
| `src/modules/lobby/components/RejoinMatchPanel/RejoinMatchPanel.tsx` | edit | Swap 2 lucide glyph usages for `RegistryIcon` | implementer-b |
| `src/modules/lobby/components/LobbyGameRow/LobbyGameRow.tsx` | edit | Swap 4 lucide glyph usages for `RegistryIcon` | implementer-b |
| `src/modules/lobby/components/CreateGameDialog/CreateGameDialog.tsx` | edit | Swap 5 lucide glyph usages (incl. the format-card icon map lookup) for `RegistryIcon` | implementer-b |
| `src/modules/lobby/components/CreateGameDialog/CreateGameDialog.preview.tsx` | edit | Same 5 swaps in the preview's standalone duplicate view | implementer-b |
| `src/modules/lobby/components/CreateGameDialog/CreateGameDialog.map.ts` | edit | `toFormatOptions()` returns registry ids instead of component refs | implementer-b |
| `src/modules/lobby/components/CreateGameDialog/CreateGameDialog.types.ts` | edit | `FormatOption.icon: string`; drop `LucideIcon` import | implementer-b |
| `src/modules/lobby/components/CreateGameDialog/CreateGameDialog.map.test.ts` | edit | Replace function-reference assertions with exact id assertions | implementer-b |

No other file in the repo imports anything from these files' lucide-specific exports (`FactionOption`/`FormatOption` are only consumed inside `CreateGameDialog/*`, grep-verified by the triage's 7-file count). `CreateGameDialog.test.tsx` and `RejoinMatchPanel.test.tsx` need no edits (see Verified context).

## Contracts
```ts
// src/modules/lobby/components/CreateGameDialog/CreateGameDialog.types.ts
// Before: `icon: LucideIcon;` and `import type { LucideIcon } from 'lucide-react';` (delete the import)
export type FormatOption = {
  value: number;
  title: string;
  meta: string;
  /** icon-registry.config.json id, e.g. "bot" — passed straight to <RegistryIcon id={...} />. */
  icon: string;
};
// FactionOption and CreateGameDialogProps/ViewModel are unchanged.

// src/modules/lobby/components/CreateGameDialog/CreateGameDialog.map.ts
// Before: `import { Bot, Crown, Swords, Users } from 'lucide-react';` (delete the import)
export function toFormatOptions(): FormatOption[] {
  return [
    { value: 1, title: 'Solo vs. Bot AI', meta: 'Training match', icon: 'bot' },
    { value: 2, title: '2 Players', meta: '1v1 Duel', icon: 'swords' },
    { value: 3, title: '3 Players', meta: 'Archipelago Skirmish', icon: 'users' },
    { value: 4, title: '4 Players', meta: 'Grand Conquest', icon: 'crown' },
  ];
}
// toFactionOptions() is unchanged.
```

## Phases
### Phase 1: Swap lobby lucide glyphs for RegistryIcon
1. `CreateGameDialog.types.ts`: delete `import type { LucideIcon } from 'lucide-react';`; change `FormatOption.icon` to `string` per Contracts. (implementer-b)
2. `CreateGameDialog.map.ts`: delete the lucide import; change the 4 `icon:` values to the id strings per Contracts. (implementer-b)
3. `CreateGameDialog.map.test.ts`: replace the `'has correct icon component reference for each entry'` test (lines 43-60) with one asserting `options.map((o) => o.icon)` equals `['bot', 'swords', 'users', 'crown']`; delete the lucide-mock-ambiguity comment. (implementer-b)
4. `CreateGameDialog.tsx`: replace the lucide import (line 10) with `import { RegistryIcon } from '@/modules/shared';`; replace each of the 5 usages:
   - line 27 `<Swords className="h-5 w-5" />` → `<RegistryIcon id="swords" className="h-5 w-5" />`
   - lines 47-54: delete `const Icon = opt.icon;`; replace `<Icon className={styles.formatIconSize} />` with `<RegistryIcon id={opt.icon} className={styles.formatIconSize} />`
   - line 86 `<HelpCircle className={styles.helpIcon} />` → `<RegistryIcon id="help-circle" className={styles.helpIcon} />`
   - line 102 `<Settings className="mr-1.5 h-3.5 w-3.5" />` → `<RegistryIcon id="settings" className="mr-1.5 h-3.5 w-3.5" />`
   - line 106 `<Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Shield className="mr-1.5 h-3.5 w-3.5" />` → `<RegistryIcon id="loader-2" className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RegistryIcon id="shield" className="mr-1.5 h-3.5 w-3.5" />`
   (implementer-b)
5. `CreateGameDialog.preview.tsx`: apply the identical 5 swaps at its own line numbers (import line 12; `<Swords>` line 33; `const Icon = opt.icon;` / `<Icon>` lines 53/60; `<HelpCircle>` line 92; `<Settings>` line 108; `<Loader2>`/`<Shield>` line 112). (implementer-b)
6. `Lobby.tsx`: replace the lucide import (line 7) with `import { RegistryIcon } from '@/modules/shared';`; replace each of the 8 usages, keeping every existing `className`:
   - line 24 `Compass` → `id="compass"`
   - line 30 `Sparkles` → `id="sparkles"`
   - line 45 `Power` → `id="power"`
   - line 67 `Loader2` → `id="loader-2"`
   - line 68 `Swords` → `id="swords"`
   - line 74 `BookOpen` → `id="book-open"`
   - line 79 `Trophy` → `id="trophy"`
   - line 83 `Shield` → `id="shield"`
   - line 87 `Sparkles` → `id="sparkles"`
   - line 106 `Loader2` → `id="loader-2"`
   - line 112 `Compass` → `id="compass"`
   (implementer-b)
7. `RejoinMatchPanel.tsx`: replace the lucide import (line 2) with `import { RegistryIcon } from '@/modules/shared';`; line 16 `<Loader2 className={styles.spinner} aria-hidden data-testid="reclaim-spinner" />` → `<RegistryIcon id="loader-2" className={styles.spinner} aria-hidden />` (drop `data-testid`, unused); line 18 `<Swords className={styles.icon} aria-hidden />` → `<RegistryIcon id="swords" className={styles.icon} aria-hidden />`. (implementer-b)
8. `LobbyGameRow.tsx`: replace the lucide import (line 10) with `import { RegistryIcon } from '@/modules/shared';`; line 91 `Crown` → `id="crown"`; line 95 `Users` → `id="users"`; line 107 `Info` → `id="info"`; line 127 `Loader2` → `id="loader-2"`. (implementer-b)

Model escalation: none — mechanical glyph-for-glyph swaps and a 2-case test rewrite, no new logic.

## Test plan
- implementer-b runs the existing suites unchanged except for the one rewrite in step 3; no new test files.
- `CreateGameDialog.map.test.ts`: `toFormatOptions()` returns ids `['bot', 'swords', 'users', 'crown']` in order (replaces the function-reference check).
- `CreateGameDialog.test.tsx`: `'renders the correct icon for each format card'` (lines 206-224) must still pass unmodified — confirms `RegistryIcon` round-trips through `getLucideGlyph` to the same `lucide-icon-*` test ids under the global mock.
- `RejoinMatchPanel.test.tsx`, `LobbyGameRow.test.tsx`, `Lobby.test.tsx`: no icon-structure assertions found (grep-verified); must still pass unmodified.

## Preview states
- `CreateGameDialog.preview.tsx`'s existing two states (`Multiplayer`, `Solo vs bot`) are unchanged in structure; verify visually with `ui-verify` that all format-card icons, the header sword, the help tooltip icon, the advanced-rules settings icon and the create-button spinner/shield still render identically (default overrides are empty, so pixels should be identical to before the swap).
- No new preview states required; no other lobby component has a `.preview.tsx` touched by this task.

## Risks
- `RegistryIconProps` has no `data-testid` — confirmed no test needs the one dropped (`reclaim-spinner`). If a future test is added expecting it, it must use a different query (e.g. role or the `Loader2` mock's own test id via `getLucideGlyph`'s pass-through), not re-add the prop.
- The preview file is a hand-duplicated copy of `CreateGameDialog.tsx`'s JSX (not an import of it); missing a swap there would leave a stale lucide icon invisible to lint/typecheck since `lucide-react` is still an installed dependency used elsewhere in the repo. Step 5 enumerates every one of its 5 usages explicitly to prevent that.

## Review (architect-b)
VERDICT: APPROVED

Re-verified every path, symbol, registry id and line number in this session.

1. `FormatOption.icon` as plain `string`, dropping the `LucideIcon` import — correct. `src/modules/lobby/components/CreateGameDialog/CreateGameDialog.types.ts:2,27` confirmed as the only use of `LucideIcon` in the module; no other file imports `FormatOption` (grep: only `CreateGameDialog.tsx`, `.preview.tsx`, `.map.ts`, `.map.test.ts` reference it). `RegistryIconProps.id` is `string` (`src/modules/shared/registry-icon.tsx:9`), matching the precedent at `src/modules/combat/components/MonsterCombatDialog/MonsterResultsScreen.tsx:31`. A literal union would add a layer with one consumer — correctly rejected per KISS.
2. Dropping `data-testid="reclaim-spinner"` — confirmed safe. `grep -rn "reclaim-spinner"` across the repo hits only `src/modules/lobby/components/RejoinMatchPanel/RejoinMatchPanel.tsx:16` (other hits are other agents' `.claude/worktrees/*` copies, irrelevant) and nothing in `e2e/`. Read `RejoinMatchPanel.test.tsx` in full: no test id, role, or text query touches the spinner icon. `RegistryIconProps` indeed has no `data-testid` slot (`registry-icon.tsx:6-13`).
3. `CreateGameDialog.map.test.ts` rewrite — current test (`CreateGameDialog.map.test.ts:43-60`) asserts `typeof option.icon === 'function'` and 4 distinct refs; this breaks once `icon` is a string, so the plan's replacement (exact id list `['bot','swords','users','crown']`, step 3) is required, not optional. Verified `CreateGameDialog.test.tsx:206-224` queries `data-testid="lucide-icon-bot/swords/users/crown"` and will still pass: `RegistryIcon` → `getLucideGlyph(source.name)` → `<Glyph className="h-full w-full" />` (`registry-icon.tsx:45-47`) renders through the global `jest.mock('lucide-react', ...)` Proxy (`jest.setup.js:19-29`), which stamps `data-testid` from the Lucide export name regardless of the `className` passed — mock spreads `{...props}` after setting the test id, so no collision. Registry ids confirmed present for all 14 glyphs in `icon-registry.config.json` and `src/modules/icons/lucide-glyphs.ts:67-106`.
4. `CreateGameDialog.preview.tsx` hand-duplicated JSX in scope — correct scope call. Read the file: every one of its 5 usages (import `:12`, `<Swords>` `:33`, `const Icon = opt.icon` / `<Icon>` `:53`/`:60`, `<HelpCircle>` `:92`, `<Settings>` `:108`, `<Loader2>`/`<Shield>` `:112`) matches the plan's line numbers exactly. It is not an import of `CreateGameDialog.tsx` (confirmed: separate `CreateGameDialogView` function, no shared import), so missing a swap there would silently keep a stale lucide glyph — correctly flagged as a risk and fully enumerated in the File plan and Phase steps, owned by the same agent.

Also independently re-checked every line reference in Phase 1 steps 4–8 against the live files (`CreateGameDialog.tsx`, `Lobby.tsx`, `RejoinMatchPanel.tsx`, `LobbyGameRow.tsx`): all match exactly, no drift. No file outside the module imports `FormatOption`/`FactionOption`/the lobby components' lucide-specific exports (grep-verified). No invented paths or registry ids found.
