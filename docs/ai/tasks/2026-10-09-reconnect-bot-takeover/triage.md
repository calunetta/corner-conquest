# Triage: Replace a leaving player with a bot; restrict reconnect to their own match

Request: Change what happens when a player leaves an in-progress match. Today (`handlePlayerExit`) the match either deletes the Firestore room or splices the player out entirely and renumbers everyone else. Instead: a leaving player should be replaced by a bot that keeps playing their seat, so the remaining humans can finish the match. If the departing player was the last human (only bots left), delete the room as today. While the match is still going, if that same player comes back, they should only be able to rejoin that specific match (not pick any other lobby game) and resume control of their seat, taking it back from the bot — Colonist.io-style.
Type: feature
Tier: L
Pipeline: architect-a architect-b implementer-a implementer-b tester-a tester-b preview-a preview-b architect-b:final-review
Overrides: none
Phases: 2+ (Phase 1: bot takeover on exit; Phase 2: reconnect-and-reclaim flow — sequence this after `2026-10-09-persistent-account-auth` lands, see Scope)

## Why this tier
- Rewrites the core logic of `src/modules/game-rules/services/player-exit.service.ts` (confirmed: currently deletes the room on host-exit-while-playing, deletes on zero-remaining-humans, otherwise splices the player out and renumbers every other player/army/combat-state reference — a materially different behavior than "convert the seat to a bot").
- Needs the bot turn engine (`bot-turn.reducer.ts`/`bot-turn.service.ts`) to be able to run a seat that was created as human-owned mid-match — today bots are only ever created at match setup (`player-factory.ts`), never promoted from an existing human seat; need to confirm nothing else assumes `isBot` is fixed for a player's lifetime.
- Needs a way to recognize "this player belongs to this specific in-progress match" at the lobby-join layer (`src/modules/lobby/components/Lobby/Lobby.hook.ts`) — new logic, not a tweak.

## Scope
- In: `handlePlayerExit` behavior (flip the seat to `isBot: true` and let the bot engine drive it, instead of deleting/splicing), lobby join flow restricting a player who has an active seat in an in-progress match to only that match, and the "reclaim seat from bot" action when they do rejoin.
- Out: the actual durable-identity work (Google/email accounts) — tracked separately as `2026-10-09-persistent-account-auth`. This task's reconnect-matching can work at a baseline level keyed on the existing localStorage `playerId` (same browser/device), but a player who clears storage or switches devices can't be matched back to their seat until that task lands. Sequence `persistent-account-auth` first if cross-device reconnect is a hard requirement; otherwise this task can ship same-device reconnect now and extend it once accounts exist.
- Out: spectator mode, or allowing a reconnecting player to watch without controlling — not requested.

## Open questions — resolved 2026-10-10
1. **Last-human-leaves deletion timing:** Instant deletion, no grace window. Matches current behavior.
2. **Disconnect vs. intentional leave:** In scope. Add a server-recognizable timeout — a `lastSeenAt` heartbeat plus a periodic/Firestore-side check — so a silently dropped connection (no `beforeunload`) also converts its seat to a bot, not just explicit "Leave Game" clicks. This folds in the stall bug from `docs/ai/functionality-audit.md` point 149 (120s turn timer is client-side only, so a genuinely dropped player never times out today). Raises tier/scope: this task now also needs a heartbeat-write mechanism (client) and a staleness check (server-side or periodic client-triggered), not just the exit-path rewrite.
3. **Reclaim timing vs. in-progress bot turn:** Wait for the bot's current turn to finish; control transfers only at the next turn boundary. No interruption support needed in the bot-turn engine.
