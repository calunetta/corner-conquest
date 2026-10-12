# Triage: Host never sees the bot playing a departed guest's seat

Request: After a guest leaves mid-match and their seat is taken over by a bot, the host's client never shows `"<guest name>'s Turn"` (or any other sign the bot is acting) — confirmed by a real `e2e/reconnect-bot-takeover.spec.ts` run against the Firestore emulator, not a stale-selector issue.
Type: bug
Tier: M
Pipeline: architect-a architect-b tester-a implementer-a implementer-b tester-b docs-sync architect-b:final-review
Overrides: implementer-a=sonnet tester-a=sonnet
Phases: 1

## Why this tier
- Reproduced live, not by reading code: `npx playwright test e2e/reconnect-bot-takeover.spec.ts` (needs Java 21 for the Firestore emulator — `JAVA_HOME=/opt/homebrew/opt/openjdk@21` works on this machine) fails at `e2e/reconnect-bot-takeover.spec.ts:93`, waiting 15s for `hostPage.getByText(`${guestName}'s Turn`)`.
- Root cause unknown. This is the third distinct bug found while debugging this one spec this session — the first two (both fixed, committed separately) were:
  - `src/modules/game-board/game-board.state.hook.ts` froze `gameStateForDisplay` into a local snapshot the instant `isMyTurn` was true, which is already true for the match creator (seat 0) while solo and still `waiting` — silently discarding all later live Firestore updates.
  - `src/modules/game-board/game-board.session.hook.ts`'s `handleStartGame` saved the started state through the `EndTurn` action (`setGameState(startedGame, 'end-turn', {})`), which unconditionally advances `currentPlayerIndex` — skipping straight past the host's own first turn.
- With both of those fixed, the spec now gets much further (host's turn → End Turn → guest's turn → guest leaves → "only rejoin option" shown) before hanging at this bot-takeover step specifically.
- Touches the staleness/bot-turn path: `src/modules/game-board/game-board.staleness.hook.ts` (converts a stale peer to a bot via `handlePlayerExit`), `src/modules/game-rules/services/player-exit.service.ts`, and whatever triggers the bot's actual turn once converted (likely the session-driver bot-turn effect in `game-board.engine.hook.ts`). Not yet confirmed which layer is at fault — could be the conversion itself, the bot-turn trigger, or (given the pattern of the first two bugs) another live-update path that silently reads stale state.
- Gameplay-visible and touches Firestore-synced turn state, multiplayer timing — matches the Risk signal for tier M, not S.

## Scope
- In: find why the host's UI doesn't reflect the bot's takeover/turn after a guest's seat converts to a bot; fix the root cause; add the regression test (failing repro first, per the bug pipeline).
- Out: `e2e/bot-vs-bot-ui.spec.ts`'s own 10-minute test-timeout/pacing issue (surfaced in the same session, unrelated — that spec ran many real turns successfully but didn't finish within its configured timeout; needs its own look, not folded into this).

## Open questions
- None — reproduction steps and the exact failing assertion are already known; start with `tester-a` confirming/tightening the repro, then `architect-a` on root cause.
