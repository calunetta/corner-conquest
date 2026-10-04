# Plan: App entry points migration

Status: APPROVED
Inputs: triage.md

## Goal and acceptance criteria
- [ ] `src/components/icons.tsx` is deleted; `ResourceIcon`, `getResourceDisplayName`, `RESOURCE_SPRITES`, `FightIcon`, `InfoIcon` live in `src/modules/shared/` and all ~13 call sites import from `@/modules/shared`; `MonsterIcon`/`SettingsIcon` are deleted as dead code.
- [ ] `Login` is extracted from `src/app/page.tsx` into `src/modules/session/components/Login/`, split into connected `Login` and pure `LoginView` per the component-architecture skill.
- [ ] `src/app/page.tsx` is a thin router (`Home`) rendering `<Login />`, `<Lobby />` or `<GameBoard />`; `src/app/layout.tsx` is unchanged except removal from `LEGACY_PATHS`.
- [ ] `src/components/icons.tsx`, `src/app/page.tsx`, `src/app/layout.tsx` are removed from `LEGACY_PATHS` in `eslint.config.mjs:13-15,17-18`.
- [ ] `npm run typecheck`, `npm run lint`, `npm test` pass. All 4 e2e specs that locate `input#username[data-hydrated="true"]` and the "Enter Lobby" / "Username Taken" text (`e2e/auth-and-lobby.spec.ts:15,21`, `e2e/gameplay.spec.ts:14`, `e2e/map-viewport.spec.ts:14,93`, `e2e/tutorial-beacons.spec.ts:13`) keep passing — markup, ids, text and classes must be byte-for-byte preserved.
- [ ] `docs/ai/refactor.md` row #11 updated to `done` with commit hash(es) (architect-b, final review).

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `Login`, `Home` | `src/app/page.tsx:14-110`, `:112-135` | Two components in one file; `Login` moves out, `Home` stays (Next.js route file). |
| `usePlayer` | `src/modules/session/player.provider.tsx` (exported `src/modules/session/index.ts:3`) | `Login` and `Home` both call it; already migrated (row #10). |
| `Lobby`, `LobbyBackground` | `src/modules/lobby/index.ts:1-2` | `Home` renders `Lobby`; `Login` renders `LobbyBackground`. Already migrated (row #9). |
| `GameBoard` | `@/features/game/components/GameBoard` (`src/app/page.tsx:4`) | Legacy, frozen at its path per row #6's Decisions. `page.tsx` keeps importing it; `page.tsx` is not under `src/modules/**` so the `legacyUi` ESLint restriction (scoped to `MODULE_FILES`, `eslint.config.mjs:74-84`) does not apply to it. |
| `RootLayout` | `src/app/layout.tsx:20-42` | Font + provider shell. No business logic, no `any`/`console`, already uses `import type { Metadata }` (`:1`). Needs no code change, only delisting. |
| `ResourceIcon`, `RESOURCE_DISPLAY_NAMES`, `getResourceDisplayName`, `RESOURCE_SPRITES`, `RESOURCE_ICONS` | `src/components/icons.tsx:7-45` | `RESOURCE_DISPLAY_NAMES` and `RESOURCE_ICONS` are private (no external importer — confirmed via `grep -rn "RESOURCE_DISPLAY_NAMES\|RESOURCE_ICONS" src`). `RESOURCE_SPRITES`/`getResourceDisplayName` are pure data/fn, imported by `.map.ts` files; `ResourceIcon` is a view. |
| `FightIcon` | `src/components/icons.tsx:47-60` | Used in `combat` and `hud` — genuinely cross-domain. |
| `InfoIcon` | `src/components/icons.tsx:62-75` | Single current consumer (`hud/TutorialBeacon`) but kept with the rest of the `icons.tsx` split for one consistent decision (see Decisions). |
| `SettingsIcon`, `MonsterIcon` | `src/components/icons.tsx:77-109` | Zero importers outside `icons.tsx` itself — confirmed via `grep -rn "MonsterIcon\|SettingsIcon" src e2e` (only hits are the definitions; `IslandTile.tsx:20`'s `renderMonsterIcons` is an unrelated local function, not an import of this file). Dead code — delete. |
| 13 call sites of `@/components/icons` | see File plan | Only the import path changes; names are unchanged. |
| `src/modules/shared/index.ts`, `player-sprite.ts` | `src/modules/shared/index.ts:1-3`, `player-sprite.ts:1-13` | Existing flat, no-single-owner pattern this follows: one file per concern + colocated test, re-exported from the barrel. |
| `ConfirmExitDialog` pattern | `src/modules/session/components/ConfirmExitDialog/{ConfirmExitDialog.tsx,.types.ts,.styles.ts}` | Pure-view component folder pattern `Login`'s view half follows. |
| `LEGACY_PATHS` | `eslint.config.mjs:13-15,17-18` | Entries to remove: `'src/components/icons.tsx'`, `'src/app/page.tsx'`, `'src/app/layout.tsx'`. |
| `MODULE_FILES`, `RESTRICTED_IMPORTS` | `eslint.config.mjs:37,42-52` | Import-boundary rules are scoped to `src/modules/**`; confirms `page.tsx`/`layout.tsx` are unaffected by `legacyUi`/`deepModuleImport` once delisted. |
| e2e selectors | `e2e/auth-and-lobby.spec.ts:15,21`, `e2e/gameplay.spec.ts:14`, `e2e/map-viewport.spec.ts:14,93`, `e2e/tutorial-beacons.spec.ts:13` | All locate `input#username[data-hydrated="true"]`; `auth-and-lobby.spec.ts:21` clicks "Enter Lobby". These specs are themselves frozen in `LEGACY_PATHS` (`:19-22`) — not edited, but the markup they target must not change. |
| Visual Parity Rule | `docs/README.md:50` | References `src/app/page.tsx` as "the Login page" — update the path note once `Login` moves (see File plan). |

## Decisions
- `ResourceIcon`, `FightIcon`, `InfoIcon` all move into `src/modules/shared/`, not split per-domain, because `icons.tsx` as a whole has no single owning domain (triage) and a single consistent rule (shared vs domain) is simpler to verify than judging each icon's current consumer count. Rejected: moving `InfoIcon` into `src/modules/hud` since it has one consumer today — rejected because it creates two different relocation rules for siblings that were one file, for a distinction (1 vs 2 consumers) that can flip with the next feature.
- Split `icons.tsx`'s resource exports into a pure-data file (`resource-display.ts`: `getResourceDisplayName`, `RESOURCE_SPRITES`) and a view file (`resource-icon.tsx`: `ResourceIcon`), because `.map.ts` call sites only need the data/fn today and a view file pulls in `next/image`/React for consumers that don't need it. Rejected: one combined `resource-icon.tsx` file (simpler file count, but mixes a view export into files that only ever use the data half).
- `RESOURCE_DISPLAY_NAMES` and the png-path lookup (private `RESOURCE_ICONS`) are not re-exported from `src/modules/shared/index.ts` — confirmed zero external importers of `RESOURCE_DISPLAY_NAMES`; `RESOURCE_ICONS` was already private. Smaller public surface, no behavior change.
- `MonsterIcon`/`SettingsIcon` are deleted, not migrated — confirmed dead (triage + this plan's grep). Same treatment as `use-mobile.ts` in row #10.
- `Login` is extracted into `src/modules/session/components/Login/`, not a new module, because it only talks to `usePlayer` (same module) and renders `LobbyBackground` (already a public cross-module import). Rejected: a new `auth`/`login` module (unnecessary module for one component with no other members).
- `Login` splits into `LoginView` (pure) and `Login` (`<LoginView {...useLogin()} />`) per component-architecture's connected-component rule, because its hook reads player session state. `Login.hook.ts`'s `usePlayer` import is a relative, intra-module import (`../../player.provider`), not a cross-module import — no `legacyUi`/`deepModuleImport` violation.
- Drop the unused `playerId` destructured from `usePlayer()` in the original `Login` (`src/app/page.tsx:18`, never read in that function). It is dead in the legacy file (silently permitted — `page.tsx` is in `LEGACY_PATHS`, unlinted) but would fail `no-unused-vars` once moved into `src/modules`. Dropping an unused local binding during a move is allowed by the migration guide ("dropping dead imports"); same principle, applied to a dead variable.
- No `.preview.tsx` for `Login` or the icon components: triage's pipeline for this task has no `preview-a`/`preview-b` ("no visual state changes" — pure relocation, markup unchanged). `tester-b` verifies the rendered result directly at `http://localhost:9002` (logged-out state shows `Login`) with the `ui-verify` skill instead of a testbed preview.
- `docs/README.md:50`'s Visual Parity Rule note is updated to point at `src/modules/session/components/Login/Login.tsx` in addition to `src/app/page.tsx` (implementer-b, same phase as the extraction) — behavior/location changed, CLAUDE.md principle 6.

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/shared/resource-display.ts` | new | `getResourceDisplayName`, `RESOURCE_SPRITES` — pure data/fn, moved verbatim from `icons.tsx:7-21` | implementer-a |
| `src/modules/shared/resource-display.test.ts` | new | `getResourceDisplayName` per `ResourceType`; `RESOURCE_SPRITES` values | tester-a |
| `src/modules/shared/resource-icon.tsx` | new | `ResourceIcon` view, moved verbatim from `icons.tsx:23-45` | implementer-b |
| `src/modules/shared/resource-icon.test.tsx` | new | renders correct `src`/`alt` per type; returns `null` for unmapped type | tester-b |
| `src/modules/shared/fight-icon.tsx` | new | `FightIcon`, moved verbatim from `icons.tsx:47-60` | implementer-b |
| `src/modules/shared/fight-icon.test.tsx` | new | renders `/sprites/icon_fight.png`, alt `Fight` | tester-b |
| `src/modules/shared/info-icon.tsx` | new | `InfoIcon`, moved verbatim from `icons.tsx:62-75` | implementer-b |
| `src/modules/shared/info-icon.test.tsx` | new | renders `/sprites/icon_info.png`, alt `Info` | tester-b |
| `src/modules/shared/index.ts` | edit | add `export { getResourceDisplayName, RESOURCE_SPRITES } from './resource-display';`, `export { ResourceIcon } from './resource-icon';`, `export { FightIcon } from './fight-icon';`, `export { InfoIcon } from './info-icon';` | implementer-a |
| `src/components/icons.tsx` | delete | superseded by the 4 files above; `MonsterIcon`/`SettingsIcon` dropped as dead code | implementer-b |
| `src/modules/combat/components/PositionDialog/PositionDialog.map.ts:2` | edit | import path `@/components/icons` → `@/modules/shared` | implementer-a |
| `src/modules/cards/components/WealthyDialog/WealthyDialog.map.ts:2` | edit | same | implementer-a |
| `src/modules/cards/components/ProductiveCardDialog/ProductiveCardDialog.map.ts:2` | edit | same | implementer-a |
| `src/modules/cards/components/StealResourceDialog/StealResourceDialog.map.ts:2` | edit | same | implementer-a |
| `src/modules/combat/components/PositionDialog/PositionDialog.tsx:14` | edit | import path only | implementer-b |
| `src/modules/combat/components/CombatDialog/CombatDialog.tsx:15` | edit | import path only | implementer-b |
| `src/modules/combat/components/ArmySelectionDialog/ArmySelectionDialog.tsx:16` | edit | import path only | implementer-b |
| `src/modules/cards/components/WealthyDialog/WealthyDialog.tsx:13` | edit | import path only | implementer-b |
| `src/modules/cards/components/ProductiveCardDialog/ProductiveCardDialog.tsx:13` | edit | import path only | implementer-b |
| `src/modules/cards/components/AbilitiesDialog/AbilitiesDialog.tsx:15` | edit | import path only | implementer-b |
| `src/modules/cards/components/StealResourceDialog/ResourceSelectionStep.tsx:6` | edit | import path only | implementer-b |
| `src/modules/hud/components/PlayerInfo/PlayerInfoStats.tsx:4` | edit | import path only | implementer-b |
| `src/modules/hud/components/ActionsPanel/ActionButton.tsx:7` | edit | import path only | implementer-b |
| `src/modules/hud/components/TutorialBeacon/TutorialBeacon.tsx:7` | edit | import path only | implementer-b |
| `src/modules/session/components/Login/Login.types.ts` | new | `LoginViewProps` | implementer-a |
| `src/modules/session/components/Login/Login.hook.ts` | new | `useLogin()`: state, `usePlayer()` call, `handleLogin`, handlers | implementer-a |
| `src/modules/session/components/Login/Login.hook.test.ts` | new | see Test plan | tester-a |
| `src/modules/session/components/Login/Login.styles.ts` | new | every Tailwind class from `page.tsx:44-107`, moved verbatim | implementer-b |
| `src/modules/session/components/Login/Login.tsx` | new | `LoginView(props)` pure + `Login()` = `<LoginView {...useLogin()} />`, moved verbatim from `page.tsx:42-109` | implementer-b |
| `src/modules/session/components/Login/Login.test.tsx` | new | see Test plan | tester-b |
| `src/modules/session/components/Login/index.ts` | new | `export { Login } from './Login';` | implementer-a |
| `src/modules/session/index.ts` | edit | add `export { Login } from './components/Login';` | implementer-a |
| `src/app/page.tsx` | edit | drop `Login` (now imported from `@/modules/session`); `Home` keeps routing only | implementer-b |
| `src/app/layout.tsx` | no code change | delisted only (see eslint row) | — |
| `eslint.config.mjs:13-15` | edit | remove `'src/components/icons.tsx'` from `LEGACY_PATHS` | implementer-b (phase 1) |
| `eslint.config.mjs:17-18` | edit | remove `'src/app/page.tsx'`, `'src/app/layout.tsx'` from `LEGACY_PATHS` | implementer-b (phase 2) |
| `docs/README.md:50` | edit | Visual Parity Rule note: add `Login`'s new path | implementer-b (phase 2) |
| `docs/ai/refactor.md:40` | edit | row #11 → `done` (commit hash) | architect-b (final review) |
| `.claude/skills/ui-design/SKILL.md:14` | edit | citation `"login card, src/app/page.tsx"` → `src/modules/session/components/Login/Login.tsx` (the gradient markup moves there in phase 2; `page.tsx` keeps the path but no longer contains it) | implementer-b (phase 2) |

## Contracts
```ts
// src/modules/shared/resource-display.ts
import { ResourceType } from '@/lib/types';

export const RESOURCE_SPRITES: Record<ResourceType, string>; // unchanged values from icons.tsx:17-21
export function getResourceDisplayName(type: ResourceType): string;

// src/modules/shared/resource-icon.tsx
export function ResourceIcon(props: { type: ResourceType; className?: string }): JSX.Element | null;

// src/modules/shared/fight-icon.tsx
export function FightIcon(props: { className?: string }): JSX.Element;

// src/modules/shared/info-icon.tsx
export function InfoIcon(props: { className?: string }): JSX.Element;

// src/modules/session/components/Login/Login.types.ts
export interface LoginViewProps {
  name: string;
  isLoading: boolean;
  isHydrated: boolean; // true after mount; drives data-hydrated on the #username input
  showErrorDialog: boolean;
  onNameChange: (value: string) => void;
  onNameKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onSubmit: () => void; // the original handleLogin
  onErrorDialogOpenChange: (open: boolean) => void;
}

// src/modules/session/components/Login/Login.hook.ts
// Behavior preserved exactly from src/app/page.tsx:14-40:
// - onSubmit: if !name.trim() return; setIsLoading(true); try await setUsername(name.trim());
//   if (!success) setShowErrorDialog(true); catch -> console.error('Error logging in:', error) then
//   setShowErrorDialog(true); finally setIsLoading(false).
// - isHydrated starts false, becomes true in a useEffect on mount (was `mounted`).
// - does NOT destructure playerId from usePlayer() (unused in the original Login; see Decisions).
export function useLogin(): LoginViewProps;

// src/modules/session/components/Login/Login.tsx
export function LoginView(props: LoginViewProps): JSX.Element; // renders page.tsx:42-109 markup verbatim
export function Login(): JSX.Element; // return <LoginView {...useLogin()} />;

// src/app/page.tsx (thin wrapper, no new exports beyond the route's default)
// Home() keeps: usePlayer() for playerId/username, activeGameId state, handleExitGame,
// renders <Login /> | <GameBoard /> | <Lobby />. Markup for the GameBoard/Lobby branch
// (page.tsx:124-134) unchanged.
```

## Phases
### Phase 1: icons.tsx split
1. Create `src/modules/shared/resource-display.ts`, `resource-icon.tsx`, `fight-icon.tsx`, `info-icon.tsx`; add their exports to `src/modules/shared/index.ts` (implementer-a: `resource-display.ts` + `index.ts`; implementer-b: the 3 `.tsx` files).
2. Repoint the 13 call sites' import path to `@/modules/shared` (implementer-a: the 4 `.map.ts` files; implementer-b: the 9 `.tsx` files).
3. Delete `src/components/icons.tsx`; remove it from `LEGACY_PATHS` (`eslint.config.mjs:13-15`) (implementer-b).
4. Write `resource-display.test.ts`, `resource-icon.test.tsx`, `fight-icon.test.tsx`, `info-icon.test.tsx` (tester-a: first file; tester-b: the other three).
5. `npm run typecheck`, `npm run lint`, `npm test` (every agent, on files they touched; full-repo scope per agent-protocol).
6. Commit: `refactor(shared): migrate icons.tsx into src/modules/shared [phase 1/2]`.

Model escalation: step 1-2 (sonnet, per triage override) — cross-module call-site fixups.

### Phase 2: app entry points
1. Create `src/modules/session/components/Login/` (implementer-a: `.types.ts`, `.hook.ts`, `index.ts`, add export to `src/modules/session/index.ts`; implementer-b: `.styles.ts`, `.tsx`).
2. Edit `src/app/page.tsx`: remove the `Login` function body, import `Login` from `@/modules/session`, keep `Home` as-is otherwise (implementer-b).
3. Remove `'src/components/icons.tsx'` is already gone (phase 1); remove `'src/app/page.tsx'`, `'src/app/layout.tsx'` from `LEGACY_PATHS` (`eslint.config.mjs:17-18`) (implementer-b).
4. Update `docs/README.md:50`'s Visual Parity Rule note and `.claude/skills/ui-design/SKILL.md:14`'s path citation (implementer-b).
5. Write `Login.hook.test.ts` (tester-a), `Login.test.tsx` (tester-b).
6. `npm run typecheck`, `npm run lint`, `npm test`.
7. tester-b: verify at `http://localhost:9002` (logged out) with `ui-verify` — Login form renders, submit flow, error dialog — and run `npm run test:e2e -- e2e/auth-and-lobby.spec.ts` to confirm the frozen e2e spec still passes against the moved markup.
8. Commit: `refactor(session): extract Login from app/page.tsx [phase 2/2]`.

Model escalation: step 1-2 (sonnet, per triage override).

## Test plan
- tester-a (logic, first):
  - `resource-display.test.ts`: `getResourceDisplayName` returns `'Food'`/`'Wood'`/`'Gold'` for each `ResourceType`; `RESOURCE_SPRITES` has the exact 3 sprite paths from `icons.tsx:18-20`.
  - `Login.hook.test.ts` (mock `../../player.provider`'s `usePlayer`):
    - `onSubmit` with blank/whitespace-only `name` does not call `setUsername` and does not set `isLoading`.
    - `onSubmit` trims `name`, calls `setUsername(trimmed)`; `isLoading` is `true` during the call, `false` after.
    - `setUsername` resolves `false` → `showErrorDialog` becomes `true`.
    - `setUsername` resolves `true` → `showErrorDialog` stays `false`.
    - `setUsername` rejects → `console.error` called, `showErrorDialog` becomes `true`, `isLoading` ends `false`.
    - `onNameChange` updates `name`.
    - `isHydrated` is `false` on first render, `true` after effects flush.
    - `onErrorDialogOpenChange(false)` sets `showErrorDialog` back to `false`.
- tester-b (view and e2e):
  - `resource-icon.test.tsx`: for each `ResourceType`, renders an `img` with the matching `src`/`alt`; renders `null` for a cast-unknown type.
  - `fight-icon.test.tsx` / `info-icon.test.tsx`: renders the fixed `src`/`alt`.
  - `Login.test.tsx` (`LoginView` with fixture props):
    - input `id="username"`, has `data-hydrated="true"` only when `isHydrated` is `true`, attribute absent otherwise.
    - "Enter Lobby" button disabled when `name` is empty or `isLoading` is `true`; enabled otherwise.
    - shows a spinner icon when `isLoading`, the sword icon otherwise.
    - typing calls `onNameChange`; pressing Enter in the input calls `onNameKeyDown`; clicking the button calls `onSubmit`.
    - `AlertDialog` with "Username Taken" title/"OK" action renders when `showErrorDialog` is `true`; clicking "OK" calls `onErrorDialogOpenChange(false)`.
  - e2e: `npm run test:e2e -- e2e/auth-and-lobby.spec.ts` (covers login + lobby join flow against the moved markup).

## Preview states
- None — no `preview-a`/`preview-b` in this task's pipeline (pure relocation, no new visual states); verify in-browser per the Phase 2 checklist instead.

## Risks
- Missing an import-path edit at one of the 13 call sites breaks that file's build silently until `npm run typecheck`/`lint` — mitigated by running both on the full repo (not scoped) before each phase's commit, per agent-protocol.
- `page.tsx`'s e2e-critical markup (`id="username"`, `data-hydrated`, button/dialog text) must move byte-for-byte into `Login.tsx`/`Login.hook.ts` — mitigated by `npm run test:e2e -- e2e/auth-and-lobby.spec.ts` in phase 2 step 7, not just unit tests.

## Review (architect-b)
VERDICT: APPROVED

Verified against the repo (not just the plan's own claims):
- `src/components/icons.tsx` line ranges (7-21, 23-45, 47-60, 62-75, 77-109) match the file read directly; `RESOURCE_DISPLAY_NAMES`/`RESOURCE_ICONS` confirmed private (only hits are their own definitions, `grep -rn "RESOURCE_DISPLAY_NAMES\|RESOURCE_ICONS" src`).
- `MonsterIcon`/`SettingsIcon` dead-code claim confirmed: `grep -rln "MonsterIcon\|SettingsIcon" src e2e` → only `icons.tsx` itself and `IslandTile.tsx` (`renderMonsterIcons`, an unrelated local function).
- All 14 `@/components/icons` import sites (`grep -rn "components/icons" src`) are each a row in the File plan (4 `.map.ts` + 10 `.tsx`); none missed.
- `src/app/page.tsx`: `Login` at 14-110, `Home` at 112-135 confirmed; markup block 42-109 matches the `LoginView` contract; `playerId` destructured at line 18 and never read in `Login` — confirmed unused, correctly dropped per Decisions. `Home`'s own `playerId` (line 113) is used at 116 and stays.
- `src/app/layout.tsx` (42 lines): no `any`/`console`, already `import type { Metadata }` — confirmed needs no code change, only delisting.
- `eslint.config.mjs`: `LEGACY_PATHS` entries for the 3 files are at lines 16-18 (plan cites `13-15,17-18` — off by one due to a comment line; trivial, folded in below), `MODULE_FILES`/`RESTRICTED_IMPORTS` confirmed scoped to `src/modules/**` so `page.tsx`/`layout.tsx` are unaffected once delisted.
- `src/modules/shared/index.ts` and `player-sprite.ts` precedent pattern confirmed (flat files + barrel re-export); no naming collision with the 4 new files to add (`ls src/modules/shared` shows none exist yet).
- `src/modules/session/index.ts` and `ConfirmExitDialog`'s file set confirmed as cited.
- `docs/README.md:50`'s Visual Parity Rule note confirmed as cited, referencing `src/app/page.tsx`.
- `docs/ai/refactor.md:40` confirmed `pending`, row #11 matches the three file paths.

Findings:
1. Fixed trivial line-number drift: plan cited `eslint.config.mjs:13-15,17-18` for the `LEGACY_PATHS` entries; actual lines are 16, 17, 18 (a header comment shifts the block by one). Not worth a revision cycle — note here, implementer should use the exact string match (`'src/components/icons.tsx'`, etc.) rather than the line number.
2. Missing path from the architect's own old-path grep: `.claude/skills/ui-design/SKILL.md:14` cites `"login card, src/app/page.tsx"` for the gradient-text hero example. `page.tsx` isn't deleted, but phase 2 moves that exact markup into `Login.tsx` — the citation goes stale. Added as a File plan row (implementer-b, phase 2, folded into step 4) and to phase 2's step list. This is the only hit from `grep -rln "components/icons\|app/page.tsx\|app/layout.tsx" .claude scripts` not already covered by the plan.
3. Design is sound: `src/modules/shared`'s flat no-owner pattern is the right fit (reused, not reinvented); the data/view split (`resource-display.ts` vs `resource-icon.tsx`) matches the existing `.map.ts` consumers' actual needs; `Login`/`LoginView` split matches the connected-component rule correctly since its hook reads `usePlayer()`. No simpler option found — this is the minimum move to satisfy the `max-lines`/import-boundary rules that block delisting `page.tsx`.
4. Test plan is complete: covers blank/whitespace input, trim, loading state, success/failure/reject paths, hydration timing on the hook side; input id/data-hydrated, button disabled states, spinner vs sword icon, dialog open/close, and the frozen e2e spec on the view side. Boundary and invalid-input cases present per the `testing` skill.
5. Phases are appropriately small (one eslint-delist each) and sequenced so phase 1's call-site fixups land before phase 2 touches `page.tsx`, avoiding a cross-phase merge conflict in the same file.

No other invented paths or symbols found.
