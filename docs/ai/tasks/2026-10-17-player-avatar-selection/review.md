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

## Review (architect-b) phase 2

### Checks run
- `npm run typecheck`: clean, `tsc --noEmit` exits 0, no output.
- `npm run lint`: clean, `eslint . --max-warnings 0` exits 0, no output.
- `npx madge --circular --ts-config tsconfig.json --extensions ts,tsx src`: 3 cycles found; 2 pre-exist in `src/testbed/components/TileDecorationEditor/*` (unrelated to this task). The 3rd is new, see Finding 2 below.
- Reused the coordinator's `npx jest src/modules/avatars src/modules/hud/components/PlayerInfo src/modules/session src/modules/lobby src/modules/game-rules` run (`83 suites, 1252 tests passed`); not re-run.
- `npm run test:rules`, `npm run build`: not run (no Java runtime for the emulator; build not required by Phase 2's checklist, deferred to Phase 3 step 4).

### Plan adherence
Every Phase 2 File plan row (plan.md lines 86-116) is present in the diff and matches its contract:
- `PlayerInfo.types.ts/.map.ts/.tsx/.fixtures.ts/.test.tsx`, `VictoryDialog.map.ts/.tsx/.test.tsx`: `spriteSrc` → `avatarSrc`, resolved via `toAvatarSrc(player.avatarId, <existing fallback>)` — `PlayerInfo.map.ts:150-153`, `VictoryDialog.map.ts:28` — matches the Contracts block exactly.
- `LobbyGameRow.map.ts`: `toPlayerAvatars` added (`LobbyGameRow.map.ts:19-34`), signature and null-fallback semantics match `PlayerAvatarViewModel`. `LobbyGameRow.tsx:66,76` renders `AvatarImage` only when `avatarSrc` is set, `AvatarFallback` unconditionally after it — matches step 6's "keep `AvatarFallback` unconditionally rendered" instruction.
- `Lobby.hook.ts`: `avatarId` read from `usePlayer()` and threaded into `creator`/`joinOpenGame` payloads (`Lobby.hook.ts:24,76,107`); `avatarPicker: useAvatarPickerButton()` added to the returned view model (`:154`). `Lobby.types.ts`/`Lobby.tsx` wire it through unchanged from the contract.
- `AvatarPickerButton.types.ts/.map.ts/.hook.ts/.fixtures.ts/.styles.ts/.tsx/index.ts`: all present, shapes match the Contracts block verbatim (`AvatarCellViewModel`, `AvatarPickerButtonViewModel`, `toAvatarCells`, `useAvatarPickerButton`).
- Files touched outside the explicit File plan rows: `Lobby.fixtures.ts` and `Lobby.hook.test.ts` were edited but have no own File plan row. Judged acceptable — both are the mechanical, unavoidable fallout of `Lobby.hook.ts`/`Lobby.types.ts` already being plan rows (same pattern as Phase 1's `player.provider.test.tsx`): `LobbyViewModel.avatarPicker` becoming required forces every `LobbyViewModel` fixture literal to supply it, and the two new `avatarId`-threading behaviors in `Lobby.hook.ts` need tests. Recommend amending `plan.md`'s Phase 2 File plan with these two rows for the record, not blocking.
- Unrelated working-tree changes confirmed out of scope: `src/modules/map/components/TileVariants/tile-variants.config.json` and the large block of deleted `public/sprites/tile-variants/*` files, plus the untracked `balance-reports-*/`, `e2e/.bot-self-play-captures/*`, `inspect4-fogged.png`. These predate this task's phase (branch `claude/tile-variants-70`'s own prior commits `04c2331`/`4a6d80e` touch the same files) and are not part of this diff's File plan. Not part of this review; do not include them in Phase 2's commit.

### Known items judged

1. **`avatars/index.ts` exporting `noAvatarPicker` from `AvatarPickerButton.fixtures.ts` (`src/modules/avatars/index.ts:5`).** A fixture does not belong in a module's public API. The approved Contracts block for `avatars/index.ts` (plan.md lines 153-158) lists only `AvatarPickerButton`, `AvatarPickerButtonView`, `useAvatarPickerButton` and their types — not a fixture — and File plan row 116 says the same. The need (`Lobby.fixtures.ts:5,39` building a `LobbyViewModel` literal that requires a real `AvatarPickerButtonViewModel` value) doesn't require growing the public surface: `Lobby.fixtures.ts` can define the trivial view model inline (`{ currentAvatarId: null, isDialogOpen: false, onOpenChange: noop, cells: [], isSaving: false, saveError: null, onSelect: noop }`), using only the type-only `AvatarPickerButtonViewModel` import that's already permitted across module boundaries. **Blocking.** Fix: remove the `noAvatarPicker` export from `src/modules/avatars/index.ts`; inline the literal in `Lobby.fixtures.ts` instead. Owner: implementer-a (owns both `avatars/index.ts` and `Lobby.fixtures.ts`'s underlying `Lobby.hook.ts`/`.types.ts` rows).

