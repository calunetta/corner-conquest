# Triage: Redesign CreateGameDialog match-format picker, Colonist.io-style

Request: Replace CreateGameDialog's "Match Format" dropdown with Colonist.io-style mode-selection cards (icon-in-circle + title + meta row), per ui-designer-a's Proposal 2 in docs/ai/tasks/2026-10-04-game-balance-review/ui-design.md (flagged unverified there — file now read for this triage).
Type: component
Tier: M
Pipeline: ui-designer-a ui-designer-b architect-a architect-b implementer-a implementer-b tester-a tester-b preview-a preview-b architect-b:final-review
Overrides: none
Phases: 1

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier
- Single component, `src/modules/lobby/components/CreateGameDialog/` (CreateGameDialog.tsx:44-55, .hook.ts, .map.ts, .styles.ts, .types.ts, fixtures, 3 test files, preview) — one module, ~8 files touched, fits one sitting.
- Visible UI: yes — the "Match Format" field is currently a plain shadcn `<Select>` dropdown (CreateGameDialog.tsx:44-55: `SelectTrigger`/`SelectContent`/`SelectItem`, four text options). This is the exact gap Proposal 2 targeted; confirmed real, not hallucinated.
- Gameplay: no. `maxPlayers` already drives `numBots` and `debugMode` purely in `CreateGameDialog.hook.ts:22-34`; a new card UI only needs to produce the same `maxPlayers` number, no new game-rules logic.
- Data: no Firestore or `GameState` shape change. `onCreateGame`'s signature (CreateGameDialog.types.ts:6-13) is unchanged.
- Risk: low — view-layer only, same existing patterns already used one `formGroup` down (the faction grid, CreateGameDialog.tsx:57-69, already does icon+label+selected-glow cards via `styles.factionButton`/`factionButtonSelected`). No new primitives needed, no restricted-import boundary issues.

## Correction to the original proposal
ui-designer-a's Proposal 2 assumed an inline per-card "difficulty pill selector (Easy/Medium/Hard)" copied directly from colonist.io's bot-game modes. Verified this project has **no difficulty concept anywhere** (`grep -ril "difficulty" src/modules/lobby src/lib/types` → no hits). The real "Match Format" options are differentiated by **player count and game type** (Solo vs. Bot AI, 2P Duel, 3P Skirmish, 4P Grand Conquest — CreateGameDialog.tsx:50-53), not by difficulty. ui-designer-a must re-scope the card content around that axis instead of inventing a difficulty mechanic that doesn't exist. Bot count/difficulty tuning already lives behind the existing "Advanced Rules" button (`CustomSettingsSheet`, out of scope here).

## Scope
- In: redesign the "Match Format" `Select` (CreateGameDialog.tsx:43-56) as a Colonist.io-style card grid — one card per existing option (Solo/2P/3P/4P), icon-in-circle + title + short meta line, selected-state styling consistent with the existing faction-grid pattern (`styles.factionButton*`) for visual consistency within the same dialog. Keep the exact same `maxPlayers` values and option text already defined; this is a presentation change, not a content change.
- Out: any new bot-difficulty setting or mechanic (none exists; do not invent one). Changes to `CustomSettingsSheet` ("Advanced Rules"). The faction/army picker (already card-based, not broken). Any change to `onCreateGame`'s signature or game-rules/Firestore. The other four ui-design.md proposals from the balance-review task (tracked separately: 1/3/5 approved in that plan, 4 already tracked as finding 7 elsewhere).

## Open questions
- None. Ready for ui-designer-a once triggered.
