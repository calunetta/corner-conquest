# Triage: Add the missing base-tile knight; decouple the monster from real game logic

Request: Add the knight to the Home Islands base tile (dropped during the previous phase without being flagged), and stop the monster island from reusing the real `AnimatedMonster` component/hook — it must become lobby-owned code with its own tunable size/position constants, since the whole point is the user hand-tuning these in `LobbyBackground.layout.ts` without touching real game code.
Type: component
Tier: S
Pipeline: implementer-a tester-a docs-sync
Overrides: none
Phases: 1

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier
- Scoped follow-up inside the one component this just-shipped feature owns (`src/modules/lobby/components/LobbyBackground/`), obvious solution, no new design question — tier S, not M. No `ui-designer`/`architect` stage: the visual language, sizing convention and file-ownership rule are already established by the just-approved phase 1.
- Visible UI signal: yes (a knight appears; the monster's wander motion is reimplemented, same algorithm, different owner) — at tier S, the implementer follows the existing pattern rather than a fresh spec.
- Gameplay signal: no. Purely decorative; sprite image paths are read from `PLAYER_DATA`/`MONSTER_DATA` (data, not behavior), but the animation logic itself (wander timing, attack-pose chance, size) must no longer come from `AnimatedMonster`/`AnimatedMonster.hook.ts` — that's real game code the user does not want the lobby depending on for tuning.
- Root cause of the gap: the original triage (`docs/ai/tasks/2026-10-13-lobby-login-background-v2/triage.md`) specified a knight on the base tile; it never appeared in architect-a's plan.md Contracts or File plan, and no stage flagged the omission — including this coordinator's own final-review pass. Recorded as a lesson (see Scope).
- Risk: low. No Firestore, no `GameState`, no reducer change. The only subtlety is correctly duplicating `AnimatedMonster.hook.ts`'s wander/attack algorithm into a lobby-owned hook without copying its *coupling* (no import of `@/modules/map/components/AnimatedMonster`, no dependency on `Monster`/combat types beyond reading two sprite path strings).

## Scope
- In:
  - Knight: a static (no animation — matches the "no bob/breathe" rule from the original design pass) knight icon on the base tile, using `PLAYER_DATA[color].sprite.idle`, sized and positioned via new `KNIGHT_SIZE_PERCENT`/`KNIGHT_POSITION` constants in `LobbyBackground.layout.ts`.
  - Monster: a new lobby-owned hook (e.g. extending `LobbyBackground.hook.ts` or a sibling) that reimplements the same wander/attack-pose algorithm `AnimatedMonster.hook.ts` uses (random interval 3000-5500ms, 25% attack-pose chance, otherwise a new random horizontal offset with direction flip) — same feel, zero import of `AnimatedMonster`/`useAnimatedMonster`. Size and wander range become `MONSTER_SIZE_PERCENT`/`MONSTER_WANDER_RANGE_PERCENT` (or similar) constants in `LobbyBackground.layout.ts`. Sprite image paths (idle/attack) still come from `MONSTER_DATA` (data lookup, not behavior) via `LobbyBackground.map.ts`, same as today.
  - Add a lesson to `docs/ai/lessons-learned.md`: a triage/design item ("add a knight") can silently vanish between triage and the shipped plan if no stage explicitly re-checks the original request's full list against the final File plan/Contracts — the gap surfaced only when the user asked where to tune something that was never built.
- Out: Any change to the real `AnimatedMonster` component, `PLAYER_DATA`, `MONSTER_DATA`, or the real game board. No change to island sizing/position, resource nodes, clouds, or the mount-persistence fix from phase 1 — those are confirmed working and untouched.

## Open questions
- None — proceeding with a static knight (consistent with "no idle bob/breathe" from the original design) and a faithful reimplementation of the real wander algorithm for the monster, both independently tunable from `LobbyBackground.layout.ts`.