2. **Cycle `session → …→ avatars → … → session`.** Real, confirmed with `madge --ts-config tsconfig.json`: `session/index.ts → DeleteAccountButton → player.provider.tsx → player.hook.ts → player-avatar.hook.ts → avatars/index.ts → AvatarPickerButton/index.ts → AvatarPickerButton.hook.ts` (which imports `usePlayer` from `@/modules/session`, closing the loop). One direction (`player-avatar.hook.ts` importing `isValidAvatarId`) was already committed in Phase 1 and approved; Phase 2's `AvatarPickerButton.hook.ts` importing `usePlayer` is what closes it into a real two-way module cycle, and it matches the plan's own contract (plan.md line 186: "Reads `{ avatarId, setAvatarId }` from `usePlayer()`"), so the implementer built exactly what was approved. No ESLint rule in this repo catches import cycles (`eslint.config.mjs` has no `import/no-cycle`), and every reference across the cycle is late-bound (inside function/hook bodies, not evaluated at module top level), so it does not manifest as a bug today — typecheck, lint and the full targeted Jest run are all clean. **Not blocking** for this phase. Recommend, for a later cleanup (not a Phase 3 requirement): thread `avatarId`/`setAvatarId` into `useAvatarPickerButton` as parameters from `Lobby.hook.ts` (which already calls `usePlayer()`) instead of calling `usePlayer()` inside `avatars`, removing `avatars`' dependency on `session` entirely. That would require a plan contract amendment, so leaving it to a future task/revise pass rather than blocking this one.

3. **Trigger accessible name.** Verified against `ui-design.md`'s Final spec and `AvatarPickerButton.styles.ts:4-5`: `triggerMobileLabel: 'sr-only sm:hidden'` (visually hidden, present to assistive tech below `sm:`, `display:none` at `sm:` and up) and `triggerLabel: 'hidden sm:inline'` (`display:none` below `sm:`, visible at `sm:` and up). Accessible-name computation excludes `display:none` content but includes `sr-only` content, so the computed name is exactly "Change your avatar" on mobile and "Change Avatar" on desktop, matching the spec. **Correct, no finding.**

4. **`handleSelect` try/catch/finally (`AvatarPickerButton.hook.ts:21-32`).** `isSaving` is set in `finally`, so it clears on both the `setAvatarId` reject path and the `didSave === false` path. The dialog is never closed from `handleSelect` (no `onOpenChange` call on either path), so it stays open on failure. Confirmed against `AvatarPickerButton.hook.test.ts`'s `'when setAvatarId rejects'` and `'keeps the dialog open after a failed save'` cases, which assert exactly this. **Correct, no finding.**

5. **Spinner on the selected cell only (`AvatarPickerButton.tsx:55`: `cell.isSelected && vm.isSaving`).** `AvatarCellViewModel` has no per-cell saving flag in the approved Contracts block, and the spec's Saving preview state ("one cell shows a saving/disabled state") only requires the newly-chosen cell to show it. Combining the global `isSaving` with `isSelected` is correct, not just a fixture artifact: `player-avatar.hook.ts:34-35` updates `avatarId` optimistically (`setAvatarIdState(nextAvatarId)` before `await setAccountAvatarId(...)`, reverted on failure), so `usePlayer().avatarId` — and therefore `toAvatarCells`' `isSelected` — flips to the newly-clicked id in the same tick `isSaving` becomes `true`, before the Firestore write resolves. The spinner lands on the clicked cell, not the previously-saved one. **Accept**, matches spec and contract.

