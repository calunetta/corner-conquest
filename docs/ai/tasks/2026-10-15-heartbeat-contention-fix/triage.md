# Triage: Stop heartbeat writes from colliding with game-state writes

Request: Fix the Firestore `failed-precondition` on `games/{id}` commits by removing `writeHeartbeat`'s full-document transaction, which races `saveGameState`/bot-turn `setDoc` calls to the same document.
Type: bug
Tier: L
Pipeline: architect-a architect-b tester-a implementer-a implementer-b tester-b docs-sync architect-b:final-review
Overrides: implementer-a=sonnet, implementer-b=sonnet, tester-a=sonnet
Phases: 2

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier
- Root cause verified: `writeHeartbeat` (`src/modules/game-board/services/game-board.engine.service.ts:49-63`) runs `runTransaction` reading the whole `GameState` document and calling `transaction.set(gameDocRef, state)` to stamp one seat's `lastSeenAt` inside the `players` array. Firestore transactions version-check the entire document, so any concurrent `saveGameState`/`bot-turn.service.ts` `setDoc` to the same doc forces a retry; under sustained write pressure (bot turns, resource collection) all retries can exhaust, surfacing as `failed-precondition` (reproduced in the console dump the user reported, and documented as a general Firestore optimistic-concurrency failure mode).
- Firestore shape change (Data signal = yes): the only real fix is moving heartbeat timestamps out of the `players[]` array into their own top-level `GameState` field (e.g. `heartbeats: Partial<Record<number, number>>` keyed by seat index), so a heartbeat becomes a plain `updateDoc(ref, { [\`heartbeats.${seatIndex}\`]: Date.now() })` — a single-field-path write Firestore does not version-check against the rest of the document, and no transaction/read is needed. Per the triage table this is a "GameState or Firestore shape change" → tier L regardless of file count.
- Risk signal = yes: `lastSeenAt` drives seat-staleness detection and bot-takeover (`game-board.staleness.hook.ts`, `player-exit.service.ts`'s reclaim logic). A mistake in the migration could silently break disconnect/reclaim, which is multiplayer-sync-critical and hard to notice in manual testing.
- Verified call sites (grep, non-test): `src/lib/types/player.ts` (field definition + doc comment), `src/modules/game-board/services/game-board.engine.service.ts` (`writeHeartbeat`), `src/modules/game-board/game-board.state.map.ts`, `src/modules/game-board/game-board.staleness.hook.ts`, `src/modules/game-board/components/ConnectionWarningDialog/{ConnectionWarningDialog.types.ts,ConnectionWarningDialog.map.ts,ConnectionWarningDialog.hook.ts}`, `src/modules/game-rules/player-factory.ts`, `src/modules/game-rules/services/player-exit.service.ts`, `src/modules/hud/components/PlayerInfo/PlayerInfo.fixtures.ts` — 10 files, each with at least one corresponding test file, so architect-a should expect roughly 6-8 files per phase.
- No existing `docs/ai/refactor.md` row covers this; `firestore.rules` does not reference `lastSeenAt` so no rules change is expected, but architect-a should confirm.
- Gameplay signal = no (no rule numbers or balance change); Visible UI signal = no (ConnectionWarningDialog's displayed behavior is unchanged, only its data source moves) — ui-designer pair and game-designer pair are not needed.

## Scope
- In: moving `lastSeenAt` off `Player`/`players[]` onto a new top-level `GameState` field written via plain `updateDoc`; updating every read site (staleness hook, ConnectionWarningDialog, player-factory defaults, player-exit reclaim logic, PlayerInfo fixtures) to the new shape; removing the now-unused `runTransaction` heartbeat path; updating `docs/architecture/*.md` wherever `GameState`/`Player` shape or the heartbeat mechanism is documented.
- Out: the `[DEBUG canPosition]` console spam the user originally reported (confirmed separately to be stale browser/session output, not present in current code — no fix needed); any other Firestore write path (`saveGameState`, bot-turn `setDoc`, deathAnimations/cardRevealAnimations `updateDoc`) unless architect-a finds they also need the new field; `firestore.rules` unless architect-a finds a rule references `players[].lastSeenAt` directly.

## Open questions
- None — proceeding on the user's "fix all you need to fix" go-ahead.
