# Plan: Player avatar selection from built-in Human Avatars

Status: APPROVED
Inputs: triage.md, ui-design.md (Final spec)

## Goal and acceptance criteria
(Verbatim from ui-design.md Final spec's acceptance-criteria checklist; this list is authoritative for tester-b / ui-verify.)
- [ ] Lobby header shows a "Change Avatar" control (desktop: labeled; mobile: icon-only with `aria-label="Change your avatar"`) next to the commander greeting.
- [ ] Clicking it opens a dialog titled "Choose Your Avatar" with a 5x5 grid of 25 avatar images, each a `<button aria-pressed>` with `aria-label="Avatar {n} of 25"`.
- [ ] Clicking a grid cell visually selects it (amber border, `scale-105`, glow) and no other cell stays selected at the same time.
- [ ] After selecting an avatar and returning to the lobby, the header button's thumbnail reflects the chosen avatar.
- [ ] A player with no avatar chosen still shows today's fallback everywhere (first letter in `LobbyGameRow`, color sprite in `PlayerInfo` and `VictoryDialog`) - no broken image, no empty box.
- [ ] After choosing an avatar and starting/joining a match, `LobbyGameRow`'s avatar stack, `PlayerInfo`'s header avatar, and `VictoryDialog`'s winner avatar (when that player wins) all render the chosen avatar image instead of the fallback, with the existing player-color ring/border unchanged.
- [ ] All 25 grid cells are reachable by Tab and selectable by Enter/Space; the focused cell shows a visible ring.
- [ ] On a 390px-wide viewport, the picker dialog and its 5x5 grid fit without horizontal scroll and without clipping any cell.
- [ ] Forcing the account write to fail (e.g. offline) shows "Couldn't save your avatar. Try again." in `text-destructive` under the grid, and the dialog does not silently close.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `Player` type | `src/lib/types/player.ts:19-47` | gains `avatarId` |
| `createPlayer` | `src/modules/game-rules/player-factory.ts:5-49` | only place that builds a `Player`; needs an `avatarId` param |
| `initializeGame` | `src/modules/game-rules/game-setup.reducer.ts:25-52` (creator), `:70-79` (bots) | creator gets the chosen avatar id; bots get `null` |
| `addPlayerToGame` | `src/modules/game-rules/player-join.reducer.ts:11-56` | the joining player's avatar id flows through here |
| `joinOpenGame` | `src/modules/lobby/services/lobby.service.ts:79-109` | `player` param gains `avatarId` |
| `account.service.ts` | `src/modules/session/services/account.service.ts:71-78` (`findAccountUsername` - pattern to mirror), `:84-89` (`bindUsernameToAccount` - pattern to mirror) | add `findAccountAvatarId`/`setAccountAvatarId` the same way |
| `accounts/{authUid}` rule | `firestore.rules:60-69` | `allow update: if false` today; needs a narrow update rule for `avatarId` only |
| `PlayerContextType` | `src/modules/session/player.types.ts:1-18` | gains `avatarId`, `setAvatarId` |
| `usePlayerProvider` | `src/modules/session/player.hook.ts:17-186` | owns all persistence/session state; `setUsernameCallback` (`:124-167`) and the auth-change effect (`:50-80`) are the patterns to mirror for `avatarId` |
| `useLobby` | `src/modules/lobby/components/Lobby/Lobby.hook.ts:16-168` | `handleCreateGame` (`:64-100`) and `handleJoinGame` (`:102-122`) build the `creator`/`player` objects that need `avatarId`; return value (`:151-167`) gains `avatarPicker` |
| `LobbyViewModel` | `src/modules/lobby/components/Lobby/Lobby.types.ts:8-31` | gains `avatarPicker: AvatarPickerButtonViewModel` |
| `LobbyView` | `src/modules/lobby/components/Lobby/Lobby.tsx:39-48` | header-right block; insert the avatar button between `playerInfo` and `LinkGoogleAccountButtonView` |
| `Lobby.styles.ts` `headerRight` | `src/modules/lobby/components/Lobby/Lobby.styles.ts:14` | `flex flex-wrap items-center justify-end gap-3 self-end sm:self-center` - the picker button reuses this rhythm |
| `LobbyGameRow` | `src/modules/lobby/components/LobbyGameRow/LobbyGameRow.tsx:70-85` | `Avatar`/`AvatarFallback` with `p.name.charAt(0)`; replace with `AvatarImage` when an id is set |
| `LobbyGameRow.map.ts` | `src/modules/lobby/components/LobbyGameRow/LobbyGameRow.map.ts` (has `toSettingsSummaryRows`) | add `toPlayerAvatars` beside it |
| `PlayerInfoViewModel.spriteSrc` | `src/modules/hud/components/PlayerInfo/PlayerInfo.types.ts:36` | rename to `avatarSrc`, resolved in the map |
| `toPlayerInfoViewModel` | `src/modules/hud/components/PlayerInfo/PlayerInfo.map.ts:132-162` (line 149 sets `spriteSrc`) | resolve `avatarSrc` here via the new catalog helper |
| `PlayerInfo.tsx` `Image src` | `src/modules/hud/components/PlayerInfo/PlayerInfo.tsx:34` | reads the renamed field |
| `VictoryViewModel.spriteSrc` | `src/modules/session/components/VictoryDialog/VictoryDialog.types.ts` (via `VictoryDialog.map.ts:5-14`) | same rename |
| `toVictoryViewModel` | `src/modules/session/components/VictoryDialog/VictoryDialog.map.ts:20-31` | resolve `avatarSrc` here |
| `VictoryDialog.tsx` `Image src` | `src/modules/session/components/VictoryDialog/VictoryDialog.tsx:48` | reads the renamed field |
| `toPlayerIdleSprite` | `src/modules/shared/player-sprite.ts:11`, exported `src/modules/shared/index.ts:1` | existing color-sprite fallback, reused unchanged |
| `PLAYER_DATA` | `src/modules/game-rules/player-data.ts`, exported `src/modules/game-rules/index.ts:3` | existing color-sprite fallback used by `PlayerInfo.map.ts:149` |
| Avatar primitives | `src/components/ui/avatar.tsx:8-50` | `Avatar`, `AvatarImage`, `AvatarFallback` (Radix) - `AvatarImage` not currently used anywhere, this task is its first use |
| `CreateGameDialog` faction grid pattern | `src/modules/lobby/components/CreateGameDialog/CreateGameDialog.tsx:61-74`, `.styles.ts` `factionGrid`/`factionButton*` (`CreateGameDialog.styles.ts:24-29`) | the button-grid pattern `AvatarPickerButton` reuses, renamed `avatarGrid`/`avatarCell*` |
| Icon registry | `src/modules/icons/icon-registry.config.json:454` | confirms `id: "users"` exists; no `user`/`face`/`avatar` id |
| `firestore.rules.test.ts` | `firestore.rules.test.ts:1-53` | test harness pattern (`initializeTestEnvironment`, `seedWithRulesDisabled`) to extend |
| `npm run test:rules` | `package.json:17` | `firebase emulators:exec --only firestore ... jest --config jest.rules.config.js` |
| 25 avatar assets | `public/tiny-swords/UI Elements/UI Elements/Human Avatars/Avatars_01.png`..`Avatars_25.png` | confirmed exactly 25 files present |
| `src/testbed/registry.ts` | `src/testbed/registry.ts:1-121` | preview registration list, alphabetically-ish grouped by module; add the new preview and update three existing ones |
| identity task Phase 2 | `docs/ai/tasks/2026-10-09-games-identity-rules/progress.md:17-24` | both phases committed (`3108210`, `4dd74ae`); `accounts/{authUid}` is already keyed by the stable Firebase Auth uid (anonymous or Google) for every client - no open migration to design around |

## Decisions
- `Player.avatarId` is `avatarId?: string | null` (optional), not required, because making it required would force every existing `Player` literal across the codebase (14+ files matching `isVacant: false,`, e.g. game-rules reducer tests) to add the field just to keep typechecking - out of this task's scope. `createPlayer` always sets it explicitly (`null` for bots and for a player with no selection); only `createPlayer`'s one call site per phase changes.
- The avatar catalog (`src/modules/avatars/`) depends on nothing else; `toAvatarSrc(avatarId, colorSpriteSrc)` takes the already-resolved color-sprite fallback as a parameter instead of importing `PLAYER_DATA` itself, so `avatars` has no dependency on `game-rules`. Rejected: resolving the color fallback inside `avatars` (would require importing `game-rules`' `PLAYER_DATA`, a one-way dependency this module doesn't need).
- `avatarId` is persisted at `accounts/{authUid}.avatarId` only for a non-anonymous (Google) account, exactly mirroring the existing `username` persistence (`findAccountUsername`/`bindUsernameToAccount`). A guest keeps it only in React state (`usePlayerProvider`), per the triage-confirmed split; no `accounts/{authUid}` doc is ever created or touched for a guest by this task.
- `firestore.rules` validates the allow-list only on `accounts/{authUid}.avatarId` (the one durable, cross-session source of truth), not on each seated `Player.avatarId` inside a `games/{gameId}` document. Rejected: validating every seat's `avatarId` in the games rule, matching the existing `isGameParticipant` per-index pattern - rejected because no other `Player` field (`color`, `name`, `armies`, ...) is schema-validated in that rule today; adding validation for exactly one new field there is inconsistent with the existing precedent and doubles the rule's complexity for a value that, if wrong, only ever degrades to the fallback rendering (first letter / color sprite), never a gameplay effect.
- The account's `avatarId` update is its own narrow Firestore rule (`accounts/{authUid}` `allow update`, currently `if false`), gated to `affectedKeys().hasOnly(['avatarId'])` plus the allow-list, so `username` stays provably immutable (unchanged "pick once" guarantee) while `avatarId` becomes the one mutable field.
- The "Change Avatar" header control and its dialog are one component, `AvatarPickerButton` (button + dialog + grid), in `src/modules/avatars/components/AvatarPickerButton/`, not split into a separate button and dialog component - they share one open/selection state machine and ui-design.md never describes the dialog as reachable independently of the button.
- `AvatarPickerButton` follows the existing pure-view/connected-component split used elsewhere in `Lobby.hook.ts` (e.g. `useLinkGoogleAccountButton`/`LinkGoogleAccountButtonView`): `useAvatarPickerButton()` is called from `Lobby.hook.ts` and its view model is threaded through `LobbyViewModel.avatarPicker` into the pure `LobbyView`, which renders `AvatarPickerButtonView`. Rejected: a zero-prop connected `AvatarPickerButton` rendered directly inside `LobbyView` (breaks `LobbyView`'s existing purity and the "no zero-prop component that reads a whole context" anti-pattern called out in `kiss-dry-solid`).
- `PlayerInfoViewModel.spriteSrc` and `VictoryViewModel.spriteSrc` are renamed to `avatarSrc` (always a resolved, ready-to-render `src`: the chosen avatar if set, else the existing color sprite) rather than adding a second optional field and resolving the fallback inside the view. Keeps the "map resolves, view renders" rule intact; `LobbyGameRow`'s per-player fallback instead stays `avatarSrc: string | null` (`null` = show the letter) because `AvatarFallback` already is the Radix-idiomatic way to render that case, unlike the other two components, which have no existing fallback-glyph mechanism.
- No changes to `CreateGameDialog.tsx`/`.styles.ts` (ui-design.md Final spec already cut this).

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/avatars/avatar-catalog.ts` | new | `AvatarId` union, `AVATAR_IDS`, `AVATAR_OPTIONS`, `AVATAR_CATALOG`, `isValidAvatarId`, `toAvatarSrc` | implementer-a |
| `src/modules/avatars/avatar-catalog.test.ts` | new | catalog shape, `isValidAvatarId`, `toAvatarSrc` fallback cases | tester-a |
| `src/modules/avatars/index.ts` | new | module public API | implementer-a |
| `src/lib/types/player.ts` | edit | add `avatarId?: string \| null` | implementer-a |
| `src/modules/game-rules/player-factory.ts` | edit | `createPlayer` gains `avatarId` param | implementer-a |
| `src/modules/game-rules/game-setup.reducer.ts` | edit | creator's `avatarId` flows to `createPlayer`; bots pass `null` | implementer-a |
| `src/modules/game-rules/player-join.reducer.ts` | edit | joining player's `avatarId` flows to `createPlayer` | implementer-a |
| `src/modules/game-rules/*.test.ts` (existing tests touching `createPlayer`/`initializeGame`/`addPlayerToGame`) | edit | update call sites/fixtures for the new param | tester-a |
| `src/modules/lobby/services/lobby.service.ts` | edit | `joinOpenGame`'s `player` param gains `avatarId?: string \| null` | implementer-a |
| `src/modules/session/services/account.service.ts` | edit | add `findAccountAvatarId`, `setAccountAvatarId` | implementer-a |
| `src/modules/session/services/account.service.test.ts` | edit | tests for the two new functions | tester-a |
| `src/modules/session/player.types.ts` | edit | `PlayerContextType` gains `avatarId`, `setAvatarId` | implementer-a |
| `src/modules/session/player.hook.ts` | edit | load/persist `avatarId` (account for signed-in, in-memory for guest), restore previous value on a failed write | implementer-a |
| `src/modules/session/player-avatar.hook.ts` | new | `usePlayerAvatar(account)` holds the avatar logic split out of `player.hook.ts` (150-line lint limit); covered through `player.hook.test.ts`, no own test file | implementer-a |
| `src/modules/session/player.hook.test.ts` | edit | new `avatarId`/`setAvatarId` cases, including the failed-write revert | tester-a |
| `src/modules/session/player.provider.test.tsx` | edit | mocked `PlayerContextType` gains `avatarId: null`, `setAvatarId: jest.fn()` (TS2739) | tester-a |
| `firestore.rules` | edit | `isKnownAvatarId(id)` allow-list function; narrow `accounts/{authUid}` `allow update` for `avatarId` only | implementer-a |
| `firestore.rules.test.ts` | edit | update allowed/rejected cases (valid id, invalid id, wrong uid, simultaneous username change rejected) | tester-a |
| `src/modules/hud/components/PlayerInfo/PlayerInfo.types.ts` | edit | `spriteSrc` to `avatarSrc` | implementer-a |
| `src/modules/hud/components/PlayerInfo/PlayerInfo.map.ts` | edit | resolve `avatarSrc` via `toAvatarSrc` | implementer-a |
| `src/modules/hud/components/PlayerInfo/PlayerInfo.map.test.ts` | edit | cases: avatar set, avatar unset (falls back to color sprite) | tester-a |
| `src/modules/hud/components/PlayerInfo/PlayerInfo.fixtures.ts` | edit | rename field in fixtures | implementer-a |
| `src/modules/hud/components/PlayerInfo/PlayerInfo.tsx` | edit | read `viewModel.avatarSrc` | implementer-b |
| `src/modules/hud/components/PlayerInfo/PlayerInfo.test.tsx` | edit | rename field references | tester-b |
| `src/modules/session/components/VictoryDialog/VictoryDialog.types.ts` (inside `VictoryDialog.map.ts`'s `VictoryViewModel`) | edit | `spriteSrc` to `avatarSrc` | implementer-a |
| `src/modules/session/components/VictoryDialog/VictoryDialog.map.ts` | edit | resolve `avatarSrc` via `toAvatarSrc` | implementer-a |
| `src/modules/session/components/VictoryDialog/VictoryDialog.map.test.ts` | edit | cases: avatar set, avatar unset | tester-a |
| `src/modules/session/components/VictoryDialog/VictoryDialog.fixtures.ts` | verify | holds `Player` fixtures (`humanWinner`/`botWinner`), not `VictoryViewModel` literals — no `spriteSrc` reference exists today (verified by grep); confirm no edit is needed rather than hunting for a rename | implementer-a |
| `src/modules/session/components/VictoryDialog/VictoryDialog.tsx` | edit | read `vm.avatarSrc` | implementer-b |
| `src/modules/session/components/VictoryDialog/VictoryDialog.test.tsx`, `VictoryDialog.preview.test.tsx` | verify | neither file references `spriteSrc` today (verified by grep); confirm no edit is needed rather than hunting for a rename | tester-b |
| `src/modules/lobby/components/LobbyGameRow/LobbyGameRow.map.ts` | edit | add `toPlayerAvatars` | implementer-a |
| `src/modules/lobby/components/LobbyGameRow/LobbyGameRow.map.test.ts` | edit | cases: id set (resolves src), id unset/invalid (`null`) | tester-a |
| `src/modules/lobby/components/LobbyGameRow/LobbyGameRow.fixtures.ts` | edit | add a player fixture with an `avatarId` | implementer-a |
| `src/modules/lobby/components/LobbyGameRow/LobbyGameRow.tsx` | edit | render `AvatarImage` via `toPlayerAvatars`, fallback unchanged | implementer-b |
| `src/modules/lobby/components/LobbyGameRow/LobbyGameRow.test.tsx` | edit | avatar-set and no-avatar cases | tester-b |
| `src/modules/lobby/components/Lobby/Lobby.hook.ts` | edit | wire `avatarId` from `usePlayer()` into `creator`/`joinOpenGame` payloads; add `avatarPicker: useAvatarPickerButton()` to the returned view model | implementer-a |
| `src/modules/lobby/components/Lobby/Lobby.types.ts` | edit | `LobbyViewModel` gains `avatarPicker: AvatarPickerButtonViewModel` | implementer-a |
| `src/modules/lobby/components/Lobby/Lobby.tsx` | edit | render `AvatarPickerButtonView` in `styles.headerRight` | implementer-b |
| `src/modules/avatars/components/AvatarPickerButton/AvatarPickerButton.types.ts` | new | `AvatarCellViewModel`, `AvatarPickerButtonViewModel` | implementer-a |
| `src/modules/avatars/components/AvatarPickerButton/AvatarPickerButton.map.ts` | new | `toAvatarCells(selectedId)` | implementer-a |
| `src/modules/avatars/components/AvatarPickerButton/AvatarPickerButton.hook.ts` | new | `useAvatarPickerButton()`: dialog open state, save-in-flight state, error state, calls `usePlayer().setAvatarId` | implementer-a |
| `src/modules/avatars/components/AvatarPickerButton/AvatarPickerButton.fixtures.ts` | new | sample view models: no avatar, avatar chosen, saving, error | implementer-a |
| `src/modules/avatars/components/AvatarPickerButton/AvatarPickerButton.map.test.ts` | new | `toAvatarCells` cases | tester-a |
| `src/modules/avatars/components/AvatarPickerButton/AvatarPickerButton.hook.test.ts` | new | open/select/save-success/save-failure-reverts cases | tester-a |
| `src/modules/avatars/components/AvatarPickerButton/AvatarPickerButton.styles.ts` | new | header button + dialog + grid classes, per ui-design.md Final spec tokens | implementer-b |
| `src/modules/avatars/components/AvatarPickerButton/AvatarPickerButton.tsx` | new | `AvatarPickerButtonView` (pure) + `AvatarPickerButton` (connected one-liner) | implementer-b |
| `src/modules/avatars/components/AvatarPickerButton/AvatarPickerButton.test.tsx` | new | renders, selects a cell, shows error state, keyboard reachability | tester-b |
| `src/modules/avatars/components/AvatarPickerButton/index.ts` | new | component public API | implementer-a |
| `src/modules/avatars/index.ts` | edit (phase 2) | export `AvatarPickerButton`, `AvatarPickerButtonView`, `useAvatarPickerButton`, their types | implementer-a |
| `src/modules/avatars/components/AvatarPickerButton/AvatarPickerButton.preview.tsx` | new | Default (none chosen), Chosen, Saving, Error states | preview-a |
| `src/testbed/registry.ts` | edit | register `avatarPickerButtonPreview` | preview-a |
| `src/modules/hud/components/PlayerInfo/PlayerInfo.preview.tsx` | edit | add an avatar-chosen state | preview-a |
| `src/modules/session/components/VictoryDialog/VictoryDialog.preview.tsx` | edit | add an avatar-chosen state | preview-a |
| `src/modules/lobby/components/LobbyGameRow/LobbyGameRow.preview.tsx` | edit | add a mix of avatar-chosen and fallback players | preview-a |
| `docs/architecture/structure-and-state.md` | edit | document `Player.avatarId` | docs-sync |
| `docs/architecture/systems-and-visuals.md` | edit | document avatar catalog, picker, and the three render surfaces | docs-sync |

## Contracts
```ts
// src/modules/avatars/avatar-catalog.ts
export type AvatarId =
  | 'human-01' | 'human-02' | 'human-03' | 'human-04' | 'human-05'
  | 'human-06' | 'human-07' | 'human-08' | 'human-09' | 'human-10'
  | 'human-11' | 'human-12' | 'human-13' | 'human-14' | 'human-15'
  | 'human-16' | 'human-17' | 'human-18' | 'human-19' | 'human-20'
  | 'human-21' | 'human-22' | 'human-23' | 'human-24' | 'human-25';

export interface AvatarCatalogEntry {
  id: AvatarId;
  /** 1-indexed position; also the ordinal used in "Avatar {position} of 25". */
  position: number;
  /** Bundled asset path, e.g. "/tiny-swords/UI Elements/UI Elements/Human Avatars/Avatars_01.png". */
  src: string;
}

export const AVATAR_IDS: readonly AvatarId[]; // all 25, in catalog order
export const AVATAR_OPTIONS: readonly AvatarCatalogEntry[]; // all 25, in catalog order
export const AVATAR_CATALOG: Record<AvatarId, AvatarCatalogEntry>;

export function isValidAvatarId(id: string | null | undefined): id is AvatarId;

/** Resolves the image to show for a player: the chosen avatar if `avatarId` is a known id,
 *  else `colorSpriteSrc` (the caller's already-computed existing fallback). */
export function toAvatarSrc(avatarId: string | null | undefined, colorSpriteSrc: string): string;

// src/modules/avatars/index.ts
export { AVATAR_IDS, AVATAR_OPTIONS, AVATAR_CATALOG, isValidAvatarId, toAvatarSrc } from './avatar-catalog';
export type { AvatarId, AvatarCatalogEntry } from './avatar-catalog';
export { AvatarPickerButton, AvatarPickerButtonView } from './components/AvatarPickerButton';
export { useAvatarPickerButton } from './components/AvatarPickerButton';
export type { AvatarPickerButtonViewModel, AvatarCellViewModel } from './components/AvatarPickerButton';

// src/modules/avatars/components/AvatarPickerButton/AvatarPickerButton.types.ts
import type { AvatarId } from '../../avatar-catalog';

export interface AvatarCellViewModel {
  id: AvatarId;
  src: string;
  position: number;
  ariaLabel: string; // `Avatar ${position} of 25`
  isSelected: boolean;
}

export interface AvatarPickerButtonViewModel {
  currentAvatarId: AvatarId | null;
  isDialogOpen: boolean;
  onOpenChange: (open: boolean) => void;
  cells: AvatarCellViewModel[]; // always 25, in catalog order
  isSaving: boolean;
  saveError: string | null; // "Couldn't save your avatar. Try again." when set
  onSelect: (id: AvatarId) => void;
}

// src/modules/avatars/components/AvatarPickerButton/AvatarPickerButton.map.ts
export function toAvatarCells(selectedId: AvatarId | null): AvatarCellViewModel[];

// src/modules/avatars/components/AvatarPickerButton/AvatarPickerButton.hook.ts
export function useAvatarPickerButton(): AvatarPickerButtonViewModel;
// Reads { avatarId, setAvatarId } from usePlayer() (@/modules/session). onSelect(id):
// sets isSaving true, clears saveError, awaits setAvatarId(id), sets isSaving false, and sets
// saveError to the fixed message above when setAvatarId resolves false. Dialog stays open on
// error (no onOpenChange(false) call here).

// src/lib/types/player.ts (Player type, additive)
export type Player = {
  // ...existing fields unchanged...
  /** Stable catalog id ("human-01".."human-25"); absent/null => caller falls back to the
   *  existing color sprite. Never set for a bot. */
  avatarId?: string | null;
};

// src/modules/game-rules/player-factory.ts
export function createPlayer(
  seatIndex: number,
  playerId: string,
  name: string,
  color: PlayerColor,
  isBot: boolean,
  basePos: { x: number; y: number },
  settings: GameSettings,
  debugMode: boolean,
  avatarId?: string | null, // new, defaults to null; callers pass the chosen id or omit for bots
): Player;

// src/modules/game-rules/game-setup.reducer.ts
export function initializeGame(
  gameId: string,
  gameName: string,
  maxPlayers: number,
  creator: { playerId: string; name: string; color: PlayerColor; avatarId?: string | null }, // avatarId new
  numBots: number,
  debugMode?: boolean,
  settings?: GameSettings,
): GameState;
// Bots are created with avatarId omitted (null): createPlayer(..., debugMode) unchanged for bots.

// src/modules/game-rules/player-join.reducer.ts
export function addPlayerToGame(
  gameState: GameState,
  playerInfo: { playerId: string; name: string; avatarId?: string | null }, // avatarId new
): { newGameState: GameState | null; newBaseTile: BaseTileInfo | null };

// src/modules/lobby/services/lobby.service.ts
export async function joinOpenGame(
  gameId: string,
  player: { playerId: string; name: string; avatarId?: string | null }, // avatarId new
): Promise<void>;

// src/modules/session/services/account.service.ts (additive)
/** Reads accounts/{authUid}.avatarId. Returns null if the field or the doc is absent. */
export async function findAccountAvatarId(authUid: string): Promise<string | null>;
/** Merges { avatarId } into accounts/{authUid} without touching `username`. The doc must already
 *  exist (created by claimAccountUsername/bindUsernameToAccount) - see firestore.rules. */
export async function setAccountAvatarId(authUid: string, avatarId: string): Promise<void>;

// src/modules/session/player.types.ts (PlayerContextType, additive)
import type { AvatarId } from '@/modules/avatars';
export interface PlayerContextType {
  // ...existing fields unchanged...
  avatarId: AvatarId | null;
  /** Signed-in account: persists to accounts/{uid}.avatarId, reverts local state and resolves
   *  false on a failed write. Guest: updates local state only, always resolves true. */
  setAvatarId: (avatarId: AvatarId) => Promise<boolean>;
}

// src/modules/hud/components/PlayerInfo/PlayerInfo.types.ts
export interface PlayerInfoViewModel {
  // ...existing fields unchanged, except:
  avatarSrc: string; // was `spriteSrc`; always resolved (chosen avatar or color-sprite fallback)
}

// src/modules/session/components/VictoryDialog/VictoryDialog.map.ts
export interface VictoryViewModel {
  // ...existing fields unchanged, except:
  avatarSrc: string; // was `spriteSrc`
}

// src/modules/lobby/components/LobbyGameRow/LobbyGameRow.map.ts (additive)
import type { Player } from '@/lib/types';
export interface PlayerAvatarViewModel {
  playerId: string;
  name: string;
  color: Player['color'];
  avatarSrc: string | null; // null => render the existing AvatarFallback letter, unchanged
}
export function toPlayerAvatars(players: Player[]): PlayerAvatarViewModel[];

// src/modules/lobby/components/Lobby/Lobby.types.ts (additive)
import type { AvatarPickerButtonViewModel } from '@/modules/avatars';
export interface LobbyViewModel {
  // ...existing fields unchanged, plus:
  avatarPicker: AvatarPickerButtonViewModel;
}
```

## Phases

### Phase 1: Catalog, Player field, persistence, Firestore rules
1. `src/modules/avatars/avatar-catalog.ts` + `index.ts`: build the 25-entry catalog from the exact asset path; `isValidAvatarId`; `toAvatarSrc`. (implementer-a, sonnet)
2. `avatar-catalog.test.ts`: catalog has exactly 25 entries with the right ids/paths/positions; `isValidAvatarId` true/false cases; `toAvatarSrc` with a known id, an unknown id, `null`, `undefined`. (tester-a, sonnet)
3. `src/lib/types/player.ts`: add `avatarId?: string | null`. (implementer-a)
4. `src/modules/game-rules/player-factory.ts`, `game-setup.reducer.ts`, `player-join.reducer.ts`: thread `avatarId` through `createPlayer`/`initializeGame`/`addPlayerToGame` per the Contracts block; bots always get `null`. (implementer-a, sonnet)
5. Update every existing test that calls `createPlayer`, `initializeGame`, or `addPlayerToGame` directly (grep these three names under `src/modules/game-rules/*.test.ts`) so they still typecheck and still assert the right `avatarId` (`null` unless the test explicitly passes one). (tester-a, sonnet)
6. `src/modules/lobby/services/lobby.service.ts`: `joinOpenGame`'s `player` param gains `avatarId`. (implementer-a)
7. `src/modules/session/services/account.service.ts` + its test: `findAccountAvatarId`, `setAccountAvatarId`. (implementer-a / tester-a)
8. `src/modules/session/player.types.ts`, `player.hook.ts` + its test: `avatarId`/`setAvatarId` on `PlayerContextType`; load from the account for a signed-in user (validate with `isValidAvatarId`, default to `null`), keep in-memory only for a guest; on a failed write, revert to the previous `avatarId` and resolve `false`. (implementer-a, sonnet / tester-a, sonnet)
9. `firestore.rules`: add `isKnownAvatarId(id)` (the 25-id allow-list) and a narrow `accounts/{authUid}` `allow update` limited to the `avatarId` key via `diff(resource.data).affectedKeys().hasOnly(['avatarId'])`, plus `isKnownAvatarId(request.resource.data.avatarId)`. `username` stays unreachable by `update` (unchanged `allow update: if false` behavior for every other field, since the diff check rejects any other key). (implementer-a)
10. `firestore.rules.test.ts`: valid-id update succeeds; unknown-id update rejected; update from a non-owner uid rejected; an update that also changes `username` rejected (fails the `hasOnly` check). (tester-a, sonnet)

Model escalation: steps 1-2 and 4-10 (sonnet) - new cross-file contracts and security-rule logic; step 3 and 6 are one-line type edits (haiku acceptable if the override table had allowed it, but triage already set implementer-a/tester-a to sonnet for the whole task).

### Phase 2: Lobby, HUD, victory rendering + header picker
1. `PlayerInfo.types.ts`/`.map.ts`/`.fixtures.ts` and `VictoryDialog.map.ts`/`.fixtures.ts`: rename `spriteSrc` to `avatarSrc`, resolve it via `toAvatarSrc`. (implementer-a, sonnet)
2. `LobbyGameRow.map.ts`/`.fixtures.ts`: add `toPlayerAvatars`. (implementer-a, sonnet)
3. `Lobby.hook.ts`/`.types.ts`: read `avatarId`/`setAvatarId` from `usePlayer()`; pass `avatarId` into `creator`/`joinOpenGame`'s player payload; add `avatarPicker: useAvatarPickerButton()` to the returned view model. (implementer-a, sonnet)
4. `AvatarPickerButton.types.ts`/`.map.ts`/`.hook.ts`/`.fixtures.ts`/`index.ts`, and `avatars/index.ts` updated to export them. (implementer-a, sonnet)
5. `PlayerInfo.tsx`, `VictoryDialog.tsx`: read the renamed `avatarSrc` field - no other changes. (implementer-b)
6. `LobbyGameRow.tsx`: use `toPlayerAvatars`, render `AvatarImage` when `avatarSrc` is non-null, keep `AvatarFallback` unconditionally rendered after it (Radix shows the fallback until/unless the image loads). (implementer-b, sonnet)
7. `Lobby.tsx`: render `<AvatarPickerButtonView {...model.avatarPicker} />` in `styles.headerRight`, between `playerInfo` and the guest-only `LinkGoogleAccountButtonView`. (implementer-b)
8. `AvatarPickerButton.styles.ts`, `AvatarPickerButton.tsx`: header button (desktop labeled `size="sm"` ghost button matching the `Logout` button; mobile `h-11 w-11` icon-only) + `Dialog` with the 5x5 `avatarGrid`/`avatarCell*` classes mirroring `CreateGameDialog`'s `factionGrid`/`factionButton*` tokens, per ui-design.md Final spec. (implementer-b, sonnet)
9. Tests for all of the above (map tests first, then hook test, then view/component tests). (tester-a then tester-b, sonnet)

Model escalation: all of Phase 2 (sonnet per triage overrides) - cross-cutting rename plus a new interactive component.

### Phase 3: Previews, docs, verification
1. `AvatarPickerButton.preview.tsx`: Default (no avatar chosen, icon state), Chosen (thumbnail state), Saving (spinner/disabled Done), Error (destructive text under the grid). Register in `src/testbed/registry.ts`. (preview-a, sonnet)
2. Add an avatar-chosen fixture/state to `PlayerInfo.preview.tsx`, `VictoryDialog.preview.tsx`, `LobbyGameRow.preview.tsx` (mix of chosen and fallback players). (preview-a, sonnet)
3. `docs-sync`: update `docs/architecture/structure-and-state.md` (`Player.avatarId`) and `docs/architecture/systems-and-visuals.md` (catalog, picker, the three render surfaces, the account-vs-guest persistence split). (docs-sync)
4. `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:rules` (needs the Firestore emulator; `npm run test:e2e` not required - no existing e2e spec covers avatar rendering). (architect-b / whichever stage runs checks)
5. `ui-verify` on `/testbed` for `AvatarPickerButton` at 1280x720 and 390x844, and on the Lobby page for the header control at both widths.

## Test plan
- tester-a (logic, first):
  - `avatar-catalog.test.ts`: exactly 25 entries, ids `human-01`..`human-25`, `position` 1..25 in order, `src` matches the real asset path for each; `isValidAvatarId` true for a real id, false for `'human-26'`, `null`, `undefined`, `''`; `toAvatarSrc` returns the catalog src for a known id, the passed-in fallback for an unknown id/`null`/`undefined`.
  - `player-factory`/`game-setup.reducer`/`player-join.reducer` tests: `createPlayer` stores the given `avatarId`; `initializeGame` passes the creator's `avatarId` through and gives every bot `null`; `addPlayerToGame` passes the joining player's `avatarId` through.
  - `account.service.test.ts`: `findAccountAvatarId` returns the stored id, `null` when the field is absent, `null` when the doc doesn't exist; `setAccountAvatarId` calls `setDoc` with `{ avatarId }` and `{ merge: true }`.
  - `player.hook.test.ts`: signed-in account restores a valid stored `avatarId`, discards an invalid one (defaults to `null`); `setAvatarId` on a signed-in account calls `setAccountAvatarId` and resolves `true` on success; on a rejected write, resolves `false` and the state reads back the *previous* `avatarId`, not the attempted one; a guest's `setAvatarId` never calls `setAccountAvatarId` and always resolves `true`.
  - `PlayerInfo.map.test.ts` / `VictoryDialog.map.test.ts`: `avatarSrc` is the catalog image when `avatarId` is set and valid, the existing color-sprite fallback when `avatarId` is `null`/absent/invalid.
  - `LobbyGameRow.map.test.ts`: `toPlayerAvatars` returns `avatarSrc: null` for a player with no `avatarId`, the catalog src for one with a valid id.
  - `AvatarPickerButton.map.test.ts`: `toAvatarCells` returns 25 cells in catalog order; exactly one `isSelected: true` when `selectedId` matches a cell, none selected when `selectedId` is `null`.
  - `AvatarPickerButton.hook.test.ts`: `onSelect` sets `isSaving` true then false around the `setAvatarId` call; on success, `saveError` stays `null`; on failure, `saveError` is set to the exact message and the dialog's `isDialogOpen` is untouched (stays open).
  - `firestore.rules.test.ts`: owner can update `accounts/{uid}.avatarId` to a known id; rejected for an unknown id; rejected for a different uid; rejected when the same write also changes `username`.
- tester-b (view and e2e):
  - `PlayerInfo.test.tsx`/`VictoryDialog.test.tsx`: image `src` reflects `avatarSrc` (rename coverage only, no new behavior).
  - `LobbyGameRow.test.tsx`: a player with an avatar id renders an `img` with that src (and the fallback letter is not visibly shown, per Radix's Image/Fallback mechanics); a player without one renders the fallback letter, unchanged from today.
  - `AvatarPickerButton.test.tsx`: opens the dialog on click; clicking a cell marks it `aria-pressed="true"` and removes `aria-pressed` from the previously selected cell; the error text appears and the dialog stays open when `onSelect`'s underlying promise resolves `false`; every cell is reachable by `Tab` and selectable by `Enter`/`Space` (RTL `userEvent.tab()` + `keyboard('{Enter}')`); `data-avatar-id` on each cell matches its catalog id.
  - No new e2e spec: no existing spec under `e2e/` touches avatar rendering or the lobby header; this task doesn't add one (out of scope per triage, no acceptance criterion needs cross-browser coverage beyond the above).

## Preview states
- `AvatarPickerButton`: Default (no avatar chosen - icon-only thumbnail), Chosen (a sample avatar selected, thumbnail shown), Saving (one cell shows a saving/disabled state, "Done" disabled), Error (destructive error text visible under the grid).
- `PlayerInfo`: existing states unchanged, plus one with `avatarId` set (shows the catalog image instead of the color sprite).
- `VictoryDialog`: existing states unchanged, plus one with the winner's `avatarId` set.
- `LobbyGameRow`: existing states unchanged, plus one game whose players mix a chosen avatar and the fallback letter, to show both side by side.

## Risks
- Asset paths contain literal spaces (`UI Elements`, `Human Avatars`). Mitigate: the catalog builds the path from one `const` base string, and `AvatarPickerButton.preview.tsx` / `ui-verify` must visually confirm the images actually load (a silently-encoded or mis-encoded space would 404 the `<img>` without throwing).
- `Player.avatarId` being optional (not required) means a stale/corrupt value from an older client, or a hand-edited Firestore doc, could reach `toAvatarSrc`/`toPlayerAvatars` as an arbitrary string. Mitigated by `isValidAvatarId` gating every read path (`toAvatarSrc`, `toPlayerAvatars`), not just the write path.
- Phase 1's Firestore rules change needs `npm run test:rules`, which starts the Firestore emulator; confirm it runs in this environment before relying on it as a gate (the identity task's `progress.md:20` notes its own e2e check was skipped for lack of a Java runtime - `test:rules` also needs the emulator, verify separately from `test:e2e`'s Java dependency).

## Review (architect-b)

Re-verified every "Verified context" row and every File plan path by opening the real file: `src/lib/types/player.ts:19-47`, `src/modules/game-rules/player-factory.ts:5-54`, `game-setup.reducer.ts:25-52/70-79`, `player-join.reducer.ts:11-56`, `src/modules/lobby/services/lobby.service.ts:77-107`, `src/modules/session/services/account.service.ts:71-89` (+ `account.service.test.ts` exists), `firestore.rules:60-69` and the full `games/{gameId}` rule, `src/modules/session/player.types.ts:1-18`, `player.hook.ts` (186 lines, `setUsernameCallback` at :124), `src/modules/lobby/components/Lobby/Lobby.hook.ts` (full read), `Lobby.tsx:17-48`, `Lobby.styles.ts:14` (`headerRight`), `LobbyGameRow.tsx` (avatar-stack block), `LobbyGameRow.map.ts` (`toSettingsSummaryRows`), `PlayerInfo.types.ts:36`/`.map.ts:149`/`.tsx:34`, `VictoryDialog.map.ts:5-14,27`/`.tsx:48`, `src/components/ui/avatar.tsx` (`AvatarImage` exported, confirmed unused elsewhere via repo grep), `CreateGameDialog.styles.ts:24-29`/`.tsx:61-74`, `src/modules/icons/icon-registry.config.json` (`id: "users"` present, no `user`/`face`/`avatar` id), `firestore.rules.test.ts:1-30`, `package.json:17` (`test:rules` script text matches exactly), the 25 avatar assets (`ls` confirms `Avatars_01.png`..`Avatars_25.png`, exactly 25), `src/testbed/registry.ts`, `docs/architecture/structure-and-state.md` and `systems-and-visuals.md` (both exist), and the identity task's `progress.md` (both phases committed `3108210`/`4dd74ae`, as cited). Everything matches; no invented path or symbol found. Also re-ran the grep an architect would use to find stale `spriteSrc` consumers (`grep -rln spriteSrc src`): every hit outside `PlayerInfo`/`VictoryDialog` belongs to an unrelated `spriteSrc` field on a different view model (gain-pulse sprite, faction sprite, tile/monster sprite, `LobbyBackground`) — the plan correctly scopes the rename to only `PlayerInfoViewModel.spriteSrc` and `VictoryViewModel.spriteSrc`, not every occurrence of the string.

**The two debatable calls:**

1. **`Player.avatarId` optional, not required.** Sound. Verified `grep -rln "isVacant: false" src` returns 14 files (matches the plan's "14+ files" claim) that build `Player` literals without going through `createPlayer`; none of them would need to change if `avatarId` is optional, but all 14 would need an edit if it were required just to keep typechecking — correctly out of this task's scope per triage. `createPlayer` (the only factory) always sets it explicitly, so production code never has an ambiguous "forgot to set it" state; only hand-built test/fixture literals skip it, and `undefined` already means "no avatar" everywhere it's read (`toAvatarSrc`, `toPlayerAvatars`). Agree with rejecting the alternative.

2. **`firestore.rules` validates the id allow-list only on `accounts/{authUid}.avatarId`, not per-seat `games/{gameId}` `Player.avatarId`.** Sound, and consistent with existing precedent. Read the full `games/{gameId}` match block (`firestore.rules:94-114`): `allow create`/`allow update` check only `isGameParticipant`, with zero schema/field validation on any `Player` field today — not `color`, not `name`, not `armies`. Adding validation for exactly one new field there would be the first and only field-level schema check in that rule, which is the inconsistency the plan's rejection correctly calls out. The blast radius of an unvalidated/corrupt seated `avatarId` is also genuinely capped: `isValidAvatarId` gates every read path (`toAvatarSrc`, `toPlayerAvatars`), so a bad value degrades to today's existing fallback (color sprite / first letter), never a gameplay effect, never an XSS vector (it's used as a lookup key into a static asset map, not interpolated into a URL from the stored string directly — `toAvatarSrc` returns a fixed catalog `src` or the fallback, so an attacker-controlled string value is never reflected into the DOM). Agree with rejecting the alternative.

**Minor findings (non-blocking, folded in directly):**
- File plan rows for `VictoryDialog.fixtures.ts` and `VictoryDialog.test.tsx`/`VictoryDialog.preview.test.tsx` said "rename field references," but `grep -n spriteSrc` on all three files returns zero hits — `VictoryDialog.fixtures.ts` holds `Player` fixtures (`humanWinner`/`botWinner`), not `VictoryViewModel` literals, and the two test files don't reference the field at all. Reworded those three rows in the File plan above to say "verify, no edit expected" instead of "rename," so implementer-a/tester-b don't spend time hunting for a rename that isn't there. Confirmed separately that the Phase 3 "winner's avatarId set" preview state needs no fixture edit either: `VictoryDialog` (`VictoryDialog.tsx:22`) takes `winner: Player` directly and calls `toVictoryViewModel` internally, so preview-a can pass `{ ...humanWinner, avatarId: 'human-01' }` inline, matching the existing inline-override pattern already used for `currentPlayerGoldGainActive` in `PlayerInfo.preview.tsx:10-17`.
- Phase 2 touches roughly 35 files versus the "about 6 files per phase" rule of thumb, bundling a cross-cutting `spriteSrc`→`avatarSrc` rename across three render surfaces with a brand-new interactive component (`AvatarPickerButton`, 11 new files) and the `Lobby` wiring. Not requiring a split: the bulk is the convention's inherent fan-out (one new component folder is 8-11 files minimum per `component-architecture`, and a three-surface rename is mechanical, not complex), the task is already tier L with triage-set phase boundaries, and Phase 2's own step ordering (map/types/fixtures first, then `.tsx` views, then tests) already gives implementer-a/b and tester-a/b a clean internal sequence. If a future revise pass wants tighter checkpoints, splitting Phase 2 into "2a: render-surface renames" and "2b: AvatarPickerButton + Lobby wiring" would work, but the current single phase is still reviewable as one diff and is not grounds for CHANGES REQUESTED.
- `src/modules/session/player.types.ts` takes a type-only import of `AvatarId` from `@/modules/avatars`, while `AvatarPickerButton.hook.ts` (inside `avatars`) takes a value import of `usePlayer` from `@/modules/session`. This is a one-directional dependency at runtime (the type import is erased, no circular `require`/`import` at build time) and passes the `deepModuleImport` lint rule since both go through public indices. Acceptable; noted only so a future reviewer doesn't mistake it for an accidental cycle.

Everything else checks out: contracts are complete and consistent (`createPlayer`'s new trailing optional param doesn't break the existing positional call sites verified in `player-join.reducer.ts` and `VictoryDialog.fixtures.ts`), `PlayerInfoViewModel`/`VictoryViewModel` renames are narrow and map-resolved per the "map resolves, view renders" rule, the picker component follows the pure-view/connected split used elsewhere (`useLinkGoogleAccountButton`/`LinkGoogleAccountButtonView`), test plan puts logic tests before view tests per `testing`, and preview states cover default/chosen/saving/error for the new component plus one avatar-chosen state for each of the three existing render surfaces.

VERDICT: APPROVED