### Findings summary
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| 1 | `src/modules/avatars/index.ts:5`, `src/modules/lobby/components/Lobby/Lobby.fixtures.ts:5,39` | Fixture (`noAvatarPicker`) exported from a module's public `index.ts`; not in the approved Contracts block | implementer-a | **Yes** |
| 2 | `plan.md` Phase 2 File plan | Missing rows for `Lobby.fixtures.ts` (edit) and `Lobby.hook.test.ts` (edit) | architect-a | No — amend for the record |
| 3 | `src/modules/avatars/components/AvatarPickerButton/AvatarPickerButton.hook.ts:2` / `src/modules/session/player-avatar.hook.ts:2` | Real module cycle `session ↔ avatars` (confirmed with madge); built exactly to the approved contract, no current functional impact | architect-a (future contract revisit) | No |

### Docs
- `docs-sync`: not run, not due yet — scheduled for Phase 3 per plan.md.

VERDICT: CHANGES REQUESTED

### Round 2

Re-checked the blocking item (Finding 1). `src/modules/avatars/index.ts` is back to exactly the approved Contracts block (no fixture export); `Lobby.fixtures.ts:6,35-43` now defines `noAvatarPicker` inline as a local `AvatarPickerButtonViewModel` literal, importing only the type (`import type { AvatarPickerButtonViewModel } from '@/modules/avatars'`). `git status` confirms no other file changed. Re-ran checks myself:
- `npm run typecheck` → clean, no output.
- `npm run lint` → clean, `eslint . --max-warnings 0` exits 0, no output.
- `npx jest src/modules/avatars src/modules/lobby src/modules/hud/components/PlayerInfo src/modules/session` → `Test Suites: 46 passed, 46 total`, `Tests: 711 passed, 711 total`.

Finding 1 resolved. Findings 2 (missing Phase 2 File plan rows) and 3 (session↔avatars cycle, built to the approved contract) are unchanged, both non-blocking as judged above.

VERDICT: APPROVED

## Review (architect-b) phase 3

### Checks run (this session)
- `npm run typecheck` → clean, `tsc --noEmit` exits 0, no output.
- `npm run lint` → clean, `eslint . --max-warnings 0 --no-error-on-unmatched-pattern` exits 0, no output.
- `npm test` not re-run per instructions; relying on the coordinator's run quoted in `progress.md`: typecheck clean, lint 0 warnings, `114 suites / 1833 tests` passed.
- `npm run test:rules`: not run (no Java runtime in this environment, same as Phases 1–2). Rules logic unchanged since Phase 1's review, which verified it by reading.

