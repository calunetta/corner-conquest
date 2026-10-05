# UI design: Game log redesign — player clarity, decluttering, turn grouping, copy

No `triage.md` found in this task folder at the time of writing (only `ui-design.md`, copied from the template). Background and scope came from the coordinator's task prompt, which itself cites the audit at `docs/ai/tasks/2026-10-04-ui-ux-review/ui-design.md` finding 7 and the "2026-10-04 decision" note after item 6 of its "Final — prioritized backlog" (both read in full).

## Spec (ui-designer-a)

### Purpose and user story
As a player mid-match, I want the event log to show **who** did **what**, grouped by **when** (turn), with low-signal noise quieted down, in clear consistent wording, so that I can scan "what did my opponents just do" in a few seconds without re-reading every line.

This replaces finding 7's color-only fix. The user confirmed four distinct problems; this spec addresses all four together because the same structural change (entries carry metadata instead of being pre-formatted strings) is the common fix for all of them — color alone would not have fixed clutter, grouping, or wording.

### What the current code actually does (verified)
- `src/lib/types/game.ts:41`: `log: string[]` on `GameState`. Persisted per match in Firestore (one doc per match, per `docs/README.md` architecture).
- `src/lib/types/game.ts:40`: `GameState` already carries `turn: number`. `src/lib/types/player.ts:19-23`: `Player` has a unique `playerId: string` (session id) and `color: PlayerColor` (`'blue'|'red'|'purple'|'yellow'`). **A turn counter already exists in the data model — no new counter field is needed for turn-grouping**, only stamping each pushed entry with the current `state.turn`.
- `src/modules/hud/components/GameLog/GameLog.tsx:19-23`: renders `entries.map((entry) => <p>{entry}</p>)` — flat, undifferentiated, one Tailwind class (`styles.entry`, `GameLog.styles.ts:8`: `'text-xs text-muted-foreground leading-relaxed'`) for every line, newest-first (`GameLog.map.ts:1-3` just reverses the array).
- `GameLog.types.ts:1-3`: `GameLogViewModel.entries: string[]` — no structure anywhere in the HUD pipeline.
- Grepped every `state.log.push(...)` / `newGameState.log.push(...)` call across `src/modules/game-rules/*.ts`: 60 call sites across 14 files (`card-acquisition`, `card-effects`, `card-targeted-effects`, `combat-monster-resolve`, `combat-monster-roll`, `combat-player-resolve`, `combat-player-roll`, `game-setup`, `island-discovery`, `movement`, `player-actions`, `player-turn`, `player-join`, `resource-position` reducers). Close to the ~64 the task prompt cites; the exact count isn't load-bearing for this spec.
- Real message taxonomy found (exact strings, not invented categories):
  - **Combat**: `combat-player-resolve.reducer.ts:32,67,94`: `` `${winner.name} receives 5 VP for defeating ${loser.name}!` ``, `` `🎉 ${winner.name} has reached ${winner.victoryPoints} Victory Points and won the game!` ``, `` `${winner.name} defeated ${loser.name} in battle!` ``. `combat-monster-resolve.reducer.ts:36,65,94`: monster-fight wins/losses, same 🎉 win line. These reference **two players in one line** (winner + loser).
  - **Economy**: deploys, upgrades, resource collection — `player-actions.reducer.ts:109`: `` `${player.name} deployed a new army!` ``; `player-actions.reducer.ts:145`: `` `${player.name} upgraded their army's attack power to ${player.attackPower}.` ``; `player-turn.reducer.ts:21`: `` `${player.name} automatically collected ${collectedStrings.join(', ')}.` `` — this one fires **every turn, for every player**, automatically, with no player decision behind it.
  - **Cards**: `card-acquisition.reducer.ts` (buy/draw, several failure-path lines), `card-targeted-effects.reducer.ts:14,35,65`: sabotage and steal — these also reference **two players** (`` `${player.name} sabotaged ${targetPlayer.name}! They will miss their next turn.` ``, `` `${currentPlayer.name} stole ${stolenAmount} ${payload.resource} from ${targetPlayer.name}!` ``).
  - **Turn transition**: `player-turn.reducer.ts:125`: `` `It's now ${nextPlayer.name}'s turn.` `` and `player-join.reducer.ts:80`: the same pattern — fires **every turn, every match**. `game-setup.reducer.ts:150` combines a system message and a turn-transition in **one** push: `` `${starterName} started the game! It's now ${newState.players[0].name}'s turn.` ``.
  - **System, no player**: `card-acquisition.reducer.ts:21`: `'The deck is empty. Reshuffling the discard pile...'`; `player-join.reducer.ts:77`: `` `The game is full! Starting now.` ``.
  - **Milestone/celebratory**: the three `🎉 ... won the game!` lines above — the only emoji used anywhere in the log, and only for the game-ending event.
