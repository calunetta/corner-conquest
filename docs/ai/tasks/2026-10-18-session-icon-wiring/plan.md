# Plan: Session dialogs and legacy leftovers icons through the registry

Status: APPROVED
Inputs: none (triage-free; task given directly, roadmap item 7)

## Goal and acceptance criteria
- [ ] Every lucide-react glyph in these 8 files renders through `RegistryIcon`, so an override for that registry id changes it:
  `HostLeaveDialog.tsx`, `VictoryDialog.tsx`, `ConfirmExitDialog.tsx`, `LinkGoogleAccountButton.tsx`, `Login.tsx` (all `src/modules/session/components/*`), `ConnectionWarningDialog.tsx` (`src/modules/game-board/components/*`), `GameBoard.tsx`, `PlayerInfoBar.tsx` (both `src/features/game/components/*`).
- [ ] No new registry entries, no new `lucide-glyphs.ts` entries (all 10 ids already present).
- [ ] Existing `className` values on every glyph are preserved exactly, moved onto `RegistryIcon`'s `className`.
- [ ] `PlayerInfoBar.tsx`'s two size-less `<ChevronUp />`/`<ChevronDown />` get an explicit `h-6 w-6` className (see Decisions) so they don't collapse to 0px under `RegistryIcon`.
- [ ] `npm run typecheck`, `npm run lint` (module files only — `src/features/**` is in `LEGACY_PATHS`, not linted), `npm test` pass.
- [ ] No visible change in the browser (default overrides are empty) — verify `HostLeaveDialog`, `ConfirmExitDialog`, `VictoryDialog`, `Login`, `LinkGoogleAccountButton`, `ConnectionWarningDialog` previews, and `GameBoard`/`PlayerInfoBar` in a live match, with `ui-verify`.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `RegistryIcon` | `src/modules/shared/registry-icon.tsx:17`, exported `src/modules/shared/index.ts:11` | Props: `id: string; className?: string; alt?: string; 'aria-hidden'?: boolean` (`registry-icon.tsx:6-13`). Wrapper `<span>` carries `className`; the glyph itself is always `className="h-full w-full"` (`registry-icon.tsx:45-47`), so every existing size class must move onto `RegistryIcon`'s own `className`, and a glyph with **no** className today needs one added (see Decisions). |
| `getLucideGlyph` | `src/modules/icons/lucide-glyphs.ts:106` | All 10 glyphs below already registered: `AlertTriangle, LogOut, Loader2, Trophy, Swords, Compass, RefreshCw, WifiOff, ChevronDown, ChevronUp`. No glyph-map edit. |
| icon-registry.config.json ids | `src/modules/icons/icon-registry.config.json` (grep-verified per id) | `AlertTriangle→alert-triangle` (module "session"), `LogOut→log-out` (module "session"), `Loader2→loader-2` (module "legacy"), `Trophy→trophy` (module "legacy"), `Swords→swords` (module "combat"), `Compass→compass` (module "hud"), `RefreshCw→refresh-cw` (module "game-board"), `WifiOff→wifi-off` (module "game-board"), `ChevronDown→chevron-down` (module "legacy"), `ChevronUp→chevron-up` (module "legacy"). The `module` field is cosmetic grouping only, not an import boundary — confirmed no lint rule reads it. |
| lucide-react jest mock | `jest.setup.js:19-30` | Global `jest.mock('lucide-react', ...)` stamps `data-testid="lucide-icon-${name.toLowerCase()}"` on every export access. `getLucideGlyph` still imports from `lucide-react`, so `RegistryIcon` renders the same test id under test. |
| `ConnectionWarningDialog.test.tsx` icon assertions | `src/modules/game-board/components/ConnectionWarningDialog/ConnectionWarningDialog.test.tsx:53,61,79` | `getByTestId('lucide-icon-wifioff')`, `within(button).getByTestId('lucide-icon-refreshcw')`, `within(button).getByTestId('lucide-icon-loader2')`. Pass unchanged (same mock pass-through as the lobby precedent, `docs/ai/tasks/2026-10-18-lobby-icon-wiring/plan.md`). |
| `HostLeaveDialog.test.tsx`, `VictoryDialog.test.tsx`, `ConfirmExitDialog.test.tsx`, `LinkGoogleAccountButton.test.tsx`, `Login.test.tsx` | grep-verified | No `lucide-icon-*`, `svg`, or icon-structure assertions except `Login.test.tsx:91-93` (`button.querySelector('svg')` on the **Google** sign-in button, which uses `GoogleIcon`, not a lucide glyph — untouched by this task) and `LinkGoogleAccountButton.test.tsx:28` (a `describe` title mentioning "icon-only button", no icon query inside). All pass unchanged. |
| `GameBoard.test.tsx`, `PlayerInfoBar.test.tsx` | `find` confirmed neither file exists | No characterization test to run for these two legacy files; `src/features/**` is in `LEGACY_PATHS` (`eslint.config.mjs:13`) so lint does not check them, but typecheck and `npm test` (any test importing them indirectly) still must pass. |
| `styles.icon`/`styles.dismissIcon` are `cva(...)` functions | `ConnectionWarningDialog.styles.ts:5,24` | `styles.icon({ isExpiring })` and `styles.dismissIcon({ isPending })` already return plain strings; pass straight into `RegistryIcon`'s `className` exactly as they're passed into the lucide component today — no change to the call shape. |
| `RESTRICTED_IMPORTS.deepModuleImport` | `eslint.config.mjs:49-52` | Blocks `@/modules/*/*` (a deep path inside another module), not `@/modules/shared` itself (two segments) — matches the lobby precedent's `import { RegistryIcon } from '@/modules/shared';` in both `.tsx` files and legacy files. `src/features/**` is outside `MODULE_FILES` (`src/modules/**/*.{ts,tsx}`) so the rule doesn't even apply there. |
| git status | `git status --porcelain` (session) | None of the 8 target files have uncommitted changes. `src/features/game/components/GameDialogManager.tsx` is modified but out of scope and not touched by this task — no foreign hunk to edit around. |
| Pattern precedent | `src/modules/lobby/components/LobbyGameRow/LobbyGameRow.tsx:91,95,107,127`, `src/modules/combat/components/CombatDialog/CombatDialog.tsx:51,97,104,117,122` | `<RegistryIcon id="trophy" className={styles.trophyIcon} />` — same idiom to follow, including passing a cva-returned string straight through. |