### File plan adherence (Phase 3, plan.md lines 314-319)
- `AvatarPickerButton.preview.tsx` (new) — `src/modules/avatars/components/AvatarPickerButton/AvatarPickerButton.preview.tsx:23-37`: five states (Trigger/no avatar, Trigger/avatar chosen, Dialog open/selected, Saving, Error) — covers the plan's Default/Chosen/Saving/Error set plus an explicit dialog-open state. Fixtures imported from `AvatarPickerButton.fixtures.ts` (`noAvatarPicker`, `chosenAvatarPicker`, `savingAvatarPicker`, `errorAvatarPicker`), matching plan.md line 110.
- `src/testbed/registry.ts` — diff confirmed: `avatarPickerButtonPreview` imported and added to the `previews` array (between `lobbyGameRowPreview` and `createGameDialogPreview`). Matches the file plan row exactly; no other entries touched.
- `PlayerInfo.preview.tsx` — adds `currentPlayerChosenAvatar` via `toAvatarSrc('human-03', currentPlayerWithBuffs.avatarSrc)` and a "Chosen avatar" state. Matches plan.md's preview-states spec ("one with `avatarId` set").
- `VictoryDialog.preview.tsx` — adds "You won, chosen avatar" state passing `{ ...humanWinner, avatarId: 'human-03' }`, matching the Phase 1 review's own prediction of this exact inline-override pattern.
- `LobbyGameRow.preview.tsx` — adds `mixedAvatarGame` fixture and a "Mixed avatars and fallback" state. Matches plan.md's preview-states spec (mix of chosen avatar and fallback players side by side).
- `docs/architecture/structure-and-state.md`, `docs/architecture/systems-and-visuals.md` — both edited; new `docs/architecture/player-avatars.md` created and indexed from `docs/README.md` (`§6.16` row added at `docs/README.md:31`). This fourth doc file is not itself a File plan row, but `docs/README.md`'s own index line (`docs/README.md:4`, "under ~200 lines") and the existing per-topic-file pattern (`special-cards.md` is its own file for one topic) justify splitting a new `§6.16` section into its own file rather than growing `systems-and-visuals.md` further; `systems-and-visuals.md` itself only gained a 3-line pointer (`docs/architecture/systems-and-visuals.md:45-47`) to the new file, which is consistent with keeping each doc file "under ~200 lines." Not a File plan deviation worth blocking — docs-sync's own file-boundary judgment, same pattern as every other topic file under `docs/architecture/`.
- No other file outside the Phase 3 plan was touched by this phase's diff. Confirmed with `git status`: the only tracked modifications are `docs/README.md`, `docs/architecture/structure-and-state.md`, `docs/architecture/systems-and-visuals.md`, `PlayerInfo.preview.tsx`, `LobbyGameRow.preview.tsx`, `VictoryDialog.preview.tsx`, `src/testbed/registry.ts`, plus the untracked `docs/architecture/player-avatars.md` and `AvatarPickerButton.preview.tsx`. The modified `src/modules/map/components/TileVariants/tile-variants.config.json` and the large block of deleted `public/sprites/tile-variants/*` are pre-existing, unrelated working-tree changes from other in-flight work on this branch (confirmed in Phase 2's review as predating this task), not part of this diff.