- Confirmed the fragility the earlier audit flagged: the `"It's now ${name}'s turn."` string is **not** reliable to parse for grouping (`game-setup.reducer.ts:150` embeds it mid-string after other text, not at the start), and matching by player **name** (not `playerId`) is fragile because names are player-chosen and can collide as substrings. Both problems are avoided below by stamping `turn` and `playerId` directly at push time instead of parsing the message.
- Confirmed the existing player-color convention: `CombatDialog.tsx:99`: `<span style={{ color: winner.color }}>` — the raw `PlayerColor` string value (`'blue'`, `'red'`, …) used as a literal CSS color name inline, not a Tailwind token. `CombatDialog.styles.ts:6,20,21,50` separately uses Tailwind utility classes like `text-red-400`, `text-yellow-300` for specific UI chrome, unrelated to player identity. **There is no existing shared "player color → Tailwind text class" helper** (only `src/modules/shared/player-sprite.ts`'s `toPlayerIdleSprite(color)` for sprites). This spec proposes adding one, mirroring that file's existing pattern (a small pure lookup function, not a new component).
- Confirmed primitives available for reuse: `src/components/ui/switch.tsx` and `src/components/ui/badge.tsx` exist.

### Data shape (type-level, for the architect to place — likely `src/lib/types/game.ts` and a `game-rules` log-entry builder, not `hud`)
```
type LogCategory = 'combat' | 'economy' | 'cards' | 'turn' | 'system';

type StructuredLogEntry = {
  kind: 'structured';
  turn: number;            // GameState.turn at the moment of the push — already exists, just stamp it
  category: LogCategory;
  message: string;         // the fully-formatted display string, same role as today's plain strings
  playerId?: string;       // acting player's Player.playerId (not name — avoids the substring-collision problem)
  targetPlayerId?: string; // second player referenced (sabotage, steal, combat winner/loser) — also by playerId
  isMilestone?: boolean;   // true only for the game-won 🎉 lines; always shown, never hidden by the declutter toggle
  isPassive?: boolean;     // true for routine/automatic entries (see Decluttering below); hidden by the declutter toggle by default
};

// GameState.log entries are a union so legacy data keeps rendering untouched:
type LogEntry = string | StructuredLogEntry;
// GameState.log: LogEntry[]  (was: string[])
```
Rationale for the union over a stricter rewrite: `GameState.log` is a persisted Firestore field (`src/lib/types/game.ts:41`) read by every in-progress match. A plain `string` branch means an old entry pushed before this ships keeps rendering exactly as it does today (muted text, no icon, no color, not part of any turn group) with zero special-casing beyond a `typeof` check in the view mapper — see Migration below.

### Placement and layout
- Desktop (1280×720): unchanged footprint — `GameLog` stays in the `aside` column alongside `ActionsPanel` (`src/features/game/components/GameBoard.tsx`), same `Card` (`GameLog.styles.ts:2`: `bg-background/40 backdrop-blur-xl ...`), same `ScrollArea` height (`GameLog.styles.ts:6`: `h-32 sm:h-36`). This spec changes what renders *inside* the existing card and scroll area, not where the card lives or how big it is — mobile-fit and the "map grid stays visible" rule are already satisfied by the current layout and are not touched here.
- Mobile (390×844): same card, same scroll height. The new toggle (see Decluttering) sits in the existing `CardHeader` row (`GameLog.styles.ts:3`: `header: 'p-3 pb-1'`) next to the "Event Log" title, not as a second row, so no extra vertical space is claimed from the map.
- Turn dividers and entries both live inside the existing scroll area; nothing new is added above or below the card.

### States
| State | What the player sees | Trigger |
|---|---|---|
| Default (mixed legacy + structured entries) | Legacy string entries render exactly as today: plain muted-gray text, no icon, no color, not grouped under any turn divider. Structured entries render with: a small category icon (`aria-hidden`), the acting player's name substring colored in that player's `PlayerColor` text class, a second colored name substring for `targetPlayerId` when present, and are grouped under a "Turn N" divider for their `turn` value. | Component mounts with `gameState.log` containing a mix (realistic for any match that started before this ships) or all-structured (any match started after). |
| Empty | Unchanged from today: empty scroll area, no entries, card header still shows "Event Log" and the toggle. | `gameState.log` is `[]` (new match, no actions yet). |
| Declutter toggle — off (default) | Entries where `isPassive === true` are hidden from the list (the "It's now X's turn" lines and the per-turn "automatically collected…" lines). Milestone entries (`isMilestone === true`) always show regardless. Turn dividers still render (they are driven by `turn` values present in the *visible* entries, not by the hidden ones) so turn grouping survives decluttering. | Default state; matches "too cluttered" complaint by hiding the two call sites that fire every single turn for every player. |
| Declutter toggle — on | All entries render, including passive ones, still grouped by turn and colored. | Player taps the toggle to see full detail. |
| Combat/milestone entry | Renders with a trophy-style accent consistent with `CombatDialog.styles.ts:50`'s `trophyIcon: 'h-5 w-5 text-yellow-400'` treatment scaled down for a log line (icon in `text-yellow-400`, not the player's own color, since it marks a game-level event, not a player action) — the `🎉` character already in the message string is kept as-is; it is not re-implemented as an icon. | `isMilestone: true`. |

