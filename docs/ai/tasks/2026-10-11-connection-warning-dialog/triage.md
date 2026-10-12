# Triage: Connection-lost warning dialog before bot takeover

Request: Show the affected player a non-interactive dialog, with a sound and a live countdown, when their own seat's heartbeat has lapsed and is approaching the existing bot-takeover threshold — purely a UX improvement to the already-shipped disconnect-detection system, no change to when/how a seat actually converts.
Type: feature
Tier: M
Pipeline: ui-designer-a ui-designer-b architect-a architect-b implementer-a implementer-b tester-a tester-b preview-a preview-b docs-sync architect-b:final-review
Overrides: implementer-a=sonnet
Phases: 1

## Why this tier
- New component inside one module (`src/modules/game-board`), new hook, new sound-playback mechanism, wired into the existing `useGameEngine` composition (`game-board.engine.hook.ts:10-11` already imports `useHeartbeat`/`useStalenessCheck` the same way a third hook would be added). About 5-6 new/edited files — fits one phase.
- Visible UI (a dialog the player sees) → `ui-designer-a`/`ui-designer-b` run before the architects, per the tier table.
- No gameplay/rule change: confirmed with the user this does not touch `turn-timer.hook.ts` (`TURN_DURATION`, 120s auto-pass) or any `game-rules` reducer — only reads the already-existing `lastSeenAt`/`STALE_THRESHOLD_MS` data the staleness system already writes and computes against (`game-board.staleness.hook.ts:6,16-21`). No `game-designer-*` stage needed.
- Firestore/data signal: none — no new `GameState`/`Player` field. The dialog is computed client-side from data the local client already receives in its own `gameState.players` snapshot (own `lastSeenAt`, already written by `useHeartbeat`, `game-board.heartbeat.hook.ts:6`).
- Risk signal: low-moderate. Must not misfire for a normally-connected player (false positive = a player sees a "you're about to be replaced" dialog while just playing normally) and must dismiss itself the instant a heartbeat lands again — this is the main thing `tester-a` needs to nail down, hence `implementer-a=sonnet` for the hook/timing logic.
- No existing sound-playback pattern in the codebase (`grep` for `Audio(`, `.mp3`, `.wav`, `.ogg`, `playSound`, `useSound` across `src` and `public`: no hits) — `architect-a` decides the mechanism; leaning towards a synthesized Web Audio API tone (no asset to source/license/ship) rather than an audio file, but this is the architect's call to make explicit in `plan.md`.
- Reusable primitive available: `src/components/ui/alert-dialog.tsx` (shadcn `AlertDialog`) — already in the vendored UI kit, fits "informational, no real action" use case better than the plain `dialog.tsx`.

## Scope
- In: a new warning-threshold constant (lower than and distinct from `STALE_THRESHOLD_MS`, e.g. fires partway through the existing 45s window), a hook that derives "is my own heartbeat lapsing" + remaining-seconds-to-conversion from the local player's own `lastSeenAt` in the live `gameState.players` snapshot, a new dialog component (non-interactive, countdown display, auto-dismiss on recovery), a sound played once when the dialog first appears.
- In: wiring the new hook/component into `game-board.engine.hook.ts`'s existing composition point, alongside `useHeartbeat`/`useStalenessCheck`.
- In: updating `docs/architecture/systems-and-visuals.md` §6.14 (Disconnect Detection & Seat Takeover) to document the new warning stage.
- Out: any change to `STALE_THRESHOLD_MS`, `STALENESS_CHECK_INTERVAL_MS`, or `HEARTBEAT_INTERVAL_MS` themselves (explicitly reverted to their original 45s/20s/15s values earlier this session; not revisited here).
- Out: the 120s per-turn timer (`turn-timer.hook.ts`) and any "idle but connected player loses their seat" rule — confirmed out of scope with the user.
- Out: any dialog/indicator shown to the *other* players about a peer's impending takeover (today they have no UI for this at all; the user asked only for the affected player's own view). Flag to the user as a possible follow-up, not building it now.

## Open questions
- None — scope was confirmed with the user via AskUserQuestion before this triage (countdown tracks the staleness/bot-conversion timer, not the turn timer; no new seat-conversion rule for idle-but-connected play).