## Root cause (bugs only)
Not a bug.

## Decisions
- `PlayerInfoBar.tsx:50`'s `{isPlayerInfoOpen ? <ChevronUp /> : <ChevronDown />}` has no `className` today; lucide's default SVG renders at a fixed 24×24px regardless of parent size. `RegistryIcon`'s glyph is always `h-full w-full` of its wrapper span, and that wrapper has no intrinsic size unless given one — rendering it bare would collapse the icon to 0px. Fix: give both calls `className="h-6 w-6"` (Tailwind `h-6 w-6` = 24px = lucide's default), so the rendered size is pixel-identical. Rejected: leaving `className` unset (silently shrinks the icon to nothing, a real visual regression, not a no-op).
- No other glyph in scope is used in a non-icon role; all 10 are decorative/semantic glyphs inside dialogs, buttons or a status row. No design decision needed beyond the one above.
- Reuse `RegistryIcon` exactly as the combat/cards/lobby tasks did; no new component, no new prop. Rejected: a session-specific icon wrapper (would duplicate `RegistryIcon` for no second behavior, against KISS/DRY).

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/session/components/HostLeaveDialog/HostLeaveDialog.tsx` | edit | Swap 2 lucide glyph usages (`AlertTriangle`, `LogOut`) for `RegistryIcon` | implementer-b |
| `src/modules/session/components/VictoryDialog/VictoryDialog.tsx` | edit | Swap 3 lucide glyph usages (`Trophy`, `Loader2`, `LogOut`) for `RegistryIcon` | implementer-b |
| `src/modules/session/components/ConfirmExitDialog/ConfirmExitDialog.tsx` | edit | Swap 2 lucide glyph usages (`AlertTriangle`, `LogOut`) for `RegistryIcon` | implementer-b |
| `src/modules/session/components/LinkGoogleAccountButton/LinkGoogleAccountButton.tsx` | edit | Swap 2 lucide glyph usages (`Loader2` ×2) for `RegistryIcon` | implementer-b |
| `src/modules/session/components/Login/Login.tsx` | edit | Swap 4 lucide glyph usages (`Compass`, `Loader2` ×2, `Swords`) for `RegistryIcon` | implementer-b |
| `src/modules/game-board/components/ConnectionWarningDialog/ConnectionWarningDialog.tsx` | edit | Swap 3 lucide glyph usages (`WifiOff`, `Loader2`, `RefreshCw`), preserving the `cva`-returned className calls | implementer-b |
| `src/features/game/components/GameBoard.tsx` | edit | Minimal wiring: swap 1 lucide glyph usage (`Loader2`) for `RegistryIcon`; legacy file, change only the import and the one JSX line | implementer-b |
| `src/features/game/components/PlayerInfoBar.tsx` | edit | Minimal wiring: swap 4 lucide glyph usages (`Trophy` ×2, `ChevronUp`, `ChevronDown`) for `RegistryIcon`, adding `h-6 w-6` to the two chevrons per Decisions; legacy file, change only the import and the 4 JSX lines | implementer-b |

No test file needs edits: none of the 8 files' test suites assert lucide-specific structure beyond the `ConnectionWarningDialog.test.tsx` test ids listed in Verified context, which pass unchanged through `RegistryIcon` → `getLucideGlyph` → the same mocked lucide component. No other file in the repo imports a lucide-specific export from any of these 8 files (grep-verified: none of them export a glyph or a type derived from one).

## Contracts
No new types, props, hooks or services. `RegistryIcon` (`src/modules/shared/registry-icon.tsx:6-14`) is the only contract in play, already public via `@/modules/shared`:
```ts
export interface RegistryIconProps {
  id: string;
  className?: string;
  alt?: string;
  'aria-hidden'?: boolean;
}
```
Every edit in this task is `<Glyph className={X} .../>` → `<RegistryIcon id="<registry-id>" className={X} .../>`, preserving any other prop (e.g. `aria-hidden`) verbatim.

## Phases
### Phase 1: Swap session-dialog and legacy lucide glyphs for RegistryIcon
1. `HostLeaveDialog.tsx`: replace `import { AlertTriangle, LogOut } from 'lucide-react';` (line 3) with `import { RegistryIcon } from '@/modules/shared';`. Line 26 `<AlertTriangle className={styles.icon} />` → `<RegistryIcon id="alert-triangle" className={styles.icon} />`. Line 39 `<LogOut className={styles.confirmIcon} />` → `<RegistryIcon id="log-out" className={styles.confirmIcon} />`. (implementer-b)
2. `ConfirmExitDialog.tsx`: replace `import { AlertTriangle, LogOut } from 'lucide-react';` (line 3) with `import { RegistryIcon } from '@/modules/shared';`. Line 23 `<AlertTriangle className={styles.icon} />` → `<RegistryIcon id="alert-triangle" className={styles.icon} />`. Line 38 `<LogOut className={styles.leaveIcon} />` → `<RegistryIcon id="log-out" className={styles.leaveIcon} />`. (implementer-b)
3. `VictoryDialog.tsx`: replace `import { Loader2, LogOut, Trophy } from 'lucide-react';` (line 5) with `import { RegistryIcon } from '@/modules/shared';`. Line 39 `<Trophy className={styles.icon} />` → `<RegistryIcon id="trophy" className={styles.icon} />`. Line 78 `<Loader2 className={styles.loadingIcon} />` → `<RegistryIcon id="loader-2" className={styles.loadingIcon} />`. Line 83 `<LogOut className={styles.buttonIcon} />` → `<RegistryIcon id="log-out" className={styles.buttonIcon} />`. (implementer-b)
4. `LinkGoogleAccountButton.tsx`: replace `import { Loader2 } from 'lucide-react';` (line 3) with `import { RegistryIcon } from '@/modules/shared';`. Line 41 `<Loader2 className={styles.spinnerIcon} aria-hidden />` → `<RegistryIcon id="loader-2" className={styles.spinnerIcon} aria-hidden />`. Line 54 `<Loader2 className={styles.mobileSpinnerIcon} aria-hidden />` → `<RegistryIcon id="loader-2" className={styles.mobileSpinnerIcon} aria-hidden />`. (implementer-b)
5. `Login.tsx`: replace `import { Loader2, Swords, Compass } from 'lucide-react';` (line 3) with `import { RegistryIcon } from '@/modules/shared';`. Line 47 `<Compass className={styles.icon} />` → `<RegistryIcon id="compass" className={styles.icon} />`. Line 59 `<Loader2 className={styles.spinner} aria-hidden />` → `<RegistryIcon id="loader-2" className={styles.spinner} aria-hidden />`. Line 103 `<Loader2 className={styles.loadingIcon} />` → `<RegistryIcon id="loader-2" className={styles.loadingIcon} />`. Line 105 `<Swords className={styles.submitIcon} />` → `<RegistryIcon id="swords" className={styles.submitIcon} />`. (implementer-b)
6. `ConnectionWarningDialog.tsx`: replace `import { Loader2, RefreshCw, WifiOff } from 'lucide-react';` (line 3) with `import { RegistryIcon } from '@/modules/shared';`. Line 39 `<WifiOff className={styles.icon({ isExpiring })} />` → `<RegistryIcon id="wifi-off" className={styles.icon({ isExpiring })} />`. Line 50 `<Loader2 className={styles.dismissIcon({ isPending: true })} aria-hidden="true" />` → `<RegistryIcon id="loader-2" className={styles.dismissIcon({ isPending: true })} aria-hidden="true" />`. Line 52 `<RefreshCw className={styles.dismissIcon({ isPending: false })} aria-hidden="true" />` → `<RegistryIcon id="refresh-cw" className={styles.dismissIcon({ isPending: false })} aria-hidden="true" />`. (implementer-b)
7. `GameBoard.tsx`: replace `import { Loader2 } from 'lucide-react';` (line 4) with `import { RegistryIcon } from '@/modules/shared';`. Line 103 `<Loader2 className="h-16 w-16 animate-spin text-primary" />` → `<RegistryIcon id="loader-2" className="h-16 w-16 animate-spin text-primary" />`. Touch no other line in this legacy file. (implementer-b)
8. `PlayerInfoBar.tsx`: replace `import { ChevronDown, ChevronUp, Trophy } from 'lucide-react';` (line 4) with `import { RegistryIcon } from '@/modules/shared';`. Line 37 `<Trophy className="h-3 w-3 text-yellow-400" />` → `<RegistryIcon id="trophy" className="h-3 w-3 text-yellow-400" />`. Line 50 `{isPlayerInfoOpen ? <ChevronUp /> : <ChevronDown />}` → `{isPlayerInfoOpen ? <RegistryIcon id="chevron-up" className="h-6 w-6" /> : <RegistryIcon id="chevron-down" className="h-6 w-6" />}` (per Decisions). Line 94 `<Trophy className="h-3 w-3" />` → `<RegistryIcon id="trophy" className="h-3 w-3" />`. Touch no other line in this legacy file. (implementer-b)

Model escalation: none — mechanical glyph-for-glyph swaps, no new logic, no test rewrites.

## Test plan
- No new test files; no existing test needs a rewrite (grep-verified in Verified context — none of the 8 components' tests assert a lucide component reference or prop beyond the `ConnectionWarningDialog` test ids, which pass unchanged).
- Must still pass unmodified after the swap: `HostLeaveDialog.test.tsx`, `VictoryDialog.test.tsx`, `ConfirmExitDialog.test.tsx`, `LinkGoogleAccountButton.test.tsx`, `Login.test.tsx`, `ConnectionWarningDialog.test.tsx` (all 3 icon-testid assertions at lines 53, 61, 79).
- `GameBoard.tsx` and `PlayerInfoBar.tsx` have no test files (confirmed via `find`); `npm test` must still pass in full (no regression in any test that renders `GameBoard` transitively, e.g. through an e2e-adjacent unit test if one exists — none found).

## Preview states
- `HostLeaveDialog`, `ConfirmExitDialog`, `VictoryDialog`, `Login`, `LinkGoogleAccountButton`, `ConnectionWarningDialog` each have a `.preview.tsx` (confirmed present by `find`), and each imports the real component/view (`HostLeaveDialog`, `ConfirmExitDialog`, `VictoryDialog`, `LoginView`, `LinkGoogleAccountButtonView`, `ConnectionWarningDialogView` respectively) rather than duplicating its JSX — unlike `CreateGameDialog.preview.tsx` in the lobby task, none of these 6 previews need editing. Verify each with `ui-verify`: icon sizes, colors and animation (spinner `animate-spin`) are pixel-identical to before the swap, since default overrides are empty.
- No preview exists for `GameBoard.tsx` or `PlayerInfoBar.tsx` (legacy, no testbed entry); verify visually in a live or lobby-launched match: the full-screen loading spinner (`GameBoard.tsx:103`) and the player info bar's trophy/chevron icons (both the mobile collapsible header and the desktop sidebar).

## Risks
- `PlayerInfoBar.tsx`'s bare chevrons are the one spot in this task where `RegistryIcon`'s "always `h-full w-full`" glyph rule changes rendered size if the className isn't added — Decisions and step 8 cover the fix; `ui-verify` must specifically confirm the collapse/expand chevron is visible and correctly sized in the mobile header, not just present in the DOM.
- `src/features/**` is unlinted (`LEGACY_PATHS`), so `npm run lint` won't catch a mistake in `GameBoard.tsx`/`PlayerInfoBar.tsx`; `npm run typecheck` and a manual browser check are the only safety nets for those two files.
