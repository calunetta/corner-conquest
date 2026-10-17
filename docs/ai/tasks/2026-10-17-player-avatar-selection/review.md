# Final review: Player avatar selection, phase 1

VERDICT: APPROVED

## Checks run
- `npm run typecheck`: clean, no errors (`tsc --noEmit` exits 0, no output).
- `npm run lint`: clean, `eslint . --max-warnings 0` exits 0, no output.
- `npx jest src/modules/avatars src/modules/game-rules src/modules/session src/modules/lobby`: `Test Suites: 77 passed, 77 total`, `Tests: 1110 passed, 1110 total`.
- `npm run test:rules`: not run, no Java runtime available in this environment (`java -version` → "Unable to locate a Java Runtime"). Not marked as passed; the Firestore-rules logic was instead verified by reading `firestore.rules` and `firestore.rules.test.ts` against the plan (below).
- ui-verify: N/A for this phase. Phase 1 has no view-layer changes (`.tsx`/preview files); Phase 3's plan step 5 is where `ui-verify` runs.

## Plan adherence
File plan for Phase 1, each file checked against the plan's contract:
- `src/modules/avatars/avatar-catalog.ts`, `index.ts` — match the Contracts block exactly: `AvatarId`, `AVATAR_IDS`, `AVATAR_OPTIONS`, `AVATAR_CATALOG`, `isValidAvatarId`, `toAvatarSrc`. Verified the asset path against the real directory: `public/tiny-swords/UI Elements/UI Elements/Human Avatars/` has exactly 25 files `Avatars_01.png`..`Avatars_25.png`, matching `AVATAR_ASSET_BASE` + the padded filename built in `avatar-catalog.ts:20-28`.
- `avatar-catalog.test.ts` — covers the 25-entry shape, position ordering, asset-path mapping, uniqueness, `isValidAvatarId` true/false (including prototype-pollution-style keys `toString`/`__proto__`/`constructor`, a good addition beyond the plan's minimum), `toAvatarSrc` known/unknown/null/undefined.
- `src/lib/types/player.ts:47-49` — `avatarId?: string | null` added, matches contract.
- `player-factory.ts:14` — `avatarId: string | null = null` param added, matches contract (plan's `avatarId?: string | null` default vs implemented `avatarId: string | null = null` are behaviorally identical).
- `game-setup.reducer.ts:29,52` — creator's `avatarId` threaded to `createPlayer`; bots still call `createPlayer` without passing `avatarId`, defaulting to `null`. Matches contract.
- `player-join.reducer.ts:13,55` — `playerInfo.avatarId` threaded into the joining player's `createPlayer` call. Matches contract.
- Game-rules tests (`player-factory.test.ts`, `game-setup.reducer.test.ts`, `player-join.reducer.test.ts`) — new `describe` blocks cover: stores given id, defaults to `null` when omitted, keeps explicit `null`, creator id flows through with bots forced to `null`, joining player id flows through, and a non-mutation check. Matches the test plan.
- `lobby.service.ts:78` — `joinOpenGame`'s `player` param gains `avatarId?: string | null`; confirmed the param is passed straight into `addPlayerToGame(gameState, player)` at `lobby.service.ts:100`, so the field actually flows end to end, not just a type-level addition.
- `account.service.ts:81-96` — `findAccountAvatarId` (returns `null` for absent doc or absent field) and `setAccountAvatarId` (`setDoc(..., { avatarId }, { merge: true })`) added, matching the contract and mirroring `findAccountUsername`/`bindUsernameToAccount`'s pattern.
- `account.service.test.ts` — new tests for both functions, including a rejected-write propagation case.
- `player.types.ts:1,20-23` — `PlayerContextType` gains `avatarId: AvatarId | null` and `setAvatarId`, matching the contract's JSDoc verbatim.
- `firestore.rules:58-64,69-76` — `isKnownAvatarId` allow-list function (with a comment pointing back at the TS source of truth) and the narrowed `accounts/{authUid}` `allow update` gated on `affectedKeys().hasOnly(['avatarId'])` plus `isKnownAvatarId`. Matches the plan's design and the approved-plan review's reasoning exactly.
- `firestore.rules.test.ts` — new `describe('Update: avatarId')` block: owner sets a known id (keeps `username`), rejects unknown id / empty string / non-string, rejects another uid, rejects unauthenticated, rejects a write that also changes `username`. Covers every case in the plan's test list.

Deviations from the literal File plan, both judged acceptable:
1. **`src/modules/session/player-avatar.hook.ts` (new, not listed).** `usePlayerAvatar(account)` extracted from what would otherwise be a 150+ line `player.hook.ts` (currently 184 lines after the split, 49 more in the new file — before the split this would have been ~230 lines, over the 150-line lint-enforced limit per skill `component-architecture`). It has no own `.hook.test.ts`, but every documented behavior (guest starts/stays `null` and never calls `findAccountAvatarId`; valid/invalid/absent/rejected-read restores from a signed-in account; successful/failed `setAvatarId` including the revert-to-previous-value-on-failure case; session switching from signed-in to guest clears the avatar) is exercised through `player.hook.test.ts`'s `describe('avatar', ...)` block (lines 865-977), which drives it through the public surface, `usePlayerProvider`. Since `usePlayerAvatar` is not exported from `session`'s public API and is only reachable through `usePlayerProvider`, testing it through that integration point is consistent with the module's black-box boundary; a separate unit test would duplicate the same cases against an internal implementation detail. Acceptable as implemented.
2. **`src/modules/session/player.provider.test.tsx` (edited, not listed).** `PlayerContextType`'s mock literals needed `avatarId: null, setAvatarId: jest.fn()` added in three places to keep typechecking after the interface grew those two required fields (`player.types.ts:20-23`). This is a direct, mechanical, unavoidable consequence of the `player.types.ts` row already in the File plan (owner implementer-a) — not a scope expansion. No behavior assertions changed.
3. `firestore.rules`, `game-setup.reducer.test.ts`, `player-factory.test.ts`, `player-join.reducer.test.ts`, `lobby.service.ts`, `account.service.ts/.test.ts`, `player.hook.ts/.test.ts`, `player.types.ts` are all present and accounted for in the plan; no file outside the plan beyond the two above was touched by this task's diff.

Recommend amending `plan.md`'s Phase 1 File plan to add a row for `src/modules/session/player-avatar.hook.ts` (new, implementer-a) and `player.provider.test.tsx` (edit, tester-a) so the record matches what was actually built — not a blocking issue for this phase, since both are justified, but it should be reflected before Phase 2 reads the plan as the contract.

Unrelated pre-existing working-tree changes noted and excluded from this review: `src/modules/map/components/TileVariants/tile-variants.config.json` and `src/modules/map/components/IslandTile/IslandTile.test.tsx` are modified in the working tree but were already modified before this task's session started (per the conversation's initial `git status` snapshot) and have nothing to do with avatars; `git log` shows the last commits touching those files (`ae48365`, `bc1d4f8`, `c8f4afa`) are unrelated fog/tile-variant work. Not part of this task's Phase 1 diff.

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| 1 | `plan.md` Phase 1 File plan | Missing rows for `src/modules/session/player-avatar.hook.ts` (new) and `player.provider.test.tsx` (edit) | architect-a | No — amend before Phase 2 |
| 2 | `src/modules/game-rules/player-join.reducer.test.ts:267-305` | New `describe('player-join.reducer: avatarId threading', ...)` block is appended at zero indentation inside the file's outer wrapping `describe`, unlike the rest of the file's nested blocks; cosmetic only, lint still passes at 0 warnings | tester-a | No |

## Docs
- `docs-sync`: not run, not due yet — plan's Phase 3 step 3 schedules `docs/architecture/structure-and-state.md` (`Player.avatarId`) and `systems-and-visuals.md` updates for after the render-surface work in Phase 2.
