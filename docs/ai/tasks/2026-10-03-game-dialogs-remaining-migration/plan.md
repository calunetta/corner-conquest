# Plan: Migrate the remaining 13 game dialogs into src/modules

Status: APPROVED
Inputs: triage.md (no game-design.md or ui-design.md: pure refactor, no behavior or UI change, per row #3's precedent)

## Goal and acceptance criteria
- [ ] All 13 dialogs (`AbilitiesDialog`, `ArmySelectionDialog`, `AttackSelectionDialog`, `CardsDialog`, `ConfirmExitDialog`, `HostLeaveDialog`, `MonsterSelectionDialog`, `PositionDialog`, `ProductiveCardDialog`, `SabotageDialog`, `SpecialIslandRollDialog`, `StealResourceDialog`, `WealthyDialog`) exist under `src/modules/<domain>/` (`cards`, `combat`, `session`), each built per component-architecture and rendering **pixel-identical** output to today's legacy components for the same props.
- [ ] `StealResourceDialog` is split into a shell + two step components, each under the 150-line `max-lines` cap.
- [ ] A new `src/modules/shared/player-sprite.ts` holds the one piece of duplicated knowledge found across domains (a player color's idle sprite, with its `/sprites/blue_idle.gif` fallback), used by both `cards` (`SabotageDialog`, `StealResourceDialog`) and `combat` (`ArmySelectionDialog`, `AttackSelectionDialog`).
- [ ] `src/features/game/components/GameDialogManager.tsx` imports all 13 from `@/modules/cards`, `@/modules/combat`, `@/modules/session`; no other line of `GameDialogManager.tsx` changes across any phase.
- [ ] All 13 legacy files under `src/features/game/dialogs/` are deleted once their replacement is verified, each in the phase that migrates it. `src/features/game/dialogs/__tests__/ResourceDialogs.test.tsx` is trimmed then deleted (see Decisions).
- [ ] Each new component has a testbed preview covering its visual states, with a real close control per state (skill `testbed-preview`, lesson in `docs/ai/lessons-learned.md` "Testbed previews"), screenshot-verified (skill `ui-verify`).
- [ ] `npm run typecheck`, `npm run lint` (zero warnings), `npm test` and `npm run build` pass at the end of every phase; `docs/README.md` describes the new `cards`, `session` modules and the `combat` module's additions, and updates the `GameDialogManager.tsx` bullet.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `GameDialogManager` | `src/features/game/components/GameDialogManager.tsx:1-272` | Renders all 13 dialogs directly (plus the already-migrated `CombatDialog`/`MonsterCombatDialog`) and calls `useGameBoard()` itself (`:6,24-34`). Stays at its legacy path per row #3's Decision (a module `.tsx` may never import `@/features/*`; only `.hook.ts` is exempted, and `.hook.ts` may never return JSX). Only its import lines change, per dialog, as each migrates. Call sites for each dialog's props are quoted below. |
| `AbilitiesDialog` (current) | `src/features/game/dialogs/AbilitiesDialog.tsx:1-125` | Props `{ player, onClose, onBuyAbility, gameState, isMyTurn }` (`:22-28`). `ALL_ABILITIES` constant (`:36-39`): Explorer/Collector title+description. `handleBuy` (`:48-56`) calls `onBuyAbility`, then `useToast()` (`:18,42`) on success; on throw, `catch(e: any)` reads `e.message` for a destructive toast — **the only dialog with a side effect (toast) in its handler**, which is why it is the only "simple" cards dialog that still needs a `.hook.ts`. `hasAbility = player.passiveAbilities[ability.name]` (`:78`); `canAfford = player.resources.gold >= cost` (`:79`); Buy button shown only `isMyTurn && !hasAbility` (`:92-102`), `disabled={!canAfford}` (`:96`). GameDialogManager call site: `src/features/game/components/GameDialogManager.tsx:203-210`. |
| `ArmySelectionDialog` (current) | `src/features/game/dialogs/ArmySelectionDialog.tsx:1-116` | Props `{ state, player, onSelectArmy, onClose, isMyTurn, selectedArmyId? }` (`:20-27`). `getArmyStatus` (`:33-42`): acted → `{ 'Acted', CheckCircle, muted }`; positioned → `{ 'Positioned', Anchor, cyan-400 }`; else → `{ 'Ready', Clock, emerald-400 }`. `isSelectable = (!army.hasActed \|\| player.hasExtraMove) && isMyTurn` (`:64`). Sprite: `PLAYER_DATA[player.color]?.sprite.idle \|\| '/sprites/blue_idle.gif'` (`:83`, `PLAYER_DATA` imported from `@/modules/game-rules`, confirmed `ArmySelectionDialog.tsx:16`). Returns `null` if `!state` (`:30`). GameDialogManager call site: `:147-163`. |
| `AttackSelectionDialog` (current) | `src/features/game/dialogs/AttackSelectionDialog.tsx:1-100` | Props `{ state, onSelectTarget, onClose, isMyTurn }` (`:18-23`). `getArmyStatus` (`:29-38`) — same three statuses as `ArmySelectionDialog` but "Ready" uses `Crosshair`/`red-400` and checks `defendingPlayer.positions`, not `isMyTurn`-gated `hasExtraMove`. Every button disabled when `!isMyTurn` (`:64`, no per-army `hasExtraMove` exception, unlike `ArmySelectionDialog`). Sprite: same fallback pattern (`:74`, `PLAYER_DATA` imported from `@/modules/game-rules`, confirmed `AttackSelectionDialog.tsx:15`). Returns `null` if `!state` (`:26`). Call site: `:165-184`. |
| `CardsDialog` (current) | `src/features/game/dialogs/CardsDialog.tsx:1-120` | Props `{ player, onClose, onUseCard, canUseCards }` (`:20-25`). `cardCounts` (`:28-31`): tally of `player.specialCards`. `canUseCardAbility = canUseCards && !player.actionsThisTurn.includes(GameAction.UseCard)` (`:34`). `isCardUsableNow(cardName) = USABLE_CARDS.includes(cardName)` (`:40-42`, imported from `@/modules/game-rules`, confirmed `CardsDialog.tsx:4`). Empty state when no cards (`:103-108`). Call site: `:259-269`. |
| `ConfirmExitDialog` (current) | `src/features/game/dialogs/ConfirmExitDialog.tsx:1-55` | Props `{ onConfirm, onClose }` (`:16-19`). Fully static markup, zero derived data, zero local state. Call site: `:62-67`. |
| `HostLeaveDialog` (current) | `src/features/game/dialogs/HostLeaveDialog.tsx:1-67` | Props `{ open, onClose, onConfirm, isLastPlayer, gameStatus }` (`:15-21`). `description()` (`:24-32`): `gameStatus === GameStatus.Playing` → in-progress copy; else `isLastPlayer` → dismantle copy; else → new-host copy. Only derived value in the component — a `.map.ts` candidate, no local state. Call site: `:69-75`. |
| `MonsterSelectionDialog` (current) | `src/features/game/dialogs/MonsterSelectionDialog.tsx:1-80` | Props `{ state, onSelectTarget, onClose, isMyTurn }` (`:16-21`). `getMonsterName(monster) = \`${monster.name} (Lvl ${monster.level})\`` (`:27-29`). Power label: `Power: ${monster.level} Dice` (`:66`). Returns `null` if `!state` (`:24`). Call site: `:186-201`. |
| `PositionDialog` (current) | `src/features/game/dialogs/PositionDialog.tsx:1-90` | Props `{ resources, onSelect, onClose }` (`:18-22`). Per resource: `sprite = RESOURCE_SPRITES[resource.type] \|\| '/sprites/mine.png'` (`:44`), `displayName = getResourceDisplayName(resource.type)` (`:45`), both from `@/components/icons`. `data-testid={\`position-resource-btn-${resource.type}\`}` (`:51`) — preserve, existing e2e/test convention. Call site: `:136-145`. |
| `ProductiveCardDialog` (current) | `src/features/game/dialogs/ProductiveCardDialog.tsx:1-111` | Props `{ state, onConfirm }` (`:18-21`) — **no `onClose` prop; `<AlertDialog open={true}>` has no `onOpenChange`, the dialog cannot be dismissed without choosing** (`:33`). Local state `selectedResource` (`:24`), toggled by re-clicking the same option (`:28-30`). Confirm button label: selected → `Double ${displayName} Harvest`, else → `'Harvest Normally (Skip 2x)'` (`:103-105`). `onConfirm(selectedResource)` always fires with the current selection, including `null` (`:100-106`). Call site: `:99-106` (manager always renders it with `state={{ isOpen: true, options: productiveDialogOptions }}`, computed at `:43-58` — unchanged, not part of this migration). |
| `SabotageDialog` (current) | `src/features/game/dialogs/SabotageDialog.tsx:1-76` | Props `{ players, onSabotage, onClose }` (`:18-22`). Per player: sprite via the same `PLAYER_DATA[...] \|\| '/sprites/blue_idle.gif'` fallback (`:52`, `PLAYER_DATA` imported from `@/modules/game-rules`, confirmed `SabotageDialog.tsx:15`) as `ArmySelectionDialog`/`AttackSelectionDialog`. Already has a testbed preview at `src/testbed/legacy/SabotageDialog.preview.tsx` and `.preview.test.tsx`, registered in `src/testbed/registry.ts:2,10` — both are replaced by the module preview in Phase 2 (see Decisions). Call site: `:228-241`. |
| `SpecialIslandRollDialog` (current) | `src/features/game/dialogs/SpecialIslandRollDialog.tsx:1-115` | **No `'use client'` directive** (file starts `import React from 'react';`, `:1`) — it has no local state/effects of its own; `onRoll`'s `async` logic lives entirely in `GameDialogManager` (`:111-128`, unchanged, out of scope). Props `{ state, onRoll, onClose }` (`:16-20`). `isRolled = roll !== null` (`:25`). Card description: `SPECIAL_CARD_DESCRIPTIONS[cardDrawn as CardName]` (`:81`, imported from `@/modules/game-rules`, confirmed `SpecialIslandRollDialog.tsx:14`). Returns `null` if `!state` (`:23`). Call site: `:108-131`. |
| `StealResourceDialog` (current) | `src/features/game/dialogs/StealResourceDialog.tsx:1-183` | Props `{ players, onSteal, onClose }` (`:19-23`). Two-step flow via local state `selectedPlayer`/`selectedResource` (`:26-27`): player grid (`renderPlayerSelection`, `:34-90`) → resource grid (`renderResourceSelection`, `:92-174`, "Back" resets `selectedPlayer` only, `:161`). `totalResources = Object.values(player.resources).reduce((a,b)=>a+b, 0)` (`:53`) shown per player. Resource sprite/fallback/displayName via `@/components/icons` (`:113-114`), same as `PositionDialog`. Sprite fallback for the player avatar: same `PLAYER_DATA[...] \|\| '/sprites/blue_idle.gif'` pattern (`:69`, `PLAYER_DATA` imported from `@/modules/game-rules`, confirmed `StealResourceDialog.tsx:17`) as `ArmySelectionDialog`/`AttackSelectionDialog`/`SabotageDialog` — **4th occurrence, crosses the `cards`/`combat` domain boundary**, the trigger for the `shared/player-sprite.ts` extraction (see Decisions). `data-testid` attributes (`:59,121`) — preserve, existing test convention (used by `ResourceDialogs.test.tsx`). **183 lines: exceeds the 150-line cap once moved into `src/modules`, must split** (triage, confirmed). Call site: `:213-226`. |
| `WealthyDialog` (current) | `src/features/game/dialogs/WealthyDialog.tsx:1-93` | Props `{ onSelectResource, onClose }` (`:17-20`). `RESOURCES` constant: `[Food, Wood, Gold]` (`:22`), fixed order, not derived from game state. Sprite/displayName via `@/components/icons`, same pattern as `PositionDialog`. Call site: `:243-255`. |
| `ArmySelectionDialogState`, `AttackSelectionDialogState`, `MonsterSelectionDialogState`, `PositionDialogState`, `ProductiveCardDialogState`, `SpecialIslandRollDialogState`, `SabotageDialogState`, `StealResourceDialogState`, `WealthyDialogState` | `src/lib/types/dialogs.ts:1-61` | All nullable unions, re-exported via the `@/lib/types` barrel (`src/lib/types/index.ts:7`). Exact shapes quoted per-component in Contracts. |
| `GameStatus` | `src/lib/types/game.ts:6-11` | `{ Waiting: 'waiting', Playing: 'playing', Finished: 'finished' }`, used by `HostLeaveDialog`'s `description()`. |
| `AbilityName`, `PassiveAbilities` | `src/lib/types/cards.ts:18-22,31-33` | `{ Explorer: 'explorer', Collector: 'collector' }`; `PassiveAbilities = { [key in AbilityName]?: boolean }`. |
| `GameSettings.abilityCost`, `.availableAbilities` | `src/lib/types/game.ts:19,23` | `abilityCost: number`; `availableAbilities: AbilityName[]`. |
| `Monster` | `src/lib/types/monsters.ts:9-16` | `{ name, level, sprite: { idle, attack, death } }` (confirmed in row #3's plan). |
| `IslandResource` | `src/lib/types/map.ts:13-16` | `{ type: ResourceType; amount: number }`. |
| `Army`, `Player`, `PlayerColor` | `src/lib/types/player.ts:6-10,20-38` | `Army { id, position, hasActed }`; `Player.positions: PlayerPosition[]`, `.hasExtraMove: boolean`, `.resources: Record<ResourceType, number>`, `.actionsThisTurn: GameAction[]`, `.specialCards: CardName[]`, `.passiveAbilities`. |
| `USABLE_CARDS`, `SPECIAL_CARD_DESCRIPTIONS` | `src/modules/game-rules/card-data.ts:29,41`, re-exported at `src/modules/game-rules/index.ts:1` | `USABLE_CARDS: CardName[]`; `SPECIAL_CARD_DESCRIPTIONS: Record<CardName, string>`. Import from `@/modules/game-rules`, never `@/lib/card-data`. |
| `PLAYER_DATA` | `src/modules/game-rules/player-data.ts:18`, re-exported at `src/modules/game-rules/index.ts:2` | `Record<PlayerColor, PlayerData>`, `.sprite.idle` used by the 4 components below. Import from `@/modules/game-rules`, never `@/lib/player-data`. |
| `@/modules/game-rules` already re-exports both constants | `src/modules/game-rules/index.ts:1-2` (`export { BASE_CARDS, SPECIAL_CARD_DESCRIPTIONS, USABLE_CARDS } from './card-data';` / `export { PLAYER_COLORS, PLAYER_DATA } from './player-data';`) | Confirmed in this session. A concurrent sibling task (`docs/ai/tasks/2026-10-03-game-rules-core-migration/plan.md`, Status: APPROVED) will delete `src/lib/card-data.ts` and `src/lib/player-data.ts` once it repoints their remaining importers. Also confirmed in this session: the 6 legacy dialog files that use either constant (`CardsDialog.tsx:4`, `SpecialIslandRollDialog.tsx:14`, `ArmySelectionDialog.tsx:16`, `AttackSelectionDialog.tsx:15`, `SabotageDialog.tsx:15`, `StealResourceDialog.tsx:17`) already import from `@/modules/game-rules` today, not from `@/lib/card-data`/`@/lib/player-data` — so every Contract below cites the import path that is already correct, not just future-proofed. `AbilitiesDialog.tsx` imports neither constant (confirmed by reading its full import list); it is not among the 6. |
| `RESOURCE_SPRITES`, `getResourceDisplayName`, `ResourceIcon` | `src/components/icons.tsx:17,13,29` | `RESOURCE_SPRITES: Record<ResourceType, string>`; `getResourceDisplayName(type): string`; `ResourceIcon({ type, className })` — a React component, stays in `.tsx` files only. All three legacy-but-importable anywhere (not `@/features/*`), same as row #3's `FightIcon`. |
| `useToast` | `src/hooks/use-toast.ts:208` | `export { useToast, toast }`. `src/hooks/**` is `LEGACY_PATHS` but not `@/features/*`, so importable in `.hook.ts` (and `.tsx`) without the `legacyUi` ESLint restriction tripping — confirmed against `eslint.config.mjs:50-53` (restriction group is exactly `['@/features/*', '@/features/**']`). |
| ESLint module boundaries | `eslint.config.mjs:42-57,73,77-96` | Unchanged since row #3: `max-lines` 150 (`:73`); `legacyUi` blocks `@/features/*` in every module file except `.hook.ts` (`:88-96`). None of these 13 dialogs' hooks need `@/features/*` (none calls `useGameBoard()` — confirmed by reading all 13 files in full this session; the triage's `firebase`/`Math.random`/`Date.now` grep found nothing either). |
| Existing test coverage | `src/features/game/dialogs/__tests__/ResourceDialogs.test.tsx:1-98` | One `describe` block covering `ProductiveCardDialog`, `WealthyDialog`, `StealResourceDialog` (one `it` each). The other 10 dialogs have **no existing tests** — characterization tests must be written from scratch for those. See Decisions for how this shared file is split across phases. |
| Testbed preview pattern (established) | `src/modules/combat/components/CombatDialog/CombatDialog.preview.tsx`, `.preview.test.tsx`; `src/testbed/registry.ts`; skill `testbed-preview` | Every preview state needs a real close control (`useState`-backed), and a `pointer-events-auto` fallback close button for phases with no in-dialog control, verified by clicking it in a `.preview.test.tsx` — this is now the established, required pattern (two lessons in `docs/ai/lessons-learned.md` "Testbed previews"), not optional. |
| `src/modules/shared/` | does not exist yet (`find` returned nothing) | New in this task: `player-sprite.ts` + `.test.ts` + `index.ts`, per component-architecture's "code used by two or more modules" layout. |
| `docs/README.md` sections to update | `:29` (new-vs-legacy intro, unchanged, just confirms the pattern), `:33` (`src/modules/` bullet — currently lists only `game-board`, `game-rules`, `combat`), `:46` (`GameDialogManager.tsx` bullet, currently says "the other 13 dialogs still live under `src/features/game/dialogs/`") | Read in full this session; line numbers confirmed. |

## Decisions
- **Three domains: `cards`, `combat` (extended), `session`.** `cards` (`AbilitiesDialog`, `CardsDialog`, `ProductiveCardDialog`, `SabotageDialog`, `SpecialIslandRollDialog`, `StealResourceDialog`, `WealthyDialog` — 7 dialogs): every dialog opened mid-turn to spend or receive resources, special cards, or gold-bought abilities, matching the example domain list in component-architecture (`hud, combat, cards, lobby, map`). `combat` extension (`ArmySelectionDialog`, `AttackSelectionDialog`, `MonsterSelectionDialog`, `PositionDialog` — 4 dialogs): the pre-combat squad/target selection and garrison-positioning flow that leads into the already-migrated `CombatDialog`/`MonsterCombatDialog`. `session` (`ConfirmExitDialog`, `HostLeaveDialog` — 2 dialogs, new domain): leaving the match, not a gameplay action. 7+4+2 = 13.
- **`GameDialogManager.tsx` stays in `src/features/game/components/`; only its import lines change, dialog by dialog.** Identical reasoning to row #3 (`docs/ai/tasks/2026-10-03-migrate-dialog-components/plan.md`, Decisions, reviewed and approved by architect-b there): it renders every dialog directly in one JSX tree and calls `useGameBoard()` itself; no module `.tsx` may import `@/features/*` under any circumstance, and a `.hook.ts` may never return JSX. Not re-litigated per triage's explicit instruction.
- **`shared/player-sprite.ts`, a new logic-only module.** `PLAYER_DATA[color]?.sprite.idle || '/sprites/blue_idle.gif'` appears 4 times (`ArmySelectionDialog:83`, `AttackSelectionDialog:74`, `SabotageDialog:52`, `StealResourceDialog:69`), crossing the `cards`/`combat` domain line — past kiss-dry-solid's "third copy" threshold and not shareable through either domain's own module (would force one domain to import the other's internals, which `deepModuleImport` forbids anyway). Pulled into `src/modules/shared/`, the layout's designated place for "code used by two or more modules." A plain `.ts` file (no state in or out beyond the lookup), not `.map.ts`, per component-architecture's "logic-only modules" rule ("a stateless helper... is a plain `name.ts`"). Created once, in Phase 2 (first consumers: `SabotageDialog`, `StealResourceDialog`), reused by `ArmySelectionDialog`/`AttackSelectionDialog` in Phase 3.
- **`RESOURCE_SPRITES[x] || '/sprites/mine.png'` is NOT extracted**, despite appearing in `PositionDialog`, `ProductiveCardDialog`, `StealResourceDialog`, `WealthyDialog`. Unlike the player-sprite fallback, this one-line idiom already reads from a single centralized table (`@/components/icons.tsx`'s `RESOURCE_SPRITES`) — the actual knowledge (which sprite per resource) has exactly one source today. The repeated `|| fallback` is a trivial defensive idiom around an already-complete `Record<ResourceType, string>` (never actually triggers, all 3 keys are always present), not duplicated domain knowledge. Extracting a one-line wrapper for it would be a pass-through layer (kiss-dry-solid: no speculative layers).
- **`getArmyStatus` in `ArmySelectionDialog` and `AttackSelectionDialog` is NOT extracted**, despite being structurally similar (status badge + icon + color per army state). Rejected: only 2 copies (below the third-copy DRY threshold), and the two differ in more than cosmetics — different "Ready" icon/color (`Clock`/emerald vs. `Crosshair`/red), different selectability rule (`ArmySelectionDialog` has the `player.hasExtraMove` exception; `AttackSelectionDialog` does not), different status source (`player.positions` vs. `defendingPlayer.positions`). Forcing a shared helper now would need a parameter for every one of these differences — more indirection than the ~10 duplicated lines it would save.
- **Per-component file set is minimal, not uniform.** Not every dialog gets every file:
  - `ConfirmExitDialog`: zero derived data, zero local state, zero side effects — no `.map.ts`, no `.hook.ts`. The view calls its two props directly (component-architecture: "a static badge may be `.tsx`, `.styles.ts`, `index.ts`, a test and a preview").
  - `CardsDialog`, `SabotageDialog`, `WealthyDialog`, `SpecialIslandRollDialog`, `ArmySelectionDialog`, `AttackSelectionDialog`, `MonsterSelectionDialog`, `PositionDialog`, `HostLeaveDialog`: a pure derived view model (`.map.ts`) but no local React state or side effect — no `.hook.ts`; the view imports and calls the map function directly, matching the file table's "pure transforms: source data → view model," independent of whether a hook also exists for that component.
  - `ProductiveCardDialog` (toggled `selectedResource`), `AbilitiesDialog` (toast side effect in its buy handler), `StealResourceDialog` (two-step `selectedPlayer`/`selectedResource` state): these get a `.hook.ts`.
  - This is the fixed per-component architecture applying file-by-file, not a speculative extra layer; kiss-dry-solid's "no pass-through layers" targets layers beyond this mandated set, not the set itself.
- **`StealResourceDialog` splits into a shell (`StealResourceDialog.tsx`) + `PlayerSelectionStep.tsx` + `ResourceSelectionStep.tsx`**, same pattern as row #3's `MonsterCombatDialog` three-screen split: required by the 150-line cap, and each step is a real, separate rendering responsibility (not an arbitrary split). Only `StealResourceDialog` is exported from the component's `index.ts`.
- **`AbilitiesDialog`'s `catch (e: any)` becomes `catch (e: unknown)` with an `e instanceof Error ? e.message : 'Unknown error'` guard.** `no-explicit-any` is `'error'` for every module file (`eslint.config.mjs:68`); this is the minimal behavior-preserving fix (same toast title/variant, same message when `e` is an `Error`, which is what `onBuyAbility` will always throw in practice) — not a design change.
- **`ProductiveCardDialog` keeps its missing `onClose`/`onOpenChange` exactly as today** — the dialog has no way to be dismissed without picking an option (or "none"). This is the current, intentional behavior (confirming a turn-ending choice); do not add a close affordance. Its preview must still provide an escape hatch per `testbed-preview` (a sibling "Close preview" button, same `pointer-events-auto` pattern as `CombatDialog`'s rolling phase), since the dialog itself has none.
- **`ResourceDialogs.test.tsx` is split across Phase 1 and Phase 2, not deleted in one step.** It covers 3 components migrating in 2 different phases. Phase 1 (tester-a): remove only the `ProductiveCardDialog` `it(...)` block, porting its assertions into `ProductiveCardDialog.test.tsx`; the file keeps its remaining 2 tests (`WealthyDialog`, `StealResourceDialog`), still passing against the still-legacy files. Phase 2 (tester-a): once both of those migrate, port their assertions and delete the file entirely. A test file that still imports a path deleted in the same phase would break `npm test` immediately (lessons-learned, "Refactors") — this sequencing avoids that.
- **`src/testbed/legacy/SabotageDialog.preview.tsx` and `.preview.test.tsx` are deleted in Phase 2**, replaced by `src/modules/cards/components/SabotageDialog/SabotageDialog.preview.tsx` (+ `.preview.test.tsx`), registered in `src/testbed/registry.ts` in place of the legacy entry. The existing fixture-building helper (`createFixturePlayer`) is not reused as-is (it builds a full legacy `Player`); the new preview uses `SabotageDialog.fixtures.ts` instead, per component-architecture ("Tests and previews share fixtures").
- **Every component needing `PLAYER_DATA`, `USABLE_CARDS` or `SPECIAL_CARD_DESCRIPTIONS` imports from `@/modules/game-rules`, never `@/lib/card-data`/`@/lib/player-data`.** A concurrent, already-approved sibling task (`docs/ai/tasks/2026-10-03-game-rules-core-migration/plan.md`) deletes both `src/lib/` files once it repoints their remaining importers; `@/modules/game-rules` already re-exports both constants today (`src/modules/game-rules/index.ts:1-2`), and the 6 legacy dialogs that use either constant already import from there, not from `@/lib/*` (confirmed by reading each file's imports this session). Citing `@/modules/game-rules` is correct regardless of which task finishes first, and avoids sequencing two independent, already-approved tasks.
- Rejected: a single `misc`/`dialogs` domain for all 13 — defeats the purpose of domain grouping (component-architecture's own example list groups by game concept, not by "is a dialog").
- Rejected: moving `GameDialogManager.tsx` itself — out of scope per triage, same blocker as row #3.

## File plan
Legend: owners are implementer-a (`.types`, `.map`, `.hook`, `.fixtures`, `index.ts`), implementer-b (`.tsx`, `.styles.ts`, legacy wiring), tester-a (logic tests, first), tester-b (view tests, e2e), preview-a/preview-b (previews + registry, alternating per phase).

### Phase 1 — cards domain, batch 1: CardsDialog, ProductiveCardDialog, SpecialIslandRollDialog, AbilitiesDialog
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/features/game/dialogs/__tests__/CardsDialog.characterization.test.tsx` | new (deleted end of phase) | Captures current `CardsDialog` behavior. | tester-a |
| `src/modules/cards/components/CardsDialog/CardsDialog.types.ts` | new | Props, view-model types. | implementer-a |
| `src/modules/cards/components/CardsDialog/CardsDialog.map.ts` | new | `toCardsDialogViewModel`. | implementer-a |
| `src/modules/cards/components/CardsDialog/CardsDialog.fixtures.ts` | new | Deterministic `Player` fixtures (no cards / several cards / a used-up `UseCard` action). | implementer-a |
| `src/modules/cards/components/CardsDialog/index.ts` | new | Component public API. | implementer-a |
| `src/modules/cards/components/CardsDialog/CardsDialog.styles.ts` | new | Every Tailwind class, copied from the legacy file. | implementer-b |
| `src/modules/cards/components/CardsDialog/CardsDialog.tsx` | new | The view; calls `toCardsDialogViewModel` directly (no hook — see Decisions). | implementer-b |
| `src/modules/cards/components/CardsDialog/CardsDialog.map.test.ts` | new | tester-a |
| `src/modules/cards/components/CardsDialog/CardsDialog.test.tsx` | new | Adapted characterization cases. | tester-b |
| `src/modules/cards/components/CardsDialog/CardsDialog.preview.tsx` + `.preview.test.tsx` | new | preview-a |
| `src/features/game/dialogs/__tests__/ProductiveCardDialog.characterization.test.tsx` | new (deleted end of phase) | Captures current behavior beyond what `ResourceDialogs.test.tsx` already covers (the toggle-off case, the "Harvest Normally" default). | tester-a |
| `src/modules/cards/components/ProductiveCardDialog/ProductiveCardDialog.types.ts` | new | implementer-a |
| `src/modules/cards/components/ProductiveCardDialog/ProductiveCardDialog.map.ts` | new | `toProductiveCardDialogViewModel`. | implementer-a |
| `src/modules/cards/components/ProductiveCardDialog/ProductiveCardDialog.hook.ts` | new | `useProductiveCardDialog`: `selectedResource` state + handlers. | implementer-a |
| `src/modules/cards/components/ProductiveCardDialog/ProductiveCardDialog.fixtures.ts` | new | implementer-a |
| `src/modules/cards/components/ProductiveCardDialog/index.ts` | new | implementer-a |
| `src/modules/cards/components/ProductiveCardDialog/ProductiveCardDialog.styles.ts` | new | implementer-b |
| `src/modules/cards/components/ProductiveCardDialog/ProductiveCardDialog.tsx` | new | implementer-b |
| `src/modules/cards/components/ProductiveCardDialog/ProductiveCardDialog.map.test.ts`, `.hook.test.ts` | new | tester-a |
| `src/modules/cards/components/ProductiveCardDialog/ProductiveCardDialog.test.tsx` | new | Includes the `ResourceDialogs.test.tsx` case, ported. | tester-b |
| `src/modules/cards/components/ProductiveCardDialog/ProductiveCardDialog.preview.tsx` + `.preview.test.tsx` | new | preview-a |
| `src/features/game/dialogs/__tests__/SpecialIslandRollDialog.characterization.test.tsx` | new (deleted end of phase) | tester-a |
| `src/modules/cards/components/SpecialIslandRollDialog/SpecialIslandRollDialog.types.ts` | new | implementer-a |
| `src/modules/cards/components/SpecialIslandRollDialog/SpecialIslandRollDialog.map.ts` | new | `toSpecialIslandRollViewModel`. | implementer-a |
| `src/modules/cards/components/SpecialIslandRollDialog/SpecialIslandRollDialog.fixtures.ts` | new | implementer-a |
| `src/modules/cards/components/SpecialIslandRollDialog/index.ts` | new | implementer-a |
| `src/modules/cards/components/SpecialIslandRollDialog/SpecialIslandRollDialog.styles.ts` | new | implementer-b |
| `src/modules/cards/components/SpecialIslandRollDialog/SpecialIslandRollDialog.tsx` | new | 'use client' added here even though the legacy file had none, since the view still needs to be a client component inside a client tree (consistent with every other dialog; the missing directive on the legacy file was incidental, not a constraint to preserve — it has no effect on rendered output). | implementer-b |
| `src/modules/cards/components/SpecialIslandRollDialog/SpecialIslandRollDialog.map.test.ts` | new | tester-a |
| `src/modules/cards/components/SpecialIslandRollDialog/SpecialIslandRollDialog.test.tsx` | new | tester-b |
| `src/modules/cards/components/SpecialIslandRollDialog/SpecialIslandRollDialog.preview.tsx` + `.preview.test.tsx` | new | preview-a |
| `src/features/game/dialogs/__tests__/AbilitiesDialog.characterization.test.tsx` | new (deleted end of phase) | tester-a |
| `src/modules/cards/components/AbilitiesDialog/AbilitiesDialog.types.ts` | new | implementer-a |
| `src/modules/cards/components/AbilitiesDialog/AbilitiesDialog.map.ts` | new | `toAbilitiesDialogViewModel`, `ALL_ABILITIES` constant. | implementer-a |
| `src/modules/cards/components/AbilitiesDialog/AbilitiesDialog.hook.ts` | new | `useAbilitiesDialog`: wraps `onBuyAbility` with `useToast`, `unknown`-cast catch (see Decisions). | implementer-a |
| `src/modules/cards/components/AbilitiesDialog/AbilitiesDialog.fixtures.ts` | new | implementer-a |
| `src/modules/cards/components/AbilitiesDialog/index.ts`, `src/modules/cards/index.ts` | new | Component + module public API (module barrel exports all 4 of this phase's components; `SabotageDialog`/`StealResourceDialog`/`WealthyDialog` added in Phase 2). | implementer-a |
| `src/modules/cards/components/AbilitiesDialog/AbilitiesDialog.styles.ts` | new | implementer-b |
| `src/modules/cards/components/AbilitiesDialog/AbilitiesDialog.tsx` | new | implementer-b |
| `src/modules/cards/components/AbilitiesDialog/AbilitiesDialog.map.test.ts`, `.hook.test.ts` | new | tester-a |
| `src/modules/cards/components/AbilitiesDialog/AbilitiesDialog.test.tsx` | new | tester-b |
| `src/modules/cards/components/AbilitiesDialog/AbilitiesDialog.preview.tsx` + `.preview.test.tsx` | new | preview-a |
| `src/features/game/dialogs/__tests__/ResourceDialogs.test.tsx` | edit | Remove the `ProductiveCardDialog` `it(...)` block only; keep the other two. | tester-a |
| `src/features/game/components/GameDialogManager.tsx` | edit | Swap `CardsDialog`, `ProductiveCardDialog`, `SpecialIslandRollDialog`, `AbilitiesDialog` imports to `@/modules/cards`. No other line changes. | implementer-b |
| `src/features/game/dialogs/{CardsDialog,ProductiveCardDialog,SpecialIslandRollDialog,AbilitiesDialog}.tsx` and their characterization tests | deleted | End of phase, once verified. | implementer-b |

Model escalation: implementer-a/b and tester-a/b sonnet for the whole task (triage override, tier L); no additional per-phase escalation needed here (4 straightforward components, one with a side effect).

### Phase 2 — cards domain, batch 2: SabotageDialog, WealthyDialog, StealResourceDialog; shared/player-sprite
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/shared/player-sprite.ts` | new | `toPlayerIdleSprite(color): string`. | implementer-a |
| `src/modules/shared/player-sprite.test.ts` | new | tester-a |
| `src/modules/shared/index.ts` | new | Module public API. | implementer-a |
| `src/features/game/dialogs/__tests__/SabotageDialog.characterization.test.tsx` | new (deleted end of phase) | tester-a |
| `src/modules/cards/components/SabotageDialog/SabotageDialog.types.ts` | new | implementer-a |
| `src/modules/cards/components/SabotageDialog/SabotageDialog.map.ts` | new | `toSabotageDialogViewModel` (uses `toPlayerIdleSprite`). | implementer-a |
| `src/modules/cards/components/SabotageDialog/SabotageDialog.fixtures.ts` | new | implementer-a |
| `src/modules/cards/components/SabotageDialog/index.ts` | new | implementer-a |
| `src/modules/cards/components/SabotageDialog/SabotageDialog.styles.ts` | new | implementer-b |
| `src/modules/cards/components/SabotageDialog/SabotageDialog.tsx` | new | implementer-b |
| `src/modules/cards/components/SabotageDialog/SabotageDialog.map.test.ts` | new | tester-a |
| `src/modules/cards/components/SabotageDialog/SabotageDialog.test.tsx` | new | tester-b |
| `src/modules/cards/components/SabotageDialog/SabotageDialog.preview.tsx` + `.preview.test.tsx` | new | preview-b |
| `src/testbed/legacy/SabotageDialog.preview.tsx`, `.preview.test.tsx` | deleted | Replaced by the module preview. | preview-b |
| `src/testbed/registry.ts` | edit | Remove the legacy `sabotageDialogPreview` import/entry; add the new one, plus `WealthyDialog`'s and `StealResourceDialog`'s. | preview-b |
| `src/features/game/dialogs/__tests__/WealthyDialog.characterization.test.tsx` | new (deleted end of phase) | Beyond `ResourceDialogs.test.tsx`'s one case: all 3 resources render, no selection highlight state exists (stateless component). | tester-a |
| `src/modules/cards/components/WealthyDialog/WealthyDialog.types.ts` | new | implementer-a |
| `src/modules/cards/components/WealthyDialog/WealthyDialog.map.ts` | new | `toWealthyDialogViewModel`. | implementer-a |
| `src/modules/cards/components/WealthyDialog/WealthyDialog.fixtures.ts` | new | implementer-a |
| `src/modules/cards/components/WealthyDialog/index.ts` | new | implementer-a |
| `src/modules/cards/components/WealthyDialog/WealthyDialog.styles.ts` | new | implementer-b |
| `src/modules/cards/components/WealthyDialog/WealthyDialog.tsx` | new | implementer-b |
| `src/modules/cards/components/WealthyDialog/WealthyDialog.map.test.ts` | new | tester-a |
| `src/modules/cards/components/WealthyDialog/WealthyDialog.test.tsx` | new | Includes the ported `ResourceDialogs.test.tsx` case. | tester-b |
| `src/modules/cards/components/WealthyDialog/WealthyDialog.preview.tsx` + `.preview.test.tsx` | new | preview-b |
| `src/features/game/dialogs/__tests__/StealResourceDialog.characterization.test.tsx` | new (deleted end of phase) | Beyond `ResourceDialogs.test.tsx`'s one case: the "Back" button, the disabled-when-unavailable resource, toggling the resource selection before confirming. | tester-a |
| `src/modules/cards/components/StealResourceDialog/StealResourceDialog.types.ts` | new | Props, `PlayerOptionViewModel`, `ResourceOptionViewModel`, step view-model union. | implementer-a |
| `src/modules/cards/components/StealResourceDialog/StealResourceDialog.map.ts` | new | `toPlayerOptions`, `toResourceOptions` (uses `toPlayerIdleSprite`). | implementer-a |
| `src/modules/cards/components/StealResourceDialog/StealResourceDialog.hook.ts` | new | `useStealResourceDialog`: `selectedPlayerId`/`selectedResource` state + handlers. | implementer-a |
| `src/modules/cards/components/StealResourceDialog/StealResourceDialog.fixtures.ts` | new | implementer-a |
| `src/modules/cards/components/StealResourceDialog/index.ts`, `src/modules/cards/index.ts` (edit, adds all 3 of this phase's components) | new / edit | implementer-a |
| `src/modules/cards/components/StealResourceDialog/StealResourceDialog.styles.ts` | new | implementer-b |
| `src/modules/cards/components/StealResourceDialog/StealResourceDialog.tsx` | new | Shell: `AlertDialog` + step switch. | implementer-b |
| `src/modules/cards/components/StealResourceDialog/PlayerSelectionStep.tsx` | new | Player-grid JSX. | implementer-b |
| `src/modules/cards/components/StealResourceDialog/ResourceSelectionStep.tsx` | new | Resource-grid JSX. | implementer-b |
| `src/modules/cards/components/StealResourceDialog/StealResourceDialog.map.test.ts`, `.hook.test.ts` | new | tester-a |
| `src/modules/cards/components/StealResourceDialog/StealResourceDialog.test.tsx` | new | Includes the ported `ResourceDialogs.test.tsx` case. | tester-b |
| `src/modules/cards/components/StealResourceDialog/StealResourceDialog.preview.tsx` + `.preview.test.tsx` | new | preview-b |
| `src/features/game/dialogs/__tests__/ResourceDialogs.test.tsx` | deleted | All 3 of its subjects now migrated and ported. | tester-a |
| `src/features/game/components/GameDialogManager.tsx` | edit | Swap `SabotageDialog`, `WealthyDialog`, `StealResourceDialog` imports to `@/modules/cards`. | implementer-b |
| `src/features/game/dialogs/{SabotageDialog,WealthyDialog,StealResourceDialog}.tsx` and their characterization tests | deleted | End of phase. | implementer-b |

Model escalation: sonnet for `StealResourceDialog`'s implementer-a/b and tester-a/b (two-step flow + mandatory split, same structural risk tier as row #3's `MonsterCombatDialog`).

### Phase 3 — combat domain, batch 1: ArmySelectionDialog, AttackSelectionDialog, MonsterSelectionDialog
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/features/game/dialogs/__tests__/ArmySelectionDialog.characterization.test.tsx` | new (deleted end of phase) | tester-a |
| `src/modules/combat/components/ArmySelectionDialog/ArmySelectionDialog.types.ts` | new | implementer-a |
| `src/modules/combat/components/ArmySelectionDialog/ArmySelectionDialog.map.ts` | new | `toArmySelectionViewModel` (uses `toPlayerIdleSprite` from `@/modules/shared`). | implementer-a |
| `src/modules/combat/components/ArmySelectionDialog/ArmySelectionDialog.fixtures.ts` | new | implementer-a |
| `src/modules/combat/components/ArmySelectionDialog/index.ts` | new | implementer-a |
| `src/modules/combat/components/ArmySelectionDialog/ArmySelectionDialog.styles.ts` | new | implementer-b |
| `src/modules/combat/components/ArmySelectionDialog/ArmySelectionDialog.tsx` | new | implementer-b |
| `src/modules/combat/components/ArmySelectionDialog/ArmySelectionDialog.map.test.ts` | new | tester-a |
| `src/modules/combat/components/ArmySelectionDialog/ArmySelectionDialog.test.tsx` | new | tester-b |
| `src/modules/combat/components/ArmySelectionDialog/ArmySelectionDialog.preview.tsx` + `.preview.test.tsx` | new | preview-a |
| `src/features/game/dialogs/__tests__/AttackSelectionDialog.characterization.test.tsx` | new (deleted end of phase) | tester-a |
| `src/modules/combat/components/AttackSelectionDialog/AttackSelectionDialog.types.ts` | new | implementer-a |
| `src/modules/combat/components/AttackSelectionDialog/AttackSelectionDialog.map.ts` | new | `toAttackSelectionViewModel` (uses `toPlayerIdleSprite`). | implementer-a |
| `src/modules/combat/components/AttackSelectionDialog/AttackSelectionDialog.fixtures.ts` | new | implementer-a |
| `src/modules/combat/components/AttackSelectionDialog/index.ts` | new | implementer-a |
| `src/modules/combat/components/AttackSelectionDialog/AttackSelectionDialog.styles.ts` | new | implementer-b |
| `src/modules/combat/components/AttackSelectionDialog/AttackSelectionDialog.tsx` | new | implementer-b |
| `src/modules/combat/components/AttackSelectionDialog/AttackSelectionDialog.map.test.ts` | new | tester-a |
| `src/modules/combat/components/AttackSelectionDialog/AttackSelectionDialog.test.tsx` | new | tester-b |
| `src/modules/combat/components/AttackSelectionDialog/AttackSelectionDialog.preview.tsx` + `.preview.test.tsx` | new | preview-a |
| `src/features/game/dialogs/__tests__/MonsterSelectionDialog.characterization.test.tsx` | new (deleted end of phase) | tester-a |
| `src/modules/combat/components/MonsterSelectionDialog/MonsterSelectionDialog.types.ts` | new | implementer-a |
| `src/modules/combat/components/MonsterSelectionDialog/MonsterSelectionDialog.map.ts` | new | `toMonsterSelectionViewModel`. | implementer-a |
| `src/modules/combat/components/MonsterSelectionDialog/MonsterSelectionDialog.fixtures.ts` | new | implementer-a |
| `src/modules/combat/components/MonsterSelectionDialog/index.ts`, `src/modules/combat/index.ts` (edit) | new / edit | implementer-a |
| `src/modules/combat/components/MonsterSelectionDialog/MonsterSelectionDialog.styles.ts` | new | implementer-b |
| `src/modules/combat/components/MonsterSelectionDialog/MonsterSelectionDialog.tsx` | new | implementer-b |
| `src/modules/combat/components/MonsterSelectionDialog/MonsterSelectionDialog.map.test.ts` | new | tester-a |
| `src/modules/combat/components/MonsterSelectionDialog/MonsterSelectionDialog.test.tsx` | new | tester-b |
| `src/modules/combat/components/MonsterSelectionDialog/MonsterSelectionDialog.preview.tsx` + `.preview.test.tsx` | new | preview-a |
| `src/features/game/components/GameDialogManager.tsx` | edit | Swap `ArmySelectionDialog`, `AttackSelectionDialog`, `MonsterSelectionDialog` imports to `@/modules/combat`. | implementer-b |
| `src/features/game/dialogs/{ArmySelectionDialog,AttackSelectionDialog,MonsterSelectionDialog}.tsx` and their characterization tests | deleted | End of phase. | implementer-b |

Model escalation: none beyond the standing tier-L sonnet override (three stateless, prop-driven components).

### Phase 4 — combat domain batch 2 (PositionDialog) + session domain (ConfirmExitDialog, HostLeaveDialog)
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/features/game/dialogs/__tests__/PositionDialog.characterization.test.tsx` | new (deleted end of phase) | tester-a |
| `src/modules/combat/components/PositionDialog/PositionDialog.types.ts` | new | implementer-a |
| `src/modules/combat/components/PositionDialog/PositionDialog.map.ts` | new | `toPositionDialogViewModel`. | implementer-a |
| `src/modules/combat/components/PositionDialog/PositionDialog.fixtures.ts` | new | implementer-a |
| `src/modules/combat/components/PositionDialog/index.ts`, `src/modules/combat/index.ts` (edit) | new / edit | implementer-a |
| `src/modules/combat/components/PositionDialog/PositionDialog.styles.ts` | new | implementer-b |
| `src/modules/combat/components/PositionDialog/PositionDialog.tsx` | new | implementer-b |
| `src/modules/combat/components/PositionDialog/PositionDialog.map.test.ts` | new | tester-a |
| `src/modules/combat/components/PositionDialog/PositionDialog.test.tsx` | new | tester-b |
| `src/modules/combat/components/PositionDialog/PositionDialog.preview.tsx` + `.preview.test.tsx` | new | preview-b |
| `src/features/game/dialogs/__tests__/ConfirmExitDialog.characterization.test.tsx` | new (deleted end of phase) | tester-a |
| `src/modules/session/components/ConfirmExitDialog/ConfirmExitDialog.types.ts` | new | implementer-a |
| `src/modules/session/components/ConfirmExitDialog/index.ts` | new | implementer-a |
| `src/modules/session/components/ConfirmExitDialog/ConfirmExitDialog.styles.ts` | new | implementer-b |
| `src/modules/session/components/ConfirmExitDialog/ConfirmExitDialog.tsx` | new | No `.map.ts`/`.hook.ts` — see Decisions. | implementer-b |
| `src/modules/session/components/ConfirmExitDialog/ConfirmExitDialog.test.tsx` | new | tester-b |
| `src/modules/session/components/ConfirmExitDialog/ConfirmExitDialog.preview.tsx` + `.preview.test.tsx` | new | preview-b |
| `src/features/game/dialogs/__tests__/HostLeaveDialog.characterization.test.tsx` | new (deleted end of phase) | tester-a |
| `src/modules/session/components/HostLeaveDialog/HostLeaveDialog.types.ts` | new | implementer-a |
| `src/modules/session/components/HostLeaveDialog/HostLeaveDialog.map.ts` | new | `toHostLeaveDescription`. | implementer-a |
| `src/modules/session/components/HostLeaveDialog/HostLeaveDialog.fixtures.ts` | new | implementer-a |
| `src/modules/session/components/HostLeaveDialog/index.ts`, `src/modules/session/index.ts` | new | Component + module public API (both session components). | implementer-a |
| `src/modules/session/components/HostLeaveDialog/HostLeaveDialog.styles.ts` | new | implementer-b |
| `src/modules/session/components/HostLeaveDialog/HostLeaveDialog.tsx` | new | implementer-b |
| `src/modules/session/components/HostLeaveDialog/HostLeaveDialog.map.test.ts` | new | tester-a |
| `src/modules/session/components/HostLeaveDialog/HostLeaveDialog.test.tsx` | new | tester-b |
| `src/modules/session/components/HostLeaveDialog/HostLeaveDialog.preview.tsx` + `.preview.test.tsx` | new | preview-b |
| `src/features/game/components/GameDialogManager.tsx` | edit | Swap `PositionDialog` import to `@/modules/combat`; `ConfirmExitDialog`/`HostLeaveDialog` to `@/modules/session`. | implementer-b |
| `src/features/game/dialogs/{PositionDialog,ConfirmExitDialog,HostLeaveDialog}.tsx` and their characterization tests | deleted | End of phase — this empties `src/features/game/dialogs/` of all 13 target files. | implementer-b |

Model escalation: none beyond the standing tier-L sonnet override.

### Phase 5 — Verification and docs
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `docs/README.md` | edit | `src/modules/` bullet (add `cards/`, `session/`, extend the `combat/` sentence); `GameDialogManager.tsx` bullet (all 13 now migrated, update the sentence naming which dialogs it still imports from where). | implementer-b |

If any file exceeds 150 counted lines, the owner splits it by responsibility (not arbitrarily) and reports the added file.

## Contracts
```ts
// ======================================================================
// src/modules/shared/player-sprite.ts
// ======================================================================
import type { PlayerColor } from '@/lib/types';
import { PLAYER_DATA } from '@/modules/game-rules';   // not '@/lib/player-data' — see Verified context

// Mirrors the 4 duplicated call sites exactly: PLAYER_DATA[color]?.sprite.idle, falling
// back to '/sprites/blue_idle.gif' when the color has no entry.
export function toPlayerIdleSprite(color: PlayerColor): string;

// src/modules/shared/index.ts
export { toPlayerIdleSprite } from './player-sprite';

// ======================================================================
// src/modules/cards/index.ts (grows across Phase 1 and Phase 2)
// ======================================================================
export { CardsDialog } from './components/CardsDialog';
export { ProductiveCardDialog } from './components/ProductiveCardDialog';
export { SpecialIslandRollDialog } from './components/SpecialIslandRollDialog';
export { AbilitiesDialog } from './components/AbilitiesDialog';
export { SabotageDialog } from './components/SabotageDialog';
export { WealthyDialog } from './components/WealthyDialog';
export { StealResourceDialog } from './components/StealResourceDialog';

// ======================================================================
// src/modules/cards/components/CardsDialog/CardsDialog.types.ts
// ======================================================================
import type { CardName, Player } from '@/lib/types';

export interface CardsDialogProps {
  player: Player;
  onClose: () => void;
  onUseCard: (cardName: CardName) => void;
  canUseCards: boolean;
}

export interface SpecialCardViewModel {
  name: CardName;
  count: number;
  description: string;    // SPECIAL_CARD_DESCRIPTIONS[name] ?? 'No description available.'
  isUsable: boolean;       // USABLE_CARDS.includes(name)
}

export interface CardsDialogViewModel {
  playerName: string;
  cards: SpecialCardViewModel[];       // one entry per unique card name, in first-seen order
  canUseCardAbility: boolean;          // canUseCards && !player.actionsThisTurn.includes(GameAction.UseCard)
}

// CardsDialog.map.ts
// Pure. Mirrors CardsDialog.tsx:28-42 (legacy) exactly.
// Imports USABLE_CARDS, SPECIAL_CARD_DESCRIPTIONS from '@/modules/game-rules' — not '@/lib/card-data'.
export function toCardsDialogViewModel(player: Player, canUseCards: boolean): CardsDialogViewModel;

// CardsDialog.tsx
// 'use client'. No hook — calls toCardsDialogViewModel(props.player, props.canUseCards) directly.
export function CardsDialog(props: CardsDialogProps): JSX.Element;

// ---- CardsDialog.styles.ts: key literal classes (copy the rest verbatim from the legacy file) ----
// Content wrapper, :46 (legacy): 'bg-background/90 backdrop-blur-2xl border border-white/15 shadow-[0_24px_72px_rgba(0,0,0,0.85)] max-w-md sm:max-w-2xl overflow-hidden'
// Use button, :87 (legacy): 'h-7 text-xs px-3 font-bold bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-[0_0_12px_rgba(6,182,212,0.3)]'

// ======================================================================
// src/modules/cards/components/ProductiveCardDialog/ProductiveCardDialog.types.ts
// ======================================================================
import type { ProductiveCardDialogState, ResourceType } from '@/lib/types';

export interface ProductiveCardDialogProps {
  state: ProductiveCardDialogState;
  onConfirm: (selectedResource: ResourceType | null) => void;
  // No onClose — see plan.md Decisions, this dialog is intentionally non-dismissible.
}

export interface ProductiveOptionViewModel {
  resource: ResourceType;
  amount: number;
  sprite: string;          // RESOURCE_SPRITES[resource] || '/sprites/mine.png'
  displayName: string;     // getResourceDisplayName(resource)
  isSelected: boolean;
}

export interface ProductiveCardDialogViewModel {
  options: ProductiveOptionViewModel[];
  confirmLabel: string;    // selected ? `Double ${displayName} Harvest` : 'Harvest Normally (Skip 2x)'
}

// ProductiveCardDialog.map.ts
// Pure. Null exactly when `state` is null (legacy :26).
export function toProductiveCardDialogViewModel(
  state: NonNullable<ProductiveCardDialogState>,
  selectedResource: ResourceType | null,
): ProductiveCardDialogViewModel;

// ProductiveCardDialog.hook.ts
export interface ProductiveCardDialogState_ {
  viewModel: ProductiveCardDialogViewModel | null;  // null when props.state is null
  onSelectResource: (resource: ResourceType) => void;  // toggles: same resource again -> null (legacy :28-30)
  onConfirm: () => void;    // props.onConfirm(selectedResource) — fires with the CURRENT selection, including null
}
export function useProductiveCardDialog(props: ProductiveCardDialogProps): ProductiveCardDialogState_;

// ProductiveCardDialog.tsx
// 'use client'. Renders null when viewModel is null. <AlertDialog open={true}> — no onOpenChange.
export function ProductiveCardDialog(props: ProductiveCardDialogProps): JSX.Element | null;

// ---- ProductiveCardDialog.styles.ts key classes ----
// Selected option, :61-65 (legacy): 'relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 border-emerald-400 bg-emerald-500/20 shadow-[0_0_16px_rgba(16,185,129,0.4)] scale-105'
// Confirm button, :99-101 (legacy): 'w-full font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black shadow-[0_0_16px_rgba(16,185,129,0.3)]'

// ======================================================================
// src/modules/cards/components/SpecialIslandRollDialog/SpecialIslandRollDialog.types.ts
// ======================================================================
import type { SpecialIslandRollDialogState } from '@/lib/types';

export interface SpecialIslandRollDialogProps {
  state: SpecialIslandRollDialogState;
  onRoll: () => void;
  onClose: () => void;
}

export interface SpecialIslandRollViewModel {
  isRolled: boolean;      // roll !== null
  roll: number | null;
  cardDrawn: string | null;
  cardDescription: string | null;   // SPECIAL_CARD_DESCRIPTIONS[cardDrawn] when cardDrawn, else null
}

// SpecialIslandRollDialog.map.ts
// Pure. Null exactly when `state` is null (legacy :23).
// Imports SPECIAL_CARD_DESCRIPTIONS from '@/modules/game-rules' — not '@/lib/card-data'.
export function toSpecialIslandRollViewModel(
  state: NonNullable<SpecialIslandRollDialogState>,
): SpecialIslandRollViewModel;

// SpecialIslandRollDialog.tsx
// 'use client'. No hook — calls the map function directly. Renders null when viewModel is null.
export function SpecialIslandRollDialog(props: SpecialIslandRollDialogProps): JSX.Element | null;

// ---- SpecialIslandRollDialog.styles.ts key classes ----
// Result die (cardDrawn), :59-63 (legacy): 'flex h-16 w-16 items-center justify-center rounded-xl border-2 text-4xl font-black shadow-lg bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.5)]'
// Result die (no card), same lines: 'flex h-16 w-16 items-center justify-center rounded-xl border-2 text-4xl font-black shadow-lg bg-black/60 border-white/20 text-foreground'
// Roll button, :99-105 (legacy): 'w-full font-bold bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-[0_0_16px_rgba(245,158,11,0.3)]'

// ======================================================================
// src/modules/cards/components/AbilitiesDialog/AbilitiesDialog.types.ts
// ======================================================================
import type { AbilityName, GameState, Player } from '@/lib/types';

export interface AbilitiesDialogProps {
  player: Player;
  onClose: () => void;
  onBuyAbility: (abilityName: AbilityName) => void;
  gameState: GameState;
  isMyTurn: boolean;
}

export interface AbilityViewModel {
  name: AbilityName;
  title: string;
  description: string;
  hasAbility: boolean;
  showBuyButton: boolean;   // !hasAbility && isMyTurn
  canAfford: boolean;       // player.resources.gold >= cost
}

export interface AbilitiesDialogViewModel {
  cost: number;
  abilities: AbilityViewModel[];   // filtered to gameState.settings.availableAbilities, legacy order
}

// AbilitiesDialog.map.ts
// Pure. ALL_ABILITIES constant lives here (Explorer/Collector title+description, legacy :36-39).
export function toAbilitiesDialogViewModel(
  gameState: GameState,
  player: Player,
  isMyTurn: boolean,
): AbilitiesDialogViewModel;

// AbilitiesDialog.hook.ts
export interface AbilitiesDialogState {
  viewModel: AbilitiesDialogViewModel;
  onBuyAbility: (ability: AbilityViewModel) => void;  // calls props.onBuyAbility(ability.name); toast success;
                                                         // catch (e: unknown) -> toast destructive with
                                                         // (e instanceof Error ? e.message : 'Unknown error')
  onClose: () => void;
}
export function useAbilitiesDialog(props: AbilitiesDialogProps): AbilitiesDialogState;

// AbilitiesDialog.tsx
export function AbilitiesDialog(props: AbilitiesDialogProps): JSX.Element;

// ---- AbilitiesDialog.styles.ts key classes ----
// Buy button, :93-97 (legacy): 'h-7 text-xs px-3 font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black shadow-[0_0_12px_rgba(16,185,129,0.3)]'
// Active badge, :86 (legacy): 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center gap-1'

// ======================================================================
// src/modules/cards/components/SabotageDialog/SabotageDialog.types.ts
// ======================================================================
import type { Player } from '@/lib/types';

export interface SabotageDialogProps {
  players: Player[];
  onSabotage: (targetPlayerId: number) => void;
  onClose: () => void;
}

export interface SabotageTargetViewModel {
  id: number;
  name: string;
  sprite: string;   // toPlayerIdleSprite(player.color), from @/modules/shared
}

export interface SabotageDialogViewModel {
  targets: SabotageTargetViewModel[];
}

// SabotageDialog.map.ts
export function toSabotageDialogViewModel(players: Player[]): SabotageDialogViewModel;

// SabotageDialog.tsx — no hook, calls the map function directly.
export function SabotageDialog(props: SabotageDialogProps): JSX.Element;

// ======================================================================
// src/modules/cards/components/WealthyDialog/WealthyDialog.types.ts
// ======================================================================
import type { ResourceType } from '@/lib/types';

export interface WealthyDialogProps {
  onSelectResource: (resource: ResourceType) => void;
  onClose: () => void;
}

export interface WealthyOptionViewModel {
  resource: ResourceType;
  sprite: string;
  displayName: string;
}

export interface WealthyDialogViewModel {
  options: WealthyOptionViewModel[];   // fixed [Food, Wood, Gold] order, legacy :22
}

// WealthyDialog.map.ts — no gameState/props dependency; takes no arguments (or none meaningfully varying).
export function toWealthyDialogViewModel(): WealthyDialogViewModel;

// WealthyDialog.tsx — no hook.
export function WealthyDialog(props: WealthyDialogProps): JSX.Element;

// ======================================================================
// src/modules/cards/components/StealResourceDialog/StealResourceDialog.types.ts
// ======================================================================
import type { Player, ResourceType } from '@/lib/types';

export interface StealResourceDialogProps {
  players: Player[];
  onSteal: (targetPlayerId: number, resource: ResourceType) => void;
  onClose: () => void;
}

export interface StealPlayerOptionViewModel {
  id: number;
  name: string;
  sprite: string;           // toPlayerIdleSprite(player.color)
  totalResources: number;   // sum of Object.values(player.resources)
  isSelected: boolean;
}

export interface StealResourceOptionViewModel {
  resource: ResourceType;
  sprite: string;
  displayName: string;
  available: number;
  isAvailable: boolean;     // available > 0
  isSelected: boolean;
}

export type StealResourceStep =
  | { kind: 'player'; options: StealPlayerOptionViewModel[] }
  | { kind: 'resource'; playerName: string; playerId: number; options: StealResourceOptionViewModel[]; canConfirm: boolean };

// StealResourceDialog.map.ts
export function toPlayerOptions(players: Player[], selectedPlayerId: number | null): StealPlayerOptionViewModel[];
export function toResourceOptions(player: Player, selectedResource: ResourceType | null): StealResourceOptionViewModel[];

// StealResourceDialog.hook.ts
export interface StealResourceDialogState {
  step: StealResourceStep;
  onSelectPlayer: (playerId: number) => void;   // also resets selectedResource to null (legacy :29-32)
  onSelectResource: (resource: ResourceType) => void;
  onBack: () => void;         // resets selectedPlayerId only (legacy :161)
  onSteal: () => void;        // props.onSteal(selectedPlayerId!, selectedResource!); no-ops if either is null
  onClose: () => void;
}
export function useStealResourceDialog(props: StealResourceDialogProps): StealResourceDialogState;

// StealResourceDialog.tsx — shell: <AlertDialog open={true}><AlertDialogContent className={styles.content}>
//   {step.kind === 'player' ? <PlayerSelectionStep .../> : <ResourceSelectionStep .../>}
// </AlertDialogContent></AlertDialog>
export function StealResourceDialog(props: StealResourceDialogProps): JSX.Element;

// ---- PlayerSelectionStep.tsx props ----
export interface PlayerSelectionStepProps {
  options: StealPlayerOptionViewModel[];
  onSelectPlayer: (playerId: number) => void;
  onClose: () => void;
}
// ---- ResourceSelectionStep.tsx props ----
export interface ResourceSelectionStepProps {
  playerName: string;
  options: StealResourceOptionViewModel[];
  canConfirm: boolean;
  selectedDisplayName: string | null;   // for the "Steal 2 {name}" button label, null -> 'Resources'
  onSelectResource: (resource: ResourceType) => void;
  onBack: () => void;
  onSteal: () => void;
}

// ======================================================================
// src/modules/combat/components/ArmySelectionDialog/ArmySelectionDialog.types.ts
// ======================================================================
import type { ArmySelectionDialogState, Player } from '@/lib/types';

export interface ArmySelectionDialogProps {
  state: ArmySelectionDialogState;
  player: Player;
  onSelectArmy: (armyId: number) => void;
  onClose: () => void;
  isMyTurn: boolean;
  selectedArmyId?: number | null;
}

export type ArmyStatus = 'acted' | 'positioned' | 'ready';

export interface ArmyOptionViewModel {
  id: number;
  status: ArmyStatus;
  isSelectable: boolean;     // (!army.hasActed || player.hasExtraMove) && isMyTurn
  isSelected: boolean;       // selectedArmyId === army.id
  sprite: string;            // toPlayerIdleSprite(player.color)
}

export interface ArmySelectionViewModel {
  x: number;
  y: number;
  armies: ArmyOptionViewModel[];
}

// ArmySelectionDialog.map.ts — null exactly when `state` is null (legacy :30).
export function toArmySelectionViewModel(
  state: ArmySelectionDialogState,
  player: Player,
  isMyTurn: boolean,
  selectedArmyId: number | null | undefined,
): ArmySelectionViewModel | null;

// ArmySelectionDialog.tsx — no hook, calls the map function directly.
export function ArmySelectionDialog(props: ArmySelectionDialogProps): JSX.Element | null;

// ---- status -> icon/label/color mapping lives in ArmySelectionDialog.styles.ts or inline in the .tsx
// (icon is a component, not a class string, so the .tsx switches on `status` to pick CheckCircle/Anchor/Clock;
// .styles.ts only owns the `colorClass` string per status, e.g. styles.statusColor[status]) ----
// acted: text-muted-foreground | positioned: text-cyan-400 | ready: text-emerald-400 (legacy :35,39,41)

// ======================================================================
// src/modules/combat/components/AttackSelectionDialog/AttackSelectionDialog.types.ts
// ======================================================================
import type { AttackSelectionDialogState } from '@/lib/types';

export interface AttackSelectionDialogProps {
  state: AttackSelectionDialogState;
  onSelectTarget: (armyId: number) => void;
  onClose: () => void;
  isMyTurn: boolean;
}

export interface AttackArmyOptionViewModel {
  id: number;
  status: ArmyStatus;   // reuses ArmySelectionDialog's ArmyStatus union — see note below
  sprite: string;
}

export interface AttackSelectionViewModel {
  defendingPlayerName: string;
  armies: AttackArmyOptionViewModel[];
}

// Note: ArmyStatus is NOT imported across the ArmySelectionDialog/AttackSelectionDialog component
// boundary (component folders are not importable from each other except through the module index,
// and this type is intentionally component-local — the two "Ready" cases differ in meaning, per
// Decisions). AttackSelectionDialog.types.ts defines its own identical-shaped union locally.
export type ArmyStatus = 'acted' | 'positioned' | 'ready';

// AttackSelectionDialog.map.ts — null exactly when `state` is null (legacy :26).
export function toAttackSelectionViewModel(
  state: AttackSelectionDialogState,
  isMyTurn: boolean,
): AttackSelectionViewModel | null;

// AttackSelectionDialog.tsx — no hook.
export function AttackSelectionDialog(props: AttackSelectionDialogProps): JSX.Element | null;

// ======================================================================
// src/modules/combat/components/MonsterSelectionDialog/MonsterSelectionDialog.types.ts
// ======================================================================
import type { MonsterSelectionDialogState } from '@/lib/types';

export interface MonsterSelectionDialogProps {
  state: MonsterSelectionDialogState;
  onSelectTarget: (monsterName: string) => void;
  onClose: () => void;
  isMyTurn: boolean;
}

export interface MonsterOptionViewModel {
  name: string;
  sprite: string;          // monster.sprite.idle, no fallback (legacy has none)
  label: string;           // `${name} (Lvl ${level})`
  powerLabel: string;      // `Power: ${level} Dice`
}

export interface MonsterSelectionViewModel {
  monsters: MonsterOptionViewModel[];
}

// MonsterSelectionDialog.map.ts — null exactly when `state` is null (legacy :24).
export function toMonsterSelectionViewModel(state: MonsterSelectionDialogState): MonsterSelectionViewModel | null;

// MonsterSelectionDialog.tsx — no hook.
export function MonsterSelectionDialog(props: MonsterSelectionDialogProps): JSX.Element | null;

// ======================================================================
// src/modules/combat/components/PositionDialog/PositionDialog.types.ts
// ======================================================================
import type { IslandResource, ResourceType } from '@/lib/types';

export interface PositionDialogProps {
  resources: IslandResource[];
  onSelect: (resource: ResourceType) => void;
  onClose: () => void;
}

export interface PositionOptionViewModel {
  type: ResourceType;
  amount: number;
  sprite: string;        // RESOURCE_SPRITES[type] || '/sprites/mine.png'
  displayName: string;
}

export interface PositionDialogViewModel {
  options: PositionOptionViewModel[];
}

// PositionDialog.map.ts
export function toPositionDialogViewModel(resources: IslandResource[]): PositionDialogViewModel;

// PositionDialog.tsx — no hook. Preserve `data-testid={`position-resource-btn-${type}`}` exactly.
export function PositionDialog(props: PositionDialogProps): JSX.Element;

// ======================================================================
// src/modules/session/index.ts
// ======================================================================
export { ConfirmExitDialog } from './components/ConfirmExitDialog';
export { HostLeaveDialog } from './components/HostLeaveDialog';

// ======================================================================
// src/modules/session/components/ConfirmExitDialog/ConfirmExitDialog.types.ts
// ======================================================================
export interface ConfirmExitDialogProps {
  onConfirm: () => void;
  onClose: () => void;
}

// ConfirmExitDialog.tsx — no .map.ts, no .hook.ts (see Decisions). Static content, forwards both props.
export function ConfirmExitDialog(props: ConfirmExitDialogProps): JSX.Element;

// ======================================================================
// src/modules/session/components/HostLeaveDialog/HostLeaveDialog.types.ts
// ======================================================================
import type { GameStatus } from '@/lib/types';

export interface HostLeaveDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLastPlayer: boolean;
  gameStatus: GameStatus;
}

// HostLeaveDialog.map.ts — pure. Mirrors description() legacy :24-32 exactly.
export function toHostLeaveDescription(gameStatus: GameStatus, isLastPlayer: boolean): string;

// HostLeaveDialog.tsx — no hook, calls toHostLeaveDescription directly.
export function HostLeaveDialog(props: HostLeaveDialogProps): JSX.Element;

// ======================================================================
// src/features/game/components/GameDialogManager.tsx — import-only edits, one block per phase
// ======================================================================
// Phase 1: import { CardsDialog, ProductiveCardDialog, SpecialIslandRollDialog, AbilitiesDialog } from '@/modules/cards';
//   (replaces the 4 corresponding '../dialogs/*' imports)
// Phase 2: import { SabotageDialog, WealthyDialog, StealResourceDialog } from '@/modules/cards';
//   (merge into the same '@/modules/cards' import added in Phase 1)
// Phase 3: import { ArmySelectionDialog, AttackSelectionDialog, MonsterSelectionDialog } from '@/modules/combat';
//   (merge into the existing '@/modules/combat' import from row #3)
// Phase 4: import { PositionDialog } from '@/modules/combat'; import { ConfirmExitDialog, HostLeaveDialog } from '@/modules/session';
// No JSX in GameDialogManager.tsx changes in any phase (verified byte-for-byte against the call sites quoted
// in Verified context — every prop name and shape matches the new components exactly).
```

## Phases
### Phase 1: cards domain, batch 1 — CardsDialog, ProductiveCardDialog, SpecialIslandRollDialog, AbilitiesDialog
1. (tester-a) Characterization tests for all 4, against the current legacy files; run, must pass unmodified.
2. (tester-a) Trim `ResourceDialogs.test.tsx` (remove the `ProductiveCardDialog` block only); run, must still pass against the legacy `WealthyDialog`/`StealResourceDialog`.
3. (implementer-a) `.types.ts`/`.map.ts` for all 4; `.hook.ts` for `ProductiveCardDialog` and `AbilitiesDialog`.
4. (tester-a) `.map.test.ts` for all 4; `.hook.test.ts` for the 2 with hooks. Run all.
5. (implementer-a) `.fixtures.ts`, component `index.ts` for all 4; `src/modules/cards/index.ts`.
6. (implementer-b) `.styles.ts`, `.tsx` for all 4.
7. (tester-b) `.test.tsx` for all 4, porting characterization + the `ProductiveCardDialog` case from `ResourceDialogs.test.tsx`. Run against the new components.
8. (preview-a) `.preview.tsx` + `.preview.test.tsx` for all 4; register in `src/testbed/registry.ts`.
9. (implementer-b) Swap the 4 imports in `GameDialogManager.tsx` to `@/modules/cards`.
10. Run `npx jest src/modules/cards src/features/game/components src/features/game/dialogs/__tests__`; all green.
11. ui-verify: screenshot every new preview state; click every close control.
12. (implementer-b) Delete the 4 legacy files and their characterization tests.
13. `npm run typecheck`, `npm run lint`, `npm test`.

Model escalation: sonnet (standing tier-L override). `AbilitiesDialog`'s toast/unknown-cast handler is the one piece worth double-checking.

### Phase 2: cards domain, batch 2 — SabotageDialog, WealthyDialog, StealResourceDialog
1. (implementer-a) `src/modules/shared/player-sprite.ts`; (tester-a) `player-sprite.test.ts`; (implementer-a) `src/modules/shared/index.ts`.
2. (tester-a) Characterization tests for all 3, against the current legacy files.
3. (implementer-a) `.types.ts`/`.map.ts` for all 3 (`SabotageDialog`/`StealResourceDialog`'s maps import `toPlayerIdleSprite`); `.hook.ts` for `StealResourceDialog`.
4. (tester-a) `.map.test.ts` for all 3; `.hook.test.ts` for `StealResourceDialog`. Run all.
5. (implementer-a) `.fixtures.ts`, component `index.ts`s; add all 3 to `src/modules/cards/index.ts`.
6. (implementer-b) `.styles.ts`, `.tsx` for `SabotageDialog`/`WealthyDialog`; `StealResourceDialog.tsx` (shell) + `PlayerSelectionStep.tsx` + `ResourceSelectionStep.tsx` for the split component.
7. (tester-b) `.test.tsx` for all 3, porting the 2 remaining `ResourceDialogs.test.tsx` cases plus the new characterization cases. Run.
8. (preview-b) `.preview.tsx` + `.preview.test.tsx` for all 3; register in `src/testbed/registry.ts`; remove the legacy `sabotageDialogPreview` import/entry; delete `src/testbed/legacy/SabotageDialog.preview.tsx` and `.preview.test.tsx`.
9. (implementer-b) Swap the 3 imports in `GameDialogManager.tsx` into the existing `@/modules/cards` import.
10. Run `npx jest src/modules/cards src/modules/shared src/features/game/components src/testbed`; all green. Confirm `ResourceDialogs.test.tsx` no longer exists.
11. ui-verify: screenshot every new/replaced preview state; click every close control.
12. (implementer-b) Delete the 3 legacy files and their characterization tests.
13. `npm run typecheck`, `npm run lint`, `npm test`.

Model escalation: sonnet, with extra care on `StealResourceDialog`'s split (same risk tier as row #3's `MonsterCombatDialog`) and on `toPlayerIdleSprite` being imported correctly through `@/modules/shared` (not a deep path) from both this phase's and Phase 3's components.

### Phase 3: combat domain, batch 1 — ArmySelectionDialog, AttackSelectionDialog, MonsterSelectionDialog
1. (tester-a) Characterization tests for all 3.
2. (implementer-a) `.types.ts`/`.map.ts` for all 3 (`ArmySelectionDialog`/`AttackSelectionDialog`'s maps import `toPlayerIdleSprite` from `@/modules/shared`). No hooks needed (see Decisions).
3. (tester-a) `.map.test.ts` for all 3. Run.
4. (implementer-a) `.fixtures.ts`, component `index.ts`s; add all 3 to `src/modules/combat/index.ts`.
5. (implementer-b) `.styles.ts`, `.tsx` for all 3.
6. (tester-b) `.test.tsx` for all 3, porting characterization cases. Run.
7. (preview-a) `.preview.tsx` + `.preview.test.tsx` for all 3; register in `src/testbed/registry.ts`.
8. (implementer-b) Swap the 3 imports in `GameDialogManager.tsx` into the existing `@/modules/combat` import.
9. Run `npx jest src/modules/combat src/features/game/components`; all green.
10. ui-verify: screenshot every new preview state; click every close control.
11. (implementer-b) Delete the 3 legacy files and their characterization tests.
12. `npm run typecheck`, `npm run lint`, `npm test`.

Model escalation: sonnet (standing tier-L override); no component-specific risk beyond the shared Decision about keeping the two `getArmyStatus`-shaped maps separate.

### Phase 4: combat domain batch 2 (PositionDialog) + session domain (ConfirmExitDialog, HostLeaveDialog)
1. (tester-a) Characterization tests for all 3.
2. (implementer-a) `PositionDialog.types.ts`/`.map.ts`; `ConfirmExitDialog.types.ts` only (no map); `HostLeaveDialog.types.ts`/`.map.ts`.
3. (tester-a) `.map.test.ts` for `PositionDialog`/`HostLeaveDialog`. Run.
4. (implementer-a) `.fixtures.ts` (`PositionDialog`/`HostLeaveDialog`), component `index.ts`s; add `PositionDialog` to `src/modules/combat/index.ts`; create `src/modules/session/index.ts` with both session components.
5. (implementer-b) `.styles.ts`, `.tsx` for all 3.
6. (tester-b) `.test.tsx` for all 3, porting characterization cases. Run.
7. (preview-b) `.preview.tsx` + `.preview.test.tsx` for all 3; register in `src/testbed/registry.ts`.
8. (implementer-b) Swap `PositionDialog`'s import into the existing `@/modules/combat` import; add a new `@/modules/session` import for `ConfirmExitDialog`/`HostLeaveDialog`.
9. Run `npx jest src/modules/combat src/modules/session src/features/game/components`; all green.
10. ui-verify: screenshot every new preview state; click every close control.
11. (implementer-b) Delete all 3 legacy files and their characterization tests. Confirm `src/features/game/dialogs/` now contains no file from the original 13 (only `__tests__/` residue, if any, checked in Phase 5).
12. `npm run typecheck`, `npm run lint`, `npm test`.

Model escalation: sonnet (standing tier-L override).

### Phase 5: Verification and docs
1. `npm run typecheck`, `npm run lint` (zero warnings), `npm test`, `npm run build`.
2. `grep -rln "features/game/dialogs/\(AbilitiesDialog\|ArmySelectionDialog\|AttackSelectionDialog\|CardsDialog\|ConfirmExitDialog\|HostLeaveDialog\|MonsterSelectionDialog\|PositionDialog\|ProductiveCardDialog\|SabotageDialog\|SpecialIslandRollDialog\|StealResourceDialog\|WealthyDialog\)" src e2e docs .claude CLAUDE.md` returns nothing. `ls src/features/game/dialogs/` shows no file from the 13 (only `__tests__/` if anything legacy remains there, which it should not).
3. `grep -rn "@/modules/cards\|@/modules/combat\|@/modules/session" src/features` shows exactly `GameDialogManager.tsx`.
4. `npx jest src/testbed/registry.test.ts` — slugs unique and kebab-case.
5. Browser smoke (skill `ui-verify`): every testbed preview page for all 13 new components, all states, desktop and mobile. If a live game page is reachable without Firebase credentials, exercise at least one flow through each domain (buy an ability, use a card, select an army/target, leave the match); otherwise state "unverified in browser beyond the testbed" and, if the emulator and Java 21 are available, run `npm run test:e2e -- e2e/gameplay.spec.ts` and report its result (otherwise report it as not run).
6. (implementer-b) Update `docs/README.md` per the File plan.
7. architect-b final review; coordinator commits per phase: `refactor(cards): migrate CardsDialog, ProductiveCardDialog, SpecialIslandRollDialog, AbilitiesDialog to src/modules [phase 1/5]`, `refactor(cards): migrate SabotageDialog, WealthyDialog, StealResourceDialog to src/modules [phase 2/5]`, `refactor(combat): migrate ArmySelectionDialog, AttackSelectionDialog, MonsterSelectionDialog to src/modules [phase 3/5]`, `refactor(combat,session): migrate PositionDialog, ConfirmExitDialog, HostLeaveDialog to src/modules [phase 4/5]`, `docs(dialogs): document the cards and session modules [phase 5/5]`.

## Test plan
- tester-a (logic, first), per component:
  - **Characterization, against the current legacy file**: every branch each dialog's Verified-context row describes — e.g. `AbilitiesDialog`: hasAbility shows the Active badge not the Buy button; `!isMyTurn` hides the Buy button entirely even without the ability; `canAfford=false` disables Buy; a thrown error from `onBuyAbility` produces a destructive toast with the thrown message. `ArmySelectionDialog`/`AttackSelectionDialog`: each of the 3 statuses renders its icon+label+color; `isSelectable`/disabled-click behavior per the differing rules (the `hasExtraMove` exception only on `ArmySelectionDialog`); `null` state renders nothing. `CardsDialog`: card tally groups duplicates with the right count; `Use` button appears only when usable AND `canUseCardAbility`; empty-card state message. `ConfirmExitDialog`/`HostLeaveDialog`: `HostLeaveDialog`'s 3 description branches (`Playing` / `isLastPlayer` / neither); both buttons call the right handler. `MonsterSelectionDialog`/`PositionDialog`: label/power-label and sprite-per-resource correctness; `data-testid`s present on `PositionDialog`. `ProductiveCardDialog`: toggle-off re-selecting the same option; confirm fires with `null` when nothing selected; no `onClose` exists on the component at all. `SabotageDialog`/`WealthyDialog`: sprite per player/resource; click calls the right handler with the right id/resource. `SpecialIslandRollDialog`: pre-roll shows the dice icon and Roll button; post-roll with/without a card shows the right banner and description; Close only appears once rolled. `StealResourceDialog`: player step -> resource step; Back returns to player step with the player selection cleared from view but reselecting the same player preserved (per legacy, `selectedPlayer` state persists across Back since only `setSelectedPlayer(null)` network — confirm against legacy exactly); unavailable (0) resources are disabled; Steal button disabled until a resource is chosen.
  - **`.map.test.ts`**: every pure branch above expressed as input → output assertions on the map function(s), not the rendered DOM — null/empty inputs, every status/branch value, sprite fallback triggering only when `PLAYER_DATA[color]` is literally absent (construct a fixture with an unlisted color value cast through the module's own type, not `as any`).
  - **`.hook.test.ts`** (`ProductiveCardDialog`, `AbilitiesDialog`, `StealResourceDialog`): initial state; each setter; derived handlers call the right prop function with the right computed payload; no-ops where applicable (`StealResourceDialog.onSteal` with nothing selected).
  - `player-sprite.test.ts`: returns the right idle sprite for a color present in `PLAYER_DATA`; returns `/sprites/blue_idle.gif` only when absent.
- tester-b (view and e2e):
  - `.test.tsx` per component: ported characterization assertions against the new component + its `.fixtures.ts`, by role/text, not snapshot.
  - `.preview.test.tsx` per component (per the established `testbed-preview` pattern): every state that occludes the page closes via its own or the fallback close control, and a "Reopen" trigger appears.
  - e2e: run `npm run test:e2e -- e2e/gameplay.spec.ts` in Phase 5 if the emulator and Java 21 are available; otherwise report "not run" — no new spec (no new user-visible flow, pure refactor).

## Preview states
- `CardsDialog` (group "Cards"): No cards; Several cards, none usable (no special-card action yet this turn's gate off); Usable cards, can use; Usable cards, already used one this turn.
- `ProductiveCardDialog` (group "Cards"): No selection (default); Food selected; Toggle-off back to none.
- `SpecialIslandRollDialog` (group "Cards"): Not yet rolled; Rolled 3/6 with a card; Rolled other, no card.
- `AbilitiesDialog` (group "Cards"): Neither ability owned, can afford both; Neither owned, cannot afford; One owned, one buyable; Not my turn (no Buy buttons at all).
- `SabotageDialog` (group "Cards"): Two opponents; Full grid (4 opponents); Long player name truncation. (Ported from the legacy preview's 3 states.)
- `WealthyDialog` (group "Cards"): Default (3 resources).
- `StealResourceDialog` (group "Cards"): Player selection step; Resource step, all available; Resource step, one unavailable (0 units); Resource selected, ready to steal.
- `ArmySelectionDialog` (group "Combat"): All ready; Mixed statuses (acted/positioned/ready); One selected; Not my turn.
- `AttackSelectionDialog` (group "Combat"): All ready; Mixed statuses; Not my turn.
- `MonsterSelectionDialog` (group "Combat"): Single monster; Multiple monsters, mixed levels; Not my turn.
- `PositionDialog` (group "Combat"): Single resource; Multiple resource types.
- `ConfirmExitDialog` (group "Session"): Default.
- `HostLeaveDialog` (group "Session"): In-progress game; Last player remaining; Mid-lobby (new host takes over).

## Risks
- Visual drift during Tailwind-class extraction across 13 components. Mitigation: literal strings quoted in Contracts for the trickiest conditional classes, "copy verbatim" for the rest, ui-verify screenshot before every legacy deletion (same mitigation as row #3, now proven).
- `StealResourceDialog`'s split missing the exact "Back resets only `selectedPlayer`, not `selectedResource`" nuance (legacy `:161` calls `setSelectedPlayer(null)` alone — `selectedResource` state is left stale but invisible since the resource step is unmounted; re-selecting the same player does NOT show the stale resource still selected in the legacy code only because `handleSelectPlayer` always also calls `setSelectedResource(null)` (`:29-32`) — i.e. **selecting any player, including re-selecting the one just backed-out from, clears resource selection; "Back" alone does not**). Mitigation: this exact distinction is called out in the Test plan and must be asserted, not assumed.
- `toPlayerIdleSprite`'s fallback literal never actually triggering with real `PlayerColor` data (the type only has 4 values, all present in `PLAYER_DATA`) — its test needs a value outside the type to exercise the fallback branch; this requires a typed cast at the test boundary, not `any` (see `.map.test.ts` note above).
- A map, hook, or styles file exceeding 150 lines beyond the one already-flagged `StealResourceDialog`. Mitigation: split-by-responsibility rule in the File plan; owners report if they hit the cap anywhere else (most likely `AbilitiesDialog.map.ts` given `ALL_ABILITIES` plus the view-model function, or `ArmySelectionDialog.tsx`'s per-army button markup).
- Deleting a legacy file before its full characterization + ported test + ui-verify pass. Mitigation: deletion is the last step of each phase in every phase's step list, consistent with row #3.
- `ResourceDialogs.test.tsx` broken mid-migration if Phase 1 deletes more than just the `ProductiveCardDialog` case, or if Phase 2 forgets to delete the whole file. Mitigation: called out explicitly in Decisions and in each phase's step list.
- Forgetting the `src/testbed/legacy/SabotageDialog.preview.tsx` cleanup (it is not under `src/features/game/dialogs/`, so a search scoped to that folder alone would miss it). Mitigation: called out explicitly in Verified context, Decisions, and Phase 2's step list.

## Review (architect-b)
VERDICT: APPROVED (second pass)

First pass's three hand-back items (`GameDialogManager.tsx` staying legacy, `StealResourceDialog`'s Back-resets-only-`selectedPlayer` nuance, `SabotageDialog` preview deletion in scope) all checked out — findings kept below for the record.

Second pass re-verified the fix for the one blocking finding: re-grepped the revised `plan.md` for `@/lib/card-data` and `@/lib/player-data` — the only remaining hits are inside this review's own first-pass finding text (historical, describing the problem, not a live citation). Every Contract block, Verified-context row, and the Decisions entry now cites `@/modules/game-rules` as the import source for `PLAYER_DATA`/`USABLE_CARDS`/`SPECIAL_CARD_DESCRIPTIONS` (`plan.md:39-41,66,257,304,382`). Cross-checked against the actual current source: read the full import list of all 7 components that could plausibly need these constants (`CardsDialog.tsx`, `SpecialIslandRollDialog.tsx`, `ArmySelectionDialog.tsx`, `AttackSelectionDialog.tsx`, `SabotageDialog.tsx`, `StealResourceDialog.tsx`, `AbilitiesDialog.tsx`) — confirmed all 6 named ones already import from `@/modules/game-rules` today (not `@/lib/*`), and `AbilitiesDialog.tsx` imports neither constant, so architect-a's corrected count of 6 (not 7) is accurate. The plan's citations match the live source, not a future state — approved.

### First-pass findings (resolved)
VERDICT WAS: CHANGES REQUESTED

The three items flagged in the hand-back all check out:
1. **`GameDialogManager.tsx` stays legacy** — re-verified directly against `eslint.config.mjs:50-53,77-96` in this session (not just trusted from row #3): the `legacyUi` restricted-import group is exactly `['@/features/*', '@/features/**']`, applied to every file matching `MODULE_FILES` (`src/modules/**/*.{ts,tsx}`, `:78`) except `src/modules/**/*.hook.ts` (`:88-96`, which only re-applies `firestore`+`deepModuleImport`). `GameDialogManager.tsx` is a `.tsx` that calls `useGameBoard()` directly in its own body (per the Verified-context row, `:24-34`) and renders JSX — it could never become a module `.tsx` without first splitting into a hook + view (out of scope per triage, `triage.md:29-33,56-58`, "must not be re-litigated"). Reasoning holds.
2. **`StealResourceDialog` "Back resets only `selectedPlayer`"** — re-verified against `src/features/game/dialogs/StealResourceDialog.tsx`: `handleSelectPlayer` (`:29-32`) always calls both `setSelectedPlayer` and `setSelectedResource(null)`; the Back button (`:161`) calls only `setSelectedPlayer(null)`. The only path back into the resource step is through `handleSelectPlayer` (clicking a player card), which always clears `selectedResource` again, so the stale value never surfaces — exactly as plan.md's Risks entry (`:860`) and the hook contract (`onBack` resets `selectedPlayerId` only at `:537`; `onSelectPlayer` resets both at `:536`) describe. Correct and the two handlers are usefully kept distinct in the contract so a builder can't collapse them into one.
3. **`SabotageDialog.preview.tsx`/`.preview.test.tsx` deletion in Phase 2** — confirmed in scope: `src/testbed/legacy/SabotageDialog.preview.tsx:4` imports `SabotageDialog` from `@/features/game/dialogs/SabotageDialog`, and `src/testbed/registry.ts:2,10` registers it. Once Phase 2 deletes the legacy `SabotageDialog.tsx` (File plan, `:165`), this preview would import a deleted file if left behind. Phase 2's File plan (`:137-139`) and step list (`:782`) both already cover the preview, its test, and the registry edit. In scope, correctly sequenced.

New finding, not in the hand-back, found by re-running the old-path grep repo-wide (including other tasks' untracked folders) as this stage requires:
- **Untracked sibling task `docs/ai/tasks/2026-10-03-game-rules-core-migration/plan.md` (Status: APPROVED) edits six of the exact same legacy dialog files this plan also touches, on the same import lines, and this plan never mentions it.** Its File plan (`game-rules-core-migration/plan.md:64-72`) repoints `CardsDialog.tsx:4`, `SpecialIslandRollDialog.tsx:14`, `AttackSelectionDialog.tsx:15`, `SabotageDialog.tsx:15`, `ArmySelectionDialog.tsx:16`, `StealResourceDialog.tsx:17` from `@/lib/card-data`/`@/lib/player-data` to `@/modules/game-rules`, and its acceptance criteria require `src/lib/card-data.ts` and `src/lib/player-data.ts` to stop existing entirely. I confirmed `src/modules/game-rules/card-data.ts` and `player-data.ts` already exist (55 lines each, identical to the still-present `src/lib/` originals) and are exported from `src/modules/game-rules/index.ts:1-2` (`SPECIAL_CARD_DESCRIPTIONS`, `USABLE_CARDS`, `PLAYER_DATA`) — that task's Phase 1 has created the module copies but not yet repointed importers or deleted the legacy originals (its `progress.md` shows Phase 1 implementation unchecked). This plan's Verified context (`:40-41`) and five Contract blocks cite `PLAYER_DATA` from `src/lib/player-data.ts:18` and `USABLE_CARDS`/`SPECIAL_CARD_DESCRIPTIONS` from `src/lib/card-data.ts:29,41` as the import source for the new module components (`AbilitiesDialog`, `CardsDialog`, `SpecialIslandRollDialog`, `SabotageDialog`, `StealResourceDialog`, `ArmySelectionDialog`, `AttackSelectionDialog` — all 7 of this plan's components that need either constant). If `game-rules-core-migration` finishes (deleting `src/lib/card-data.ts`/`player-data.ts`) before, after, or interleaved with any phase of this plan, every one of those new `.map.ts`/`.hook.ts` files importing `@/lib/card-data`/`@/lib/player-data` breaks — and nothing in either plan sequences the two tasks or tells a builder which import path to use.
  - **Fix**: add a row to Verified context recording that `@/modules/game-rules` already re-exports `PLAYER_DATA`, `USABLE_CARDS`, `SPECIAL_CARD_DESCRIPTIONS` (confirmed above), and change every Contract/File-plan reference for these 7 components to import them from `@/modules/game-rules` (a normal cross-module import through its public index, not a deep path — allowed) instead of `@/lib/card-data`/`@/lib/player-data`. This makes the new dialog components correct regardless of when `game-rules-core-migration` deletes the legacy originals, and is strictly simpler than adding cross-task sequencing. Add one line to Decisions recording why (avoids a future break from an independent, already-approved sibling task). No phase count or file-plan structure change needed beyond this import-source correction.

Everything else holds: domain grouping is sensible and matches the component-architecture example list; the `StealResourceDialog` split and `shared/player-sprite.ts` extraction are justified by real duplication past the third-copy threshold with a correctly-rejected `getArmyStatus`/`RESOURCE_SPRITES` over-extraction; the per-component file-set minimalism (no speculative hooks/maps) is consistent with kiss-dry-solid; phases are appropriately small (one domain batch each, previews alternating preview-a/preview-b); the `ResourceDialogs.test.tsx` split-across-phases sequencing avoids the "test imports a deleted file" failure mode called out in lessons-learned; contracts are complete enough for implementer-a/b to work in parallel without guessing a prop shape.

Once the import-source fix above is made, this plan is approvable without another full pass — re-approve on confirmation the Contracts/File-plan lines were updated.
