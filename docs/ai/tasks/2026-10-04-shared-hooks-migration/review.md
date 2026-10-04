# Final review: Shared hooks migration, phase 1

VERDICT: APPROVED

## Checks run
- `npm run typecheck`: clean, no errors (`tsc --noEmit` exit 0).
- `npm run lint`: `eslint . --max-warnings 0 --no-error-on-unmatched-pattern` — 0 warnings/errors.
- `npm test`: `Test Suites: 2 failed, 167 passed, 169 total` / `Tests: 1737 passed, 1737 total`. The 2 failed suites are `.agents/skills/caveman-explore/tests/skill-file.test.mjs` and `.agents/skills/caveman-learn/tests/skill-file.test.mjs` — pre-existing node-test-runner files unrelated to this task (last touched in `374721a`, before this task started; `.agents/` is Antigravity config per `CLAUDE.md`). Every Jest test in `src/` passes.
- ui-verify: started `npm run dev` on :9002, ran `node .claude/skills/ui-verify/scripts/snapshot.mjs http://localhost:9002/` → `PASS desktop`, `PASS mobile`, `0 failing` (no console errors). Screenshot `test-results/ui-verify/home--desktop.png` shows the login page rendering normally, confirming `PlayerProvider` (now imported from `@/modules/session` in `src/app/layout.tsx`) wires up without a stale-import crash.

## Plan adherence
- `src/hooks/use-game-engine.ts`, `use-player.tsx`, `use-toast.ts`, `use-is-mobile.ts`, `use-mobile.ts` no longer exist; `git status` shows all five as `D`, `src/hooks/` is gone from the tree — met.
- Every call site resolves through a module's public `index.ts`: verified every edited call site (`src/app/layout.tsx`, `page.tsx`, `src/features/game/components/GameBoard.tsx`, `PlayerInfoBar.tsx`, `src/components/ui/toaster.tsx`, `sidebar.tsx`, `AbilitiesDialog.hook.ts`, `Lobby.hook.ts`, `MapGrid.hook.ts`, `game-board.hook.ts`, `game-board.hook.types.ts`, plus the 8 test-file `jest.mock` path edits) now imports `@/modules/shared`, `@/modules/session`, or `@/modules/game-board` — met. `grep -rn "hooks/use-game-engine\|hooks/use-player\|hooks/use-toast\|hooks/use-is-mobile\|hooks/use-mobile" .` (excl. `node_modules`) over the whole repo: only remaining hits are (a) the deliberately historical mention in `.claude/skills/kiss-dry-solid/SKILL.md:32` ("formerly `src/hooks/use-mobile.ts`...", exactly the plan's own wording), and (b) closed `plan.md`/`review.md`/`refactor.md` records of already-shipped or historical tasks, correctly left untouched.
- No behavior change: diffed every moved file against `git show HEAD:<old path>` line by line.
  - `toast-store.ts`/`use-toast.ts` vs old `use-toast.ts`: reducer, dispatch, dedupe check, `TOAST_LIMIT`/`TOAST_REMOVE_DELAY`, and the effect's `[state]` dependency array (explicitly called out and preserved per the plan's Contracts note) are unchanged; only reformatted (semicolons/quotes) and split.
  - `player.hook.ts`/`player.provider.tsx`/`player-session.service.ts` vs old `use-player.tsx`: `validateSession`, `setUsernameCallback`, `logout`, the `beforeunload` effect, and the lazy `playerId` initializer are byte-equivalent in logic; Firestore calls moved to the service with the same doc refs (`doc(db,'usernames',...)`).
  - `game-board.engine.hook.ts`/`.types.ts`/`services/game-board.engine.service.ts` vs old `use-game-engine.ts`: subscription, bot-turn timeout (1000ms), death-animation scheduling (`remainingTime` formula unchanged), and `isHost`/`isMyTurn`/`globallyRevealedTiles` memos are unchanged; `payload: any` → `payload?: unknown` and `(a: any)` → `(a: DeathAnimation)` are the only semantic-adjacent edits, both type-only as planned.
  - `use-is-mobile.ts`: body unchanged (768px breakpoint, `matchMedia` listener).
- Line-count cap: `toast-store.ts` 167 total/135 countable-ish, `game-board.engine.hook.ts` 149 total/121 countable-ish — both under 150 and lint's `max-lines` rule passed clean, confirming no file in this task exceeds the cap.
- `npm run typecheck`, `npm run lint`, `npm test` pass repo-wide — met (lint 0 warnings, typecheck 0 errors, all Jest suites green; the 2 failing node-test suites are pre-existing and outside this task's scope).

## Findings
None blocking. No non-blocking findings either — the splits, domain placement, and `index.ts` exports all match the File plan exactly; `eslint.config.mjs`'s `LEGACY_PATHS` edit, `docs/README.md`, `docs/ai/refactor.md` row #10, and all four `.claude/skills/*.md` edits match their File plan rows verbatim.

| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| — | — | none | — | — |

## Docs
- `docs/README.md`: updated — removed `src/hooks/` from the legacy-folders callout (line 29) and the `src/hooks/` bullet (former line 51), updated the "Hook Architecture" bullet to name the new locations (`shared/`, `game-board/`, `session/`), and appended `useToast`/`useIsMobile`/`player.provider.tsx`/`game-board.engine.hook.ts` to the `src/modules/` paragraph's `shared/`/`session/`/`game-board/` clauses, each citing this task folder.