### Docs vs code (claim-by-claim)
`docs/architecture/player-avatars.md` (new §6.16) and the §3.1 "Avatar" addition in `structure-and-state.md` were checked against source, not just read:
- "25 built-in human avatars with ids `human-01` to `human-25`... maps to `/tiny-swords/UI Elements/UI Elements/Human Avatars/Avatars_NN.png`" — matches `src/modules/avatars/avatar-catalog.ts:1-7,19-29` exactly (`AVATAR_IDS`, `AVATAR_ASSET_BASE`, `toCatalogEntry`).
- "`toAvatarSrc(avatarId, fallbackSrc)` returns the catalog image for a valid id and the caller's fallback otherwise" — matches `avatar-catalog.ts:43-46`.
- "The id list in `firestore.rules` (`isKnownAvatarId`) must match `AVATAR_IDS`" — verified both lists by eye: `firestore.rules:61` lists `human-01`..`human-25` in the same order as `avatar-catalog.ts:2-6`. True today; this is a DRY risk (two hand-maintained lists) the doc correctly flags as a must-match invariant rather than claiming it's enforced, which is honest — nothing in the code enforces it beyond `firestore.rules.test.ts`'s rule tests and `avatar-catalog.test.ts`'s TS tests independently covering the same 25 ids.
- "The trigger shows the chosen avatar's thumbnail, or a users icon when none is chosen... text reads 'Change Avatar' from the `sm` breakpoint up" — matches `AvatarPickerButton.styles.ts:2-6` (`triggerLabel: 'hidden sm:inline sm:ml-1.5'`, `triggerMobileLabel: 'sr-only sm:hidden'`) and the Final spec.
- "Clicking one saves it through `usePlayer().setAvatarId`. The clicked cell shows a spinner while the save runs, and 'Done' is disabled during the save. If the save fails, the dialog stays open..." — matches `AvatarPickerButton.hook.ts:11,21-32` (`usePlayer()` destructure, `setAvatarId` call, `isSaving`/`saveError` state, no `onOpenChange(false)` on failure) and the `AvatarPickerButton.tsx` Done-button disabled-on-`isSaving` wiring (spot-checked via `AvatarPickerButton.hook.test.ts`'s passing "keeps the dialog open after a failed save" case, not independently re-read line-by-line here — acceptable, the hook contract itself was read in full).
- "`toPlayerAvatars` in `LobbyGameRow.map.ts` returns `avatarSrc: null`" for no avatar — matches `LobbyGameRow.map.ts:27-34` exactly.
- "With no avatar set they show the color's idle sprite, as before (`PlayerInfo.map.ts`, `VictoryDialog.map.ts`, `toPlayerIdleSprite`)" — matches `PlayerInfo.map.ts:150` and `VictoryDialog.map.ts:28` (both call `toAvatarSrc(id, toPlayerIdleSprite(color))` or equivalent, confirmed by grep above).
- "the creator's and a joiner's avatar id from `usePlayer` is passed into the match when the game is created (`initializeGame`) or joined (`joinOpenGame`, `Lobby.hook.ts`)" — matches `Lobby.hook.ts:24,75,107` exactly (destructures `avatarId` from `usePlayer()`, builds `creator`/the `joinOpenGame` payload with it).
- `structure-and-state.md`'s §3.1 "Avatar" block: "an unknown stored value is treated as no avatar" matches `player-avatar.hook.ts:21` (`isValidAvatarId(storedAvatarId) ? storedAvatarId : null`); "reverts the local value if the write fails" matches `:34-43`; "A guest's avatar is kept in memory only... Restoring a guest session clears any avatar left over from a signed-in one" matches `:15-18` (`isAnonymous` branch sets `null` unconditionally).
- `structure-and-state.md`'s `src/modules/` paragraph: "`avatars/` holds the static player-avatar catalog... and the lobby's `AvatarPickerButton`" — matches the actual folder layout (`src/modules/avatars/avatar-catalog.ts`, `src/modules/avatars/components/AvatarPickerButton/`).
- No claim found that the code doesn't support. No drift to report.

### Preview-b finding (mobile dialog gutter)
Confirmed `AvatarPickerButton.styles.ts:7` (`dialogContent`) has no `max-w-[calc(100vw-2rem)]` or equivalent mobile margin, and `src/components/ui/dialog.tsx:33` base is `w-full max-w-lg` with no built-in inset — so at 390px the dialog is genuinely edge-to-edge, confirming preview-b's root cause exactly.
This is a real, if narrow, deviation from `ui-design.md:31`'s literal instruction ("Dialog becomes a `DialogContent` that is `max-w-[calc(100vw-2rem)]`"), not merely "Radix default clamping," as preview-b's note paraphrased it — the spec's parenthetical about Radix's default `max-w-lg` clamp is background rationale for *why a mobile override is still safe to add*, not a statement that no override is needed. So, read literally, line 31 was not followed.
Still non-blocking, because the acceptance-criteria checklist — which plan.md line 7 declares "authoritative for tester-b / ui-verify," overriding the rest of ui-design.md's prose — only requires "the picker dialog and its 5x5 grid fit without horizontal scroll and without clipping any cell" at 390px. preview-report.md confirms this holds (`scrollWidth <= innerWidth` in every state, no clipped cell, grid padded ~30px from each edge). The missing 16px *dialog chrome* gutter (as opposed to the grid's own padding) is a cosmetic gap from the literal design doc, not from the governing acceptance criterion, and matches `CreateGameDialog`'s existing chrome (no precedent broken). Confirmed per the task instructions as accepted, with the correction that the citation should be "the AC checklist overrides ui-design.md:31's literal instruction," not "ui-design.md:31 itself accepts the default." Owner if ever revisited: implementer-b, `AvatarPickerButton.styles.ts:7`.

### Import cycle (session ↔ avatars)
Confirmed only in `review.md` (Phase 2 section, Finding 3 above), not in any `docs/architecture/*.md` file — `grep -rn "cycle\|circular" docs/architecture/*.md` returns no hit in the three edited/new files for this task. Correct: it's an internal module-dependency wart, not a documented game rule or architecture fact, so leaving it out of `docs-sync`'s edit was the right call per the task's own framing. No action needed in Phase 3.

### Findings
None blocking. One cosmetic correction to preview-report's root-cause phrasing (above), recorded here rather than requiring a resubmission.

VERDICT: APPROVED
