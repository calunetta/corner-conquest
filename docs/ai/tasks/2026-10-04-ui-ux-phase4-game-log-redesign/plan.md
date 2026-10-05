# Plan: Game log readability redesign

Status: APPROVED
Inputs: triage.md, ui-design.md (Final spec)

## Goal and acceptance criteria
(verbatim from ui-design.md's Final spec; unchanged by this plan)
- [ ] A match with only legacy `string` log entries renders every entry exactly as today: plain muted text, no icon, no player-color accent, no turn divider.
- [ ] A match with structured entries spanning two different `turn` values renders a visible "Turn N" divider between them, in document order.
- [ ] A structured entry with both `playerId` and `targetPlayerId` set renders two differently-colored name substrings matching each player's `PlayerColor`, within the same line.
- [ ] With "Show routine activity" off (default), no `isPassive: true` entry appears; a `isMilestone: true` entry still appears even with the toggle off.
- [ ] Toggling "Show routine activity" on reveals previously-hidden passive entries without removing or reordering already-visible ones.
- [ ] The rewritten copy for the six before/after examples matches the "after" text exactly in the relevant reducer's test fixtures.
- [ ] On 390×844, the `GameLog` card's footprint (position and height) is unchanged.
- [ ] A log containing only pre-game (`turn: 0`) structured entries shows zero turn dividers.
- [ ] The declutter toggle has visible text, is keyboard-reachable (Tab + Space/Enter), `aria-checked` exposed.
- [ ] At 390×844 and 375px width, "Event Log" + the Switch + its label render on one line without clipping (verified by ui-verify; shorten label to "Show routine" if clipped — see Decisions).

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `GameState.log: string[]` | `src/lib/types/game.ts:41` | The field this plan changes to `LogEntry[]`. Persisted Firestore field, no schema validator (grepped `src/lib/firebase*` — none). |
| `GameState.turn: number` | `src/lib/types/game.ts:40` | Stamped onto every structured entry at push time. |
| `Player.playerId: string` | `src/lib/types/player.ts:21` | Stamped as the entry's `playerId`/`targetPlayerId`; avoids the name-substring-collision problem. |
| `Player.color: PlayerColor` | `src/lib/types/player.ts:23` | Resolved per entry to pick the text-color class. |
| `PlayerColor` | `src/lib/types/player.ts:4-11` | `'blue'\|'red'\|'purple'\|'yellow'`. |
| `game-setup.reducer.ts` `initializeGame` sets `turn: 0` | `src/modules/game-rules/game-setup.reducer.ts:131` | Source of the turn-0 edge case; entries pushed before `startGame`/`addPlayerToGame`'s full-lobby branch carry `turn: 0`. |
| `game-setup.reducer.ts` `startGame` sets `turn: 1` and pushes one combined message | `src/modules/game-rules/game-setup.reducer.ts:145-152` | Copy fix #3 splits this into two pushes. |
| `addPlayerToGame` | `src/modules/game-rules/player-join.reducer.ts:10-86` | Three pushes at lines 77, 80, 82; line 79 sets `turn: 1` before the second push. |
| `handleEndTurn` / `applyAutomaticCollection` | `src/modules/game-rules/player-turn.reducer.ts:7-129` | 6 push sites: auto-collect (21, passive), sabotage-skip (42, passive), explorer (74, passive), collector (97, passive), milestone win (114, `isMilestone`), turn-transition (117, passive). |
| 61 `log.push` call sites across 14 files | grepped `grep -c "log\.push" src/modules/game-rules/*.ts`, sum = 61 | Full list and per-file counts in "File plan" below. Matches ui-design.md's corrected count. |
| 12 `*.reducer.test.ts` files asserting on `.log` directly | grepped `grep -n "\.log\b" src/modules/game-rules/*.reducer.test.ts` | `card-acquisition`(7 lines), `card-targeted-effects`(1), `bot-turn`(6, indirect — this reducer itself never pushes but asserts on other reducers' output), `game-setup`(1), `combat-player-resolve`(2), `combat-player-roll`(1), `combat-monster-resolve`(2), `island-discovery`(4), `player-turn`(2), `player-join`(2), `player-actions`(3), `resource-position`(1). ui-design.md said "11 files"; actual count including `bot-turn.reducer.test.ts` is 12 — corrected here, not load-bearing. |
| `GameLog.tsx` flat render | `src/modules/hud/components/GameLog/GameLog.tsx:19-23` | `entries.map((entry) => <p>{entry}</p>)` — the exact line this plan's Phase-1 edit and Phase-2 rewrite touch. |
| `GameLog.hook.ts` | `src/modules/hud/components/GameLog/GameLog.hook.ts:1-11` | Only reads `gameState.log`; Phase 2 also reads `gameState.players` and adds toggle state here. |
| `GameLog.map.ts` | `src/modules/hud/components/GameLog/GameLog.map.ts:1-3` | `toGameLogEntries` — reverses only; replaced by Phase-2 pipeline. |
| `GameLog.types.ts` | `src/modules/hud/components/GameLog/GameLog.types.ts:1-3` | `GameLogViewModel.entries: string[]` — the type this plan expands. |
| `GameLog.styles.ts` | `src/modules/hud/components/GameLog/GameLog.styles.ts:1-9` | Existing card/scroll/entry classes, reused unchanged except `entry`. |
| `GameLog.fixtures.ts` | `src/modules/hud/components/GameLog/GameLog.fixtures.ts:1-15` | `emptyLog`, `multiEntryLog` — both become invalid against the new `GameLogViewModel` shape and must be replaced, not kept alongside. |
| `GameLog.preview.tsx` | `src/modules/hud/components/GameLog/GameLog.preview.tsx:1-13` | Two states today; Phase 2 adds more (see Preview states). |
| `PlayerInfo.styles.ts` `playerBorderColors`/`playerBgGlow`/`playerRingColors` | `src/modules/hud/components/PlayerInfo/PlayerInfo.styles.ts:3-22` | The `Record<PlayerColor, string>` shape the new `playerTextColors` helper mirrors (per ui-design.md's Final spec correction). |
| `toPlayerIdleSprite` | `src/modules/shared/player-sprite.ts:1-12`, exported `src/modules/shared/index.ts:1` | Sibling pattern/location for the new shared helper; rejected shape (function, not const object) per the Final spec's correction. |
| `src/modules/game-rules/index.ts` | full file read | Public API of the module; `pushLogEntry`/`toLogMessage` are internal to `game-rules` reducers and tests, not re-exported here (no consumer outside the module needs them — `GameLog` reads `LogEntry` objects directly). |
| `src/lib/types` is a `LEGACY_PATHS` entry | `eslint.config.mjs:14` | `game.ts`/`player.ts` edits aren't subject to the 150-line/module lint rules, but `src/modules/game-rules/*.reducer.ts` files are (not legacy). |
| `max-lines: 150` | `eslint.config.mjs:69` | `game-setup.reducer.ts` is already 152 lines; `player-actions.reducer.ts` is 148. Both are at risk of tripping the limit once `pushLogEntry(state, {...})` calls replace one-line `state.log.push(...)` calls — see Decisions. |
| `Switch` primitive | `src/components/ui/switch.tsx:1-20` | Reused as-is for the declutter toggle; visible-label pattern matches `CustomSettingsSheet.tsx:47` per ui-design.md. |
| `lucide-react` v0.475.0 | `package.json:52`, already imported in `PlayerInfo.tsx`, `MonsterAttackScreen.tsx` | Category icons (`Swords`, `Coins`, `Layers`, `Clock`, `Info`). |
| No e2e spec touches the log | grepped `e2e/*.spec.ts` for `GameLog`/`gameState.log` — zero hits | No e2e changes needed in either phase. |
| No consumer outside `game-rules`/`GameLog` reads `gameState.log` | grepped repo-wide for `.log\b` outside those two locations — zero hits | Confirms the blast radius ui-design.md claimed. |

## Decisions
- **Union type over a stricter rewrite**: `type LogEntry = string | StructuredLogEntry` on `GameState.log`, per ui-design.md. Rejected: a migration script to backfill old entries (matches are short-lived, append-only Firestore documents — not worth it).
- **`pushLogEntry` helper, not 61 bespoke edits**: one function in `src/modules/game-rules/log-entry.ts`, called with a single-line object literal at every site, because reviewing 61 near-identical mechanical edits is only tractable if they're all the same shape. Rejected: a `.reducer.ts`-suffixed name — the helper never returns `state`, it mutates `state.log` in place (same convention the removed `state.log.push(...)` calls already used), so it doesn't fit the "pure `(state,...) => state`" reducer pattern; it stays a plain `log-entry.ts` helper.
- **Category/playerId/targetPlayerId/isPassive/isMilestone assignment is fixed by file, not left to the builder**, to keep the 61-site migration mechanical (table below). Rejected: let implementer-a judge each site — too much room for inconsistent tagging across 61 near-identical calls.
- **Movement entries tagged `category: 'economy'`**: ui-design.md's taxonomy (combat/economy/cards/turn/system) doesn't name a "movement" category and movement isn't combat, cards, turn-transition or system; economy (army logistics) is the closest fit. Rejected: a 6th category — out of scope, not requested by the spec.
- **Combat log entries: `playerId` = winner/attacker, `targetPlayerId` = loser/defender** (not "whoever is listed first in the string"). Rejected: ui-design.md's "winner or loser" ambiguity left as-is — a fixed rule is needed for implementer-a to apply mechanically.
- **Turn divider computed after the declutter filter, as two separate pure functions (`filterVisibleEntries` then `withTurnDividers`)**, not one combined pass. Required by ui-design.md's "dividers driven by turn values present in the *visible* entries, not the hidden ones" — a single pass computed before filtering would divide on the wrong set. Rejected: computing dividers once on the raw list — contradicts that requirement.
- **Message player-name coloring done via text-segment splitting (`toMessageSegments`), not a redesign of the reducer messages into `{template, args}` tuples.** The spec's acceptance criterion requires coloring name substrings inside an already-fully-formatted `message` string; splitting by the resolved player name(s) is the smallest change that satisfies it. Rejected: restructuring every message into structured template/args (would touch all 61 call sites a second time and still needs the same split logic in the view).
- **`playerTextColors` placed in `src/modules/shared/player-text-colors.ts`** as a `Record<PlayerColor, string>`, per ui-design.md's Final-spec correction (mirrors `PlayerInfo.styles.ts`'s pattern, not `player-sprite.ts`'s function shape). Rejected: a `.styles.ts` file inside `GameLog`'s own folder — the mapping is a cross-module lookup like `toPlayerIdleSprite`, not markup specific to one component.
- **Declutter toggle state lives in `GameLog.hook.ts` as local `useState`**, not game-board/Firestore state — it's a per-viewer UI preference, not shared match state. Rejected: lifting it into `GameState` — would require a Firestore write for a purely local display preference.
- **Mobile header-fit label**: build with the spec's full label "Show routine activity" first; ui-verify checks the 375px/390px fit in Phase 2 before calling it done. If clipped, implementer-b shortens to "Show routine" (both already authorized by ui-design.md's Final spec) rather than adding a second header row. Rejected: pre-emptively shortening the label without checking — the Final spec treats the fuller label as the default and the short one as a fallback.
- **`game-setup.reducer.ts` and `player-actions.reducer.ts` line-count risk**: both single-line `pushLogEntry(state, { category: '...', message: ..., ... })` calls stay on one line wherever the original `state.log.push(...)` was one line, so net line delta per site is ~0. `game-setup.reducer.ts` (currently 152 lines, already over the 150-line lint rule before this change) and `player-actions.reducer.ts` (148 lines) are flagged for implementer-a to re-run `npm run lint` on specifically after editing; if either grows past 150, split by responsibility (e.g. move `startGame` out of `game-setup.reducer.ts` into its own file) rather than cramming. Not pre-emptively split here — unverified whether the net-zero line delta holds until the edit is done.
- **Phase split**: 2 phases, as triage proposed. Phase 1 = `game-rules` shape change + `pushLogEntry`/`toLogMessage` helper + all 61 call sites + the 12 reducer test files + the minimal `GameLog` edit needed to keep typechecking and rendering unchanged (`.message`/string extraction only, no icons/colors/dividers/toggle). Phase 2 = `GameLog`'s full consumption (turn dividers, color accents, declutter toggle, icons) + `playerTextColors` + new fixtures/previews. Rejected: 1 phase — ~75 files/call-sites plus a full view rewrite exceeds the ~6-file-per-phase guideline by a wide margin. Rejected: 3 phases (splitting copy fixes out) — the six copy fixes land in the same 5 reducer files already being edited structurally in Phase 1; a third phase would reopen those files for no isolation benefit.

## File plan
### Phase 1 — game-rules structured entries + shared helper (zero visible change)
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/lib/types/game.ts` | edit | Add `LogCategory`, `StructuredLogEntry`, `LogEntry` types; change `GameState.log: string[]` → `LogEntry[]`. | implementer-a |
| `src/modules/game-rules/log-entry.ts` | new | `pushLogEntry(state, input)` (stamps `turn`/`kind`, mutates `state.log`); `toLogMessage(entry)` (extracts display string from either union member, used by tests and Phase-2 map code). | implementer-a |
| `src/modules/game-rules/card-acquisition.reducer.ts` | edit | 11 call sites → `pushLogEntry`; copy fixes #1, #2. | implementer-a |
| `src/modules/game-rules/card-effects.reducer.ts` | edit | 4 call sites → `pushLogEntry`. | implementer-a |
| `src/modules/game-rules/card-targeted-effects.reducer.ts` | edit | 4 call sites → `pushLogEntry`, incl. `targetPlayerId`. | implementer-a |
| `src/modules/game-rules/combat-monster-resolve.reducer.ts` | edit | 4 call sites → `pushLogEntry`, incl. milestone tagging. | implementer-a |
| `src/modules/game-rules/combat-monster-roll.reducer.ts` | edit | 4 call sites → `pushLogEntry`. | implementer-a |
| `src/modules/game-rules/combat-player-resolve.reducer.ts` | edit | 4 call sites → `pushLogEntry`, incl. `targetPlayerId` + milestone. | implementer-a |
| `src/modules/game-rules/combat-player-roll.reducer.ts` | edit | 3 call sites → `pushLogEntry`. | implementer-a |
| `src/modules/game-rules/game-setup.reducer.ts` | edit | 1 call site → 2 `pushLogEntry` calls (copy fix #3); watch 150-line limit (see Decisions). | implementer-a |
| `src/modules/game-rules/island-discovery.reducer.ts` | edit | 6 call sites → `pushLogEntry`, incl. milestone. | implementer-a |
| `src/modules/game-rules/movement.reducer.ts` | edit | 3 call sites → `pushLogEntry`; copy fix #4. | implementer-a |
| `src/modules/game-rules/player-turn.reducer.ts` | edit | 6 call sites → `pushLogEntry`, incl. 4 `isPassive` + 1 milestone. | implementer-a |
| `src/modules/game-rules/player-join.reducer.ts` | edit | 3 call sites → `pushLogEntry`; copy fix #5. | implementer-a |
| `src/modules/game-rules/player-actions.reducer.ts` | edit | 6 call sites → `pushLogEntry`; watch 150-line limit (see Decisions). | implementer-a |
| `src/modules/game-rules/resource-position.reducer.ts` | edit | 2 call sites → `pushLogEntry`. | implementer-a |
| `src/modules/hud/components/GameLog/GameLog.types.ts` | edit | `GameLogViewModel.entries: LogEntry[]` (import `LogEntry` from `@/lib/types`). | implementer-a |
| `src/modules/hud/components/GameLog/GameLog.map.ts` | edit | `toGameLogEntries(logs: LogEntry[]): LogEntry[]` — same reverse, new element type. | implementer-a |
| `src/modules/hud/components/GameLog/GameLog.hook.ts` | edit | Confirm pass-through still compiles against `LogEntry[]`; no logic change. | implementer-a |
| `src/modules/hud/components/GameLog/GameLog.tsx` | edit | Render `typeof entry === 'string' ? entry : entry.message` instead of raw `entry`. Zero visual change. | implementer-b |
| 12 `*.reducer.test.ts` files (listed in Verified context) | edit | Replace direct `.log`/`entry.includes(...)` assertions with `.log.map(toLogMessage)`; update the 6 reworded assertions to match the new copy exactly. | tester-a |
| `src/modules/game-rules/log-entry.test.ts` | new | Unit tests for `pushLogEntry` (stamps `turn`/`kind` correctly, including `turn: 0`) and `toLogMessage` (both union branches). | tester-a |
| `GameLog.map.test.ts` | edit | Add a case: `toGameLogEntries` reverses a list containing both strings and structured entries unchanged in type/order. | tester-a |
| `GameLog.hook.test.ts` | edit | Add a case: a structured entry passes through unchanged. | tester-a |
| `GameLog.test.tsx` | edit | Add cases: a structured entry renders its `.message` text; a legacy string entry still renders unchanged. | tester-b |

### Phase 2 — GameLog consumes structured entries
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/shared/player-text-colors.ts` | new | `playerTextColors: Record<PlayerColor, string>`. | implementer-a |
| `src/modules/shared/index.ts` | edit | Export `playerTextColors`. | implementer-a |
| `GameLog.types.ts` | edit | Full view model: `LogEntryViewModel`, `DisplayedLogEntry`, `LogMessageSegment`, `GameLogViewModel` (see Contracts). | implementer-a |
| `GameLog.map.ts` | edit | `toLogEntryViewModels`, `filterVisibleEntries`, `withTurnDividers`, `toMessageSegments` (see Contracts). | implementer-a |
| `GameLog.hook.ts` | edit | Resolve `gameState.players`; local `showRoutineActivity` state + toggle handler; compose the four map functions; return `GameLogViewModel`. | implementer-a |
| `GameLog.fixtures.ts` | edit | Replace `emptyLog`/`multiEntryLog` (invalid against the new shape) with fixtures for: empty, legacy-only, mixed legacy+structured spanning 2 turns, milestone, passive entries, turn-0-only. | implementer-a |
| `GameLog.tsx` | edit | Category icon map (`Swords`/`Coins`/`Layers`/`Clock`/`Info`, `aria-hidden`), turn-divider rendering (real text, e.g. `role="separator"`), colored message segments, declutter `Switch` + label in `CardHeader`. | implementer-b |
| `GameLog.styles.ts` | edit | Classes for the divider, category icon, milestone trophy accent, toggle row. | implementer-b |
| `src/modules/shared/player-text-colors.test.ts` | new | Confirms all 4 `PlayerColor` keys map to the expected Tailwind class. | tester-a |
| `GameLog.map.test.ts` | edit | Cases for all 4 new functions — see Test plan. | tester-a |
| `GameLog.hook.test.ts` | edit | Toggle on/off behavior, player-name/color resolution, `playerId` not found (no crash, no color). | tester-a |
| `GameLog.test.tsx` | edit | View-level cases — see Test plan. | tester-b |
| `GameLog.preview.tsx` | edit | New preview states — see Preview states. | preview-a |

## Contracts
```ts
// src/lib/types/game.ts — additions, placed near the existing `GameState` type
export type LogCategory = 'combat' | 'economy' | 'cards' | 'turn' | 'system';

export type StructuredLogEntry = {
  kind: 'structured';
  turn: number;             // GameState.turn at push time; 0 = pre-game (lobby)
  category: LogCategory;
  message: string;          // fully-formatted display string, same role as today's plain strings
  playerId?: string;        // acting player's Player.playerId
  targetPlayerId?: string;  // second player referenced (sabotage, steal, combat winner/loser)
  isMilestone?: boolean;    // true only for the 4 game-won lines; always shown, ignores the declutter toggle
  isPassive?: boolean;      // true for routine/automatic entries; hidden by the declutter toggle by default
};

export type LogEntry = string | StructuredLogEntry;

// GameState.log: LogEntry[]  (was: string[])


// src/modules/game-rules/log-entry.ts
export type LogEntryInput = Omit<StructuredLogEntry, 'kind' | 'turn'>;

/** Mutates state.log in place — mirrors the `state.log.push(...)` convention it replaces. */
export function pushLogEntry(state: GameState, input: LogEntryInput): void;

/** Extracts the display string from either union member. */
export function toLogMessage(entry: LogEntry): string;


// Category/playerId/targetPlayerId/isPassive/isMilestone assignment (fixed, apply mechanically):
// | File                                | category | playerId          | targetPlayerId | isPassive sites                          | isMilestone sites |
// |--------------------------------------|----------|--------------------|-----------------|-------------------------------------------|--------------------|
// | card-acquisition.reducer.ts          | cards    | acting player      | —               | none                                      | none |
// | card-effects.reducer.ts              | cards    | acting player      | —               | none                                      | none |
// | card-targeted-effects.reducer.ts     | cards    | acting player      | sabotage/steal target | none                                | none |
// | combat-monster-resolve.reducer.ts    | combat   | attacker           | —               | none                                      | the "won the game" line |
// | combat-monster-roll.reducer.ts       | combat   | attacker           | —               | none                                      | none |
// | combat-player-resolve.reducer.ts     | combat   | winner             | loser           | none                                      | the "won the game" line |
// | combat-player-roll.reducer.ts        | combat   | attacker           | —               | none                                      | none |
// | game-setup.reducer.ts (startGame)    | system then turn | starterName (system push), — (turn push) | — | the split-off turn-transition push | none |
// | island-discovery.reducer.ts          | economy  | discovering player | —               | none                                      | the "won the game" line |
// | movement.reducer.ts                  | economy  | acting player      | —               | none                                      | none |
// | player-turn.reducer.ts               | economy (auto-collect, explorer, collector) / turn (sabotage-skip, turn-transition) | the rotating-in player, or sabotaged player for the skip line | — | auto-collect(21), sabotage-skip(42), explorer(74), collector(97), turn-transition(117) | the "won the game" line(114) |
// | player-join.reducer.ts               | system (full/joined) / turn (turn-transition) | joining/first player, or — for "game is full" | — | the turn-transition push(80) | none |
// | player-actions.reducer.ts            | economy  | acting player      | —               | none                                      | none |
// | resource-position.reducer.ts         | economy  | acting player      | —               | none                                      | none |
// All pushes not listed under isPassive/isMilestone above get neither flag (both undefined/false).


// src/modules/shared/player-text-colors.ts
export const playerTextColors: Record<PlayerColor, string> = {
  blue: 'text-blue-400',
  red: 'text-red-400',
  purple: 'text-purple-400',
  yellow: 'text-yellow-400',
};


// GameLog.types.ts — Phase 2 (replaces the Phase-1 `entries: LogEntry[]` shape)
export type LogEntryViewModel = {
  message: string;
  category: LogCategory | null;        // null for legacy string entries
  isMilestone: boolean;                 // always false for legacy strings
  isPassive: boolean;                   // always false for legacy strings
  turn: number | null;                  // null = legacy entry OR turn 0 (pre-game) — never gets a divider
  playerName?: string;                  // resolved from playerId via gameState.players; absent if not found
  playerColorClass?: string;            // playerTextColors[player.color], paired with playerName
  targetPlayerName?: string;
  targetPlayerColorClass?: string;
};

export type LogMessageSegment = { text: string; colorClass: string | null };

export type DisplayedLogEntry = LogEntryViewModel & {
  turnDividerLabel: string | null;      // e.g. "Turn 5"; rendered immediately before this entry
  segments: LogMessageSegment[];        // `message` split into colored/plain runs
};

export interface GameLogViewModel {
  entries: DisplayedLogEntry[];         // newest first, already filtered and divided
  showRoutineActivity: boolean;
  onToggleShowRoutineActivity: () => void;
}


// GameLog.map.ts — Phase 2, 4 pure functions, composed in this order by the hook
export function toLogEntryViewModels(logs: LogEntry[], players: Player[]): LogEntryViewModel[];
// - reverses `logs` (newest first) first, same as today's toGameLogEntries
// - per entry: legacy string -> { message: entry, category: null, isMilestone: false, isPassive: false, turn: null }
// - structured entry -> turn: entry.turn >= 1 ? entry.turn : null (turn 0 or missing => null)
//   playerName/playerColorClass resolved via players.find(p => p.playerId === entry.playerId); same for target.
//   player not found (left the game, or no playerId) -> playerName/playerColorClass left undefined, no crash.

export function filterVisibleEntries(entries: LogEntryViewModel[], showRoutineActivity: boolean): LogEntryViewModel[];
// - entries.filter(e => e.isMilestone || showRoutineActivity || !e.isPassive)

export function withTurnDividers(entries: LogEntryViewModel[]): (LogEntryViewModel & { turnDividerLabel: string | null })[];
// - iterates the given (already-filtered) list in order; tracks `lastDividedTurn: number | null = null`
// - divider inserted when `entry.turn !== null && entry.turn !== lastDividedTurn`; then lastDividedTurn = entry.turn
// - entries with turn === null never get a divider and never change lastDividedTurn

export function toMessageSegments(entry: LogEntryViewModel): LogMessageSegment[];
// - no playerName/targetPlayerName -> [{ text: entry.message, colorClass: null }]
// - splits `entry.message` on the first occurrence of playerName and/or targetPlayerName (whichever appears
//   earlier in the string goes first); wraps each matched name in { text: name, colorClass: <its colorClass> },
//   with the surrounding text as colorClass: null segments. Name not found in message -> treated as absent.


// GameLog.hook.ts — Phase 2
export function useGameLog(): GameLogViewModel;
// - reads gameState.log and gameState.players from useGameBoard()
// - const [showRoutineActivity, setShowRoutineActivity] = useState(false)
// - raw = toLogEntryViewModels(gameState.log || [], gameState.players)
// - visible = filterVisibleEntries(raw, showRoutineActivity)
// - divided = withTurnDividers(visible)
// - entries = divided.map(d => ({ ...d, segments: toMessageSegments(d) }))
// - onToggleShowRoutineActivity = () => setShowRoutineActivity((v) => !v)
```

## Phases
### Phase 1: game-rules structured log entries + shared helper
1. Add `LogCategory`/`StructuredLogEntry`/`LogEntry` to `src/lib/types/game.ts`; change `GameState.log` type. (implementer-a, sonnet)
2. Create `src/modules/game-rules/log-entry.ts` (`pushLogEntry`, `toLogMessage`). (implementer-a, sonnet)
3. Migrate all 61 call sites across the 14 reducer files per the category/playerId/isPassive/isMilestone table in Contracts, applying copy fixes #1-#5 (fix #6 is "kept as-is", no edit) in the same pass. (implementer-a, sonnet)
4. Minimal `GameLog` edit: `GameLog.types.ts`, `GameLog.map.ts` (type-only), `GameLog.hook.ts` (confirm compiles), `GameLog.tsx` (extract `.message`). (implementer-a for the first three, implementer-b for `.tsx`, sonnet)
5. Update the 12 `*.reducer.test.ts` files' `.log` assertions via `toLogMessage`; write `log-entry.test.ts`; extend `GameLog.map.test.ts`/`GameLog.hook.test.ts`. (tester-a, sonnet)
6. Extend `GameLog.test.tsx` with the two new cases. (tester-b, sonnet)
7. No new preview states needed (zero visual change) — preview-a confirms the existing `GameLog.preview.tsx` still renders both states unchanged.
8. Checks: `npm run typecheck`, `npm run lint`, `npm test`.
9. `ui-verify`: confirm the live `GameLog` card is pixel-identical to before (no visual regression) on desktop and 390×844.

Model escalation: all of steps 1-6 (every builder step; triage escalates every pair to sonnet for this task).

### Phase 2: GameLog consumes structured entries
1. `src/modules/shared/player-text-colors.ts` + barrel export. (implementer-a, sonnet)
2. Full `GameLog.types.ts` + `GameLog.map.ts` rewrite (4 functions per Contracts). (implementer-a, sonnet)
3. `GameLog.hook.ts` rewrite: toggle state, player resolution, composition. (implementer-a, sonnet)
4. `GameLog.fixtures.ts` rewrite (6 fixtures per Test plan/Preview states). (implementer-a, sonnet)
5. `GameLog.tsx` + `GameLog.styles.ts` rewrite: icons, dividers, colored segments, declutter `Switch` in `CardHeader`. (implementer-b, sonnet)
6. Tests: `player-text-colors.test.ts`, extend `GameLog.map.test.ts`/`GameLog.hook.test.ts`. (tester-a, sonnet)
7. Extend `GameLog.test.tsx` per Test plan. (tester-b, sonnet)
8. Preview states per "Preview states" below. (preview-a, sonnet)
9. Checks: `npm run typecheck`, `npm run lint`, `npm test`.
10. `ui-verify`: desktop + 390×844 + 375px-width header fit; apply the label fallback from Decisions if clipped; spot-check color contrast of the 4 `playerTextColors` shades over the card's blurred backdrop.

Model escalation: all steps (every builder step; triage escalates every pair to sonnet).

## Test plan
- tester-a (logic, first):
  - `log-entry.test.ts`: `pushLogEntry` stamps `kind: 'structured'` and `turn: state.turn` (including `turn: 0`); passes through `category`/`message`/`playerId`/`targetPlayerId`/`isMilestone`/`isPassive` unchanged; `toLogMessage` returns the string as-is for a plain string and `.message` for a structured entry.
  - 12 reducer test files: every existing assertion still passes after switching to `toLogMessage`; the 6 copy-fix assertions match the exact "after" text from ui-design.md's Copy section.
  - `player-text-colors.test.ts`: all 4 `PlayerColor` values map to their documented class; no 5th/missing key.
  - `GameLog.map.test.ts`:
    - `toLogEntryViewModels`: legacy string -> `turn: null`, `category: null`; structured entry with `turn: 0` -> `turn: null`; structured entry with `turn: 3` -> `turn: 3`; `playerId` matching a player in the list resolves `playerName`/`playerColorClass`; `playerId` with no match leaves both `undefined` (no throw).
    - `filterVisibleEntries`: `isPassive: true` hidden when `showRoutineActivity` is `false`; shown when `true`; `isMilestone: true` always shown regardless of the flag; non-flagged entries always shown.
    - `withTurnDividers`: two entries with the same `turn` get one divider on the first, none on the second; a `turn: null` entry between two `turn: 5` entries does not duplicate the "Turn 5" divider; an all-`turn: null` list produces zero dividers.
    - `toMessageSegments`: message with only `playerName` set -> 2-3 segments, the name segment carrying `playerColorClass`; message with both `playerName` and `targetPlayerName` -> both colored distinctly; neither name present in `message` (edge case) -> entire message as one uncolored segment, no throw.
  - `GameLog.hook.test.ts`: `onToggleShowRoutineActivity` flips `showRoutineActivity` and re-filters without reordering; default is `false`.
- tester-b (view and e2e):
  - Phase 1 `GameLog.test.tsx` additions: a structured entry (object with `.message`) renders its message text, not `[object Object]`; a legacy string entry renders unchanged.
  - Phase 2 `GameLog.test.tsx`: all-legacy-entries match renders with no icon/color/divider (acceptance criterion 1); entries spanning 2 turns render a "Turn N" text divider in document order (criterion 2); an entry with both `playerId`/`targetPlayerId` renders two elements with different `playerTextColors` classes inside one line (criterion 3); toggle off hides `isPassive` entries but keeps `isMilestone` ones, toggle on reveals them without reordering visible ones (criteria 4-5); an all-`turn: 0` fixture renders zero dividers (new criterion); the `Switch` has visible text, is focusable, and reports `aria-checked`.
  - No e2e spec changes (confirmed no existing spec touches `GameLog`/`gameState.log`).

## Preview states
- `GameLog` (Phase 1): unchanged — `Empty`, `With entries` (both existing fixtures still valid, now typed as `LogEntry[]` containing only strings).
- `GameLog` (Phase 2, replaces the above once the new view model lands):
  - `Empty`: no entries.
  - `Legacy only`: plain strings only — confirms no visual regression.
  - `Mixed, two turns`: legacy strings + structured entries spanning `turn: 1` and `turn: 2` — shows the divider.
  - `With milestone`: includes an `isMilestone: true` win entry, toggle off — stays visible.
  - `Declutter off (default)`: passive entries hidden.
  - `Declutter on`: same data, toggle on — passive entries visible.
  - `Pre-game (turn 0)`: only `turn: 0` structured entries — zero dividers.

## Risks
- The 61-site mechanical migration across 14 files is the highest file-count slice of this task; a missed or miscategorized site is easy to overlook in review. Mitigation: the fixed category/playerId/isPassive/isMilestone table in Contracts removes per-site judgment calls; architect-b's final review re-checks a sample against that table, not just "does it compile."
- `game-setup.reducer.ts`/`player-actions.reducer.ts` crossing the 150-line lint limit mid-edit (see Decisions) — mitigation already specified (split by responsibility if it happens, don't pre-split speculatively).
- `toMessageSegments`' substring approach is fragile if a player's chosen name is a substring of another player's name, or doesn't literally appear in `message` (neither is expected given today's message templates, but player names are player-chosen free text). Mitigation: the "name not found" fallback (whole message as one uncolored segment) is specified above so this degrades to today's plain-text rendering rather than crashing or mis-coloring.
- Mobile header fit at 375px is unverified until ui-verify runs in Phase 2; the fallback (shorten the label) is pre-authorized so a `CHANGES REQUESTED` round-trip isn't needed just for that.

## Review (architect-b)
VERDICT: APPROVED

Spot-checked the riskiest claim (the fixed category/playerId/isPassive/isMilestone table) directly against reducer source, not just trusted the table:
- `grep -c "log\.push" src/modules/game-rules/*.ts` sums to 61 across exactly the 14 files the table names, and the per-file counts (11/4/4/4/4/4/3/1/6/3/6/3/6/2) sum to 61 and match the File plan's per-row counts exactly.
- Read every push site in `combat-player-resolve.reducer.ts:32,67,91/103,94→106` (lines shifted by 1 vs. ui-design.md's `91`/`94`; actual milestone line is 103, "defeated...in battle!" is 106 — not load-bearing, plan doesn't cite these line numbers itself), `combat-monster-resolve.reducer.ts:36,62,65,96`, `player-turn.reducer.ts:21,42,74,97,114,117`, `game-setup.reducer.ts:148-149`, `player-join.reducer.ts:77,79-80,82`, `card-targeted-effects.reducer.ts:14,35,65,67`, `island-discovery.reducer.ts:19,24,30,33,46,49` — every category/playerId/targetPlayerId/isPassive/isMilestone assignment in the Contracts table matches what the message text and surrounding logic actually do at each site. No invented site, no mis-tagged site found.
- `grep -l "\.log\b" src/modules/game-rules/*.reducer.test.ts` returns exactly 12 files, exactly the 12 named in Verified context (including `bot-turn.reducer.test.ts`, confirmed at `bot-turn.reducer.test.ts:30,57,90,126,133,138` — none of its own reducer pushes to `.log`, it asserts on other reducers' output as the plan states). The design doc's "11" is confirmed wrong; plan's correction to 12 is right. `card-effects.reducer.test.ts` and `movement.reducer.test.ts` have zero `.log`-asserting lines (confirmed by grep) despite their reducers pushing to `.log`, so they correctly stay off the File plan's test-edit list.
- `game-setup.reducer.ts` (152 lines) and `player-actions.reducer.ts` (148 lines) line counts confirmed via `wc -l`, matching the plan's 150-line-limit risk note exactly.
- Spot-checked supporting citations: `GameState.turn`/`log` at `src/lib/types/game.ts:40-41`, `Player.playerId`/`color` at `src/lib/types/player.ts:21,23`, `src/components/ui/switch.tsx` exists, `lucide-react` at `^0.475.0` in `package.json`, `PlayerInfo.styles.ts:3-22`'s three `Record<PlayerColor, string>` exports confirmed (the pattern `playerTextColors` is told to mirror), `player-sprite.ts`/`shared/index.ts` confirmed as described, `eslint.config.mjs:14` (`'src/lib/**'`) and `:69` (`max-lines: 150`) confirmed, current `GameLog.*` files (`types.ts`, `map.ts`, `hook.ts`, `tsx`, `styles.ts`, `fixtures.ts`) read in full and match every line-range citation in Verified context. No invented path or symbol found anywhere in the plan.

Design and phasing:
- Phase split (Phase 1: zero-visible-change data-shape migration across 14 reducer files + helper + 12 test files; Phase 2: `GameLog` view consumption) is the right cut — it isolates the highest-file-count, most-mechanical risk (61 near-identical call-site edits) from the view redesign, and nothing in Phase 2 depends on anything Phase 1 doesn't already deliver.
- `pushLogEntry` as a single shared helper instead of 61 bespoke edits is the correct DRY call; the fixed assignment table removes per-site judgment, which is the right tradeoff for a mechanical migration this wide.
- `toMessageSegments`' substring-match approach is scoped with an explicit, tested fallback (name not found → whole message uncolored) rather than crashing or guessing — acceptable given free-text player names are out of this plan's control.
- Turn-divider computation correctly ordered after the declutter filter (two separate pure functions), matching the spec's "dividers driven by visible entries" requirement.
- No simpler alternative found: a `{template, args}` rewrite of all 61 messages would touch every site a second time for no benefit the substring-split doesn't already deliver.

No findings. Nothing in `docs/ai/lessons-learned.md` applies to this change (checked: no existing entries about log entries, reducer push helpers, or player-color helpers).