### Components and tokens
- Reuse: `Card`, `CardHeader`, `CardTitle`, `CardContent` (`src/components/ui/card.tsx`, already used by `GameLog.tsx:3`), `ScrollArea` (`src/components/ui/scroll-area.tsx`, already used), `Switch` (`src/components/ui/switch.tsx`, verified present) for the declutter toggle, `Badge` (`src/components/ui/badge.tsx`, verified present) as the optional container for the "Turn N" divider label if a simple `<div>` with a border-top isn't sufficient — architect's call, not load-bearing for this spec. Category icons from `lucide-react` (already the project's icon library per the `ui-design` skill): suggested mapping — `Swords` (combat), `Coins` (economy), `Layers` (cards), `Clock` (turn — used only if turn-transition lines are shown via the declutter toggle, since dividers carry the primary turn signal), `Info` (system).
- New, small: a `toPlayerColorTextClass(color: PlayerColor): string` helper (e.g. alongside `src/modules/shared/player-sprite.ts`, same file or a sibling) mapping `'blue' → 'text-blue-400'`, `'red' → 'text-red-400'`, `'purple' → 'text-purple-400'`, `'yellow' → 'text-yellow-400'` — Tailwind token classes, not inline `style={{color}}` (unlike `CombatDialog.tsx:99`'s existing inline-style precedent; token classes are consistent with the `ui-design` skill's "never raw hex / use token classes" rule, and `text-yellow-400`/`text-red-400` are already in use elsewhere in the codebase per `CombatDialog.styles.ts`, so no new colors are introduced).
- Tokens: `text-blue-400`, `text-red-400`, `text-purple-400`, `text-yellow-400` (player name accents — already-used shades, not new), `text-muted-foreground` (category icons, declutter toggle label, legacy/system entries — unchanged from today), existing card/scroll-area tokens unchanged.
- **This spec introduces two new visual elements beyond a single tweak**: (a) the turn-divider grouping, (b) the category icon + player-color-accent + declutter-toggle treatment for structured entries (counted as one combined pattern, since it's one coherent "structured entry" look). That is two, against the skill's "at most one new visual pattern per feature" guidance. Flagged explicitly for ui-designer-b: justified because the task is an explicit redesign addressing four distinct, confirmed complaints at once (not a single polish item), and three of the four complaints (who, clutter, flow) do not resolve without both elements — color alone resolves none of clutter/flow/wording. If reviewer disagrees, the two could split into two sequential phases (dividers first, then the toggle+accents) rather than both landing in the same visual pass.

### Copy
Six concrete before/after fixes, drawn from the real strings grepped above, under one consistent convention: **past tense, active voice, player name as subject of the action; period for routine/neutral events; exclamation reserved for dramatic swings (combat wins/losses, the game-won milestone, sabotage/steal impact); no emoji anywhere except the existing 🎉 reserved for the game-won line only (already true today — not changing).**

1. `card-acquisition.reducer.ts:12`: before `` `${player.name} tried to buy a card, but their hand is full!` `` (failure dressed as exclamation) → after `` `${player.name} tried to buy a card, but their hand was full.` `` (past tense throughout, period — it's a routine failure, not a dramatic one).
2. `card-acquisition.reducer.ts:21`: before `'The deck is empty. Reshuffling the discard pile...'` (present tense, trailing ellipsis, no player) → after `'The deck ran out; reshuffled the discard pile.'` (past tense, matches the convention, drops the ellipsis).
3. `game-setup.reducer.ts:150`: before `` `${starterName} started the game! It's now ${newState.players[0].name}'s turn.` `` (one push, two unrelated facts: a one-time system event and a recurring turn-transition event, which blocks clean turn-grouping and clean `category` tagging) → after **two separate pushes**: `` `${starterName} started the game.` `` (category `system`) and `` `It's now ${newState.players[0].name}'s turn.` `` (category `turn`, `isPassive: true`) — same information, now cleanly categorizable and groupable.
4. `movement.reducer.ts:92`: before `` `${player.name}'s army moved and is no longer positioned on ${removedPosition.resource}.` `` (awkward, states the move as a negative/absence rather than the action) → after `` `${player.name} moved an army off ${removedPosition.resource}.` `` (direct, active).
5. `player-join.reducer.ts:77`: before `` `The game is full! Starting now.` `` (exclamation for a routine state change, no player) → after `` `The game is full. Starting now.` `` (routine system event, period; keep as its own line, category `system`).
6. `card-targeted-effects.reducer.ts:65`: before `` `${currentPlayer.name} stole ${stolenAmount} ${payload.resource} from ${targetPlayer.name}!` `` → **kept as-is, exclamation retained** — this is exactly the "dramatic swing" case (one player taking resources from another) the convention explicitly reserves `!` for; included here as a worked example of the convention's positive case, not a thing to change.

This wording pass is copy-only and can land in the same reducer files as the structural change, or as its own later diff — sequencing call is the architect's, noted below under Scope.

### Interactions and motion
- Declutter toggle: a `Switch` (`src/components/ui/switch.tsx`) with a visible text label "Show routine activity", default unchecked (passive entries hidden). Toggling re-filters the list instantly, no animation needed beyond whatever the `Switch` primitive already does; respects `prefers-reduced-motion` by virtue of being the existing primitive (no new transition is introduced).
- Turn dividers and entries are static once rendered — no new scroll-jump or auto-scroll behavior is introduced; newest-first ordering (`GameLog.map.ts`) is unchanged.
- No new keyboard interaction beyond the `Switch`'s own built-in keyboard support (space/enter to toggle, already part of the Radix primitive).

### Accessibility
- The declutter `Switch` has a visible text label ("Show routine activity"), not an icon-only control — satisfies the "icon-only buttons need `aria-label`" rule by not needing one; `aria-checked` state comes from the `Switch` primitive itself.
- Category icons are `aria-hidden="true"` — the category is never conveyed by icon alone; it's implied by the message text itself (e.g. "deployed a new army" already reads as an economy action without needing the icon to be read aloud).
- Player-name color accents are never the only signal: the player's name text is always present in the message string itself (this is already true of every existing log line — no entry refers to a player by color alone), satisfying "never rely on color alone."
- Turn dividers render as real text content ("Turn 5"), not a bare visual rule/line, so a screen reader encountering the log still gets the grouping boundary as text. Suggested role: `role="separator"` with the "Turn N" text as its accessible content, or a simple heading-level element inside the list — architect/implementer's call on the exact element, not load-bearing for this spec, but it must have readable text, not be decoration-only.
- Contrast: `text-blue-400`, `text-red-400`, `text-purple-400`, `text-yellow-400` against the card's `bg-background/40` backdrop-blur surface — reuses shades already in use elsewhere in the dark theme (`CombatDialog.styles.ts`); unverified in this pass whether all four hit 4.5:1 specifically on this card's blurred background (the card sits over the map, so the effective backdrop varies) — flag for ui-verify / a contrast check once implemented, since `backdrop-blur` over a variable map background is harder to guarantee than a flat panel.

### Acceptance criteria
<!-- Checked in the browser by the ui-verify skill, or in a component test. Make each one observable. -->
- [ ] A match with only legacy `string` log entries (simulating an in-progress match from before this ships) renders every entry exactly as today: plain muted text, no icon, no player-color accent, no turn divider — confirms back-compat with no visual regression.
- [ ] A match with structured entries spanning two different `turn` values renders a visible "Turn N" divider between them, in document order.
- [ ] A structured entry with both `playerId` and `targetPlayerId` set (e.g. a sabotage or steal message) renders two differently-colored name substrings matching each player's `PlayerColor`, within the same line.
- [ ] With the "Show routine activity" toggle off (default), no entry with `isPassive: true` appears in the list; a milestone entry (`isMilestone: true`) still appears even with the toggle off.
- [ ] Toggling "Show routine activity" on reveals the previously-hidden passive entries without removing or reordering the already-visible ones.
- [ ] The rewritten copy for the six before/after examples above matches the "after" text exactly in the relevant reducer's test fixtures.
- [ ] On a 390×844 viewport, the `GameLog` card's footprint (position and height) is unchanged from the current build — the map grid's visible area is not reduced by this change.
- [ ] The declutter toggle has visible text, is reachable by keyboard (Tab + Space/Enter), and its checked state is exposed via `aria-checked` (via the `Switch` primitive).

### Scope and sequencing hints (for architect-a, not a phasing decision made here)
- **Smallest first slice that delivers real value**: change the `game-rules` reducers to push structured entries (via a single shared helper so the ~60 call sites become one mechanical pattern, not 60 bespoke edits) while `GameLog` continues to render only each entry's `message` field, ignoring the new metadata. This ships zero visible change but gets the data flowing, is the highest-file-count/lowest-risk-per-file slice (good fit for an escalated builder under review), and unblocks every other slice.
- **Second slice**: `GameLog.map.ts`/`GameLog.types.ts`/`GameLog.tsx` consume the structured metadata — player-color name accents, category icons, turn dividers, the declutter toggle. This is where the acceptance criteria above actually become checkable in a screenshot.
- **Third slice (optional, can also fold into the first)**: the six wording fixes above, since they're copy-only diffs inside the same reducer files already being touched for the structural change — the architect may choose to do these in the same pass as slice one to avoid touching the same files twice, or defer them.
- Migration/compat is not a separate implementation slice: it is satisfied by the `string | StructuredLogEntry` union itself and a `typeof entry === 'string'` branch in the view mapper — no backfill job, no Firestore migration script. A match's `log` array is append-only and bounded to that match's lifetime (hours, per typical session length); old entries pushed before this ships simply stay as plain strings forever in that match's document and render via the legacy branch. The only edge case is a live match where some players are on an old client build and some on a new one during a deploy window (one side pushes plain strings, the other structured) — both branches of the union already handle this correctly since the mapper treats each array element independently; this is called out as expected, not a defect to design around further.

## Review (ui-designer-b)

Independent re-verification (ignoring the prior self-review entirely; re-checked every citation against source myself).

### Confirmed accurate
- `src/lib/types/game.ts:40-41` — `turn: number`, `log: string[]` adjacent on `GameState`, confirmed.
- `src/lib/types/player.ts:19-23` — `playerId: string`, `color: PlayerColor` confirmed.
- `GameLog.tsx:19-23`, `GameLog.styles.ts:8`, `GameLog.map.ts:1-3`, `GameLog.types.ts:1-3` all match the spec's description verbatim. `GameLog.hook.ts:9` also confirmed: `toGameLogEntries(gameState.log || [])` — the only other consumer, and grepping confirms no file outside `game-rules/*` and `GameLog/*` reads `gameState.log`/`state.log`, so the blast-radius claim is accurate.
- `src/components/ui/switch.tsx`, `src/components/ui/badge.tsx` both exist as described.
- `CombatDialog.tsx:99` — confirmed `style={{ color: winner.color }}` inline, not a token class.
- No Firestore schema/converter validates `GameState.log` shape (grepped `src/lib/firebase*`) — the union-type migration claim is sound; a `StructuredLogEntry` object nests into Firestore with no schema change.
- Scope boundary: confirmed clean. `docs/ai/tasks/2026-10-04-ui-ux-phase3-mobile-actions/ui-design.md:25` explicitly states `GameLog` keeps its current position below the map and is out of scope for that task. This spec doesn't touch `ActionsPanel` or `GameBoard.tsx`'s layout.
- Backward-compat reasoning (`string | StructuredLogEntry` union, no backfill, no Firestore migration) is correct for a persisted, append-only, match-scoped array.
- Two-new-patterns flag: justified. Color alone doesn't fix clutter/flow/wording; accepting both elements as one redesign is reasonable.

### Found, not in the spec or its self-review

1. **Push-call-site count is 61, not 60** (re-grepped `log.push` across `src/modules/game-rules/*.ts`: 61 matches, 14 files). The spec flags the number as "not load-bearing," which is fine, but the self-written review's claim of having "independently re-grepped ... and got 60 matches" was not actually an independent check — it just repeated the spec's number. Minor, but worth correcting since it was stated as verified.
2. **Citation error.** The taxonomy bullet maps `combat-player-resolve.reducer.ts:32,67,94` to three strings in sequence (two "receives 5 VP" lines, then the milestone line, then "defeated ... in battle!"). In the real file, lines 32 and 67 are both "receives 5 VP"; line 94 is "defeated ... in battle!"; the `🎉 ... won the game!` milestone line is actually at **line 91**. Correct citation: `32,67,91,94`.
3. **"No existing player-color → class helper" claim is incomplete.** `src/modules/hud/components/PlayerInfo/PlayerInfo.styles.ts:3-22` already exports exactly this pattern for this job: `playerBorderColors`, `playerBgGlow`, `playerRingColors`, each a `Record<PlayerColor, string>`, consumed in `PlayerInfo.tsx:23,25,32`. That is a closer precedent than `player-sprite.ts`'s function-returning-a-sprite-path shape. The new helper should follow the `Record<PlayerColor, string>` const-object shape, not a `toPlayerColorTextClass()` function.
4. **Turn-0 edge case, unaddressed.** `game-setup.reducer.ts:132` sets `turn: 0` at game creation, before `startGame`/the first real turn sets it to 1. `player-join.reducer.ts:82` pushes `"${playerInfo.name} has joined the game!"` while players are still joining, with `turn` still `0`. Stamping `turn: state.turn` unconditionally means these pre-game entries get `turn: 0`, and the UI would render a confusing "Turn 0" divider. Not mentioned by the spec.
5. **Slice-1 risk understated.** Grepped `*.reducer.test.ts`: 32 lines across 11 files assert on `.log` directly, many via `entry.includes(...)` (e.g. `card-acquisition.reducer.test.ts:65,157`, `island-discovery.reducer.test.ts:111`). Once reducers push `StructuredLogEntry` objects instead of plain strings, `entry.includes(...)` throws at runtime. The spec's "ships zero visible change, lowest risk" framing for slice 1 undercounts this: it's zero UI change, but a breaking change to ~32 existing test assertions across 11 files that must be updated in the same pass.
6. **Mobile header fit unverified.** `GameBoard.tsx:53`'s mobile `<aside>` is `w-full` inside a `flex-col` column; `GameLog.styles.ts:3`'s header is `p-3 pb-1`. Fitting "EVENT LOG" + a `Switch` (44×24) + the visible label "Show routine activity" in one `CardHeader` row at ~350px available width is plausible but unverified at 390px or smaller (375px). No fallback or check specified.

### Otherwise sound
- Switch label pattern (visible text beside the control, no `htmlFor` association) matches existing precedent at `CustomSettingsSheet.tsx:47` — not new a11y debt.
- "Color never the only signal," turn-divider-as-real-text, and the declutter mechanism's targeting of the two highest-frequency zero-decision call sites are all correctly grounded in the real code.
- All states (legacy, structured, mixed, empty, toggle on/off, milestone) are covered. Acceptance criteria are screenshot/test-checkable aside from gaps 4 and 6 above.

VERDICT: APPROVED, with findings 1-6 folded into the Final spec below. None require reworking the data model, the two-pattern decision, or the backward-compat strategy.

## Final spec
The "Spec (ui-designer-a)" section above stands as written, amended by:

- **Citations**: push-call-site count is **61** across 14 files (not 60; still not load-bearing). The combat-player-resolve bullet's milestone-line citation is `32,67,91,94` (milestone is line 91, not 94).
- **Color helper shape**: implement the new player-color mapping as a `Record<PlayerColor, string>` const object (e.g. `playerTextColors`), mirroring `PlayerInfo.styles.ts:3-22`'s `playerBorderColors`/`playerBgGlow`/`playerRingColors` — not a `toPlayerColorTextClass()` function mirroring `player-sprite.ts`. Placement is still the architect's call.
- **Turn-0 handling (new, required)**: entries with `turn: 0` (pushed while `GameState.status === 'waiting'`, e.g. `player-join.reducer.ts:82`) render with no turn divider. Added acceptance criterion: a log containing only pre-game (`turn: 0`) structured entries shows zero turn dividers.
- **Scope note**: slice 1 also requires updating the ~32 existing `.log`-asserting lines across 11 `*.reducer.test.ts` files (switch from reading the entry as a string to reading `.message` or branching on a type guard). Size slice 1 accordingly.
- **Mobile header fit (new, required)**: added acceptance criterion that at 390×844 and 375px width, "Event Log" + the declutter `Switch` + "Show routine activity" render on one line without clipping; if not, shorten the label to "Show routine" before adding a second row.

Later stages rely on the "Spec (ui-designer-a)" section for exact field names, copy and most acceptance criteria, and on this Final spec section for the corrections/additions above.
