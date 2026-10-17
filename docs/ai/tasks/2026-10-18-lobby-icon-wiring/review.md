# Final review: Lobby icons through the registry, phase 1/1

VERDICT: APPROVED

## Checks run
- `npx tsc --noEmit`: clean, no output (errors elsewhere, e.g. MonsterSpriteUploader, are from another session's uncommitted work and out of scope here).
- `npx eslint --max-warnings 0 <10 touched lobby files>`: clean, no output.
- `npx jest src/modules/lobby --modulePathIgnorePatterns '.claude/worktrees'`: `Test Suites: 17 passed, 17 total`, `Tests: 248 passed, 248 total`.
- ui-verify: not run this session — no preview-b report exists in the task folder (only `plan.md`, `progress.md`, `triage.md`). The change is a prop-for-prop `lucide` glyph → `RegistryIcon` swap verified line-by-line against the plan's contracts and diffs below; default overrides are empty (`CreateGameDialog.test.tsx` mocks `icon-overrides.config.json` to `{}`), so no visual difference is expected. Recommend a browser pass before closing the task if one hasn't happened in another lane.

## Plan adherence
- Every lucide glyph in `Lobby.tsx`, `RejoinMatchPanel.tsx`, `LobbyGameRow.tsx`, `CreateGameDialog.tsx`, `CreateGameDialog.preview.tsx` now renders through `RegistryIcon` — met. Confirmed `grep -rn "lucide-react" src/modules/lobby/` returns nothing.
- `FormatOption.icon` is `string`; `CreateGameDialog.types.ts` drops the `LucideIcon` import — met (`CreateGameDialog.types.ts:23-27`, import removed).
- `CreateGameDialog.map.ts` returns registry ids (`bot`, `swords`, `users`, `crown`) exactly per the plan's contract — met.
- `npm run typecheck`, `npm run lint`, `npm test` pass — met for the anchored checks above (full-repo `npm test`/`npm run lint` intentionally not run per instructions; scoped jest run and scoped lint both clean).
- No visible change expected — met by construction (prop-identical swap, overrides empty by default).
- Test edits are the minimal ones described: `CreateGameDialog.map.test.ts` now asserts the exact id array `['bot', 'swords', 'users', 'crown']` (plan's step 3); `CreateGameDialog.hook.test.ts` carries the equivalent exact-id assertion; `CreateGameDialog.test.tsx` adds `jest.mock('@/modules/icons/icon-overrides.config.json', () => ({}))` and is otherwise unchanged — met.

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| 1 | `src/modules/lobby/components/CreateGameDialog/CreateGameDialog.tsx:47`, `CreateGameDialog.preview.tsx:52` | Deleting `const Icon = opt.icon;` left `const isSelected = …` indented ~36 spaces instead of the surrounding 18-space indent (stray whitespace from the diff, not a tab/space mix lint catches). Doesn't affect behavior, typecheck, or lint (no indent rule configured), but doesn't match surrounding code per `code-standards`. | implementer-b | No |
| 2 | `src/modules/shared/index.ts`, `src/modules/icons/icon-overrides.config.json`, `src/modules/shared/collector-sprite.ts` (+`.test.ts`) | Uncommitted changes/untracked files in the working tree belong to other in-flight tasks (`hud-icon-wiring`'s `toCollectorIdleSprite` export, and the user's own icon-overrides edits per the coordinator's note). Not touched by this task's plan or diff reviewed above — flagging only so this phase's commit stages exactly the 11 lobby/plan files and not these. | coordinator | No (scoping note, not a defect) |

## Docs
- `docs-sync`: not needed. Pure glyph-source refactor, no game rule or documented architecture behavior changed (acceptance criteria explicitly require no visible change).
