# Triage: Firestore identity enforcement for games/{gameId}

Request: Add Firebase Anonymous Auth for guests (so every client has a verified `request.auth.uid`, replacing the pure-localStorage guest `playerId`) and tighten `games/{gameId}` security rules to require the writer be a participant (`request.auth.uid` in `players[].playerId`) on create/update/delete, instead of today's "anyone can write/delete any match."
Type: bug
Tier: L
Pipeline: architect-a architect-b implementer-a tester-a docs-sync architect-b:final-review
Overrides: implementer-a=sonnet, tester-a=sonnet
Phases: 2

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier
- Firestore shape/identity change, cross-module: `src/modules/session/{guest-session.ts, player.hook.ts}`, `src/lib/firebase.ts` (export `signInAnonymously`), `firestore.rules`, `firestore.rules.test.ts` (615 lines today), plus their test files (`player.hook.test.ts`, `player.provider.test.tsx`). Verified each path exists and that `guest-session.ts:readOrCreateGuestPlayerId` (src/modules/session/guest-session.ts:7) is the sole source of the guest `playerId`, consumed by `player.hook.ts:16` and nowhere else duplicated.
- Data signal: yes — changes what identity means for every `games/{gameId}` write and for guest `playerId` generation itself.
- Risk signal: yes — security rules (wrong rule locks out legitimate players or still leaves the door open) and an identity-model change that every multiplayer write path depends on (`lobby.service.ts`, `player-exit.service.ts`, `bot-turn.service.ts` all key off `playerId`).
- No gameplay-number change (drop game-designer pair) and no new/changed UI (anonymous sign-in is invisible to the player — drop ui-designer and preview pairs). No view-layer (.tsx) files are touched, so implementer-b/tester-b have nothing to own; implementer-a/tester-a cover session + rules + their tests end to end.
- `docs-sync` is mandatory: this changes documented identity/security behavior (`docs/architecture/*.md`'s auth/session section, if any — architect-a confirms which file) and the `functionality-audit.md` point 140 finding this task resolves.
- Every builder escalated to sonnet per the L-tier rule (Firestore rules and auth-identity logic, not routine CRUD).

## Scope
- In: guest Anonymous Auth sign-in (guest `playerId` becomes the anonymous `auth.currentUser.uid`, kept in sync with existing `usernames/{username}` guest-reservation flow which already works by `playerId`); `games/{gameId}` rules tightened to a participant check on create/update/delete; `firestore.rules.test.ts` coverage for allowed-participant and rejected-non-participant cases.
- Out: per-move legality enforcement inside `games/{gameId}` (validating that a write only touches fields the acting player is allowed to touch) — flagged in `functionality-audit.md` point 140 as a separate, larger change (routing writes through a trusted server/Cloud Function running the `game-rules` reducers). `usernames/{username}` unrestricted `read`/unconditional guest `delete` — same class of gap, not in scope here. Any change to `reconnect-bot-takeover`'s own plan (it stays DRAFT; this task only removes the blocker its triage.md and plan.md cite).

## Open questions
- None — guest Anonymous Auth is the only viable way to give rules a trustable identity for guests (confirmed: `player.hook.ts` has no `request.auth` for guests today, so no weaker alternative exists). architect-a should still confirm with the user before Phase 1 whether re-keying the guest `playerId` to the anonymous uid breaks any assumption about `playerId` format elsewhere (e.g. display, debug tooling) — none found in this pass, but worth a final grep.
