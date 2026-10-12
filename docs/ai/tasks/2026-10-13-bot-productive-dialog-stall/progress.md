# Progress: Bot never resolves the Productive card dialog

Tier: S · Phases: 1

<!-- Tier S bug pipeline: tester-a implementer-a docs-sync. No plan.md/architect stage;
     root cause already confirmed in triage.md. -->

## Phase 1: Bot resolves the Productive dialog
- [x] failing repro test (tester-a)
- [x] fix (implementer-a)
- [x] checks: typecheck, lint, unit tests (`tsc --noEmit` clean; targeted eslint on touched files clean; `npx jest src/modules/game-rules` → 177 suites / 1963 tests passed. Repo-wide `npm run lint` and `npm test` show thousands of pre-existing failures from other concurrent sessions' `.claude/worktrees/*` being swept into the root run — unrelated to this change, not introduced by it)
- [x] docs updated (docs-sync): `docs/architecture/systems-and-visuals.md` §6.9 and `docs/architecture/special-cards.md` §6.6
- [ ] committed: <hash>

## Log
<!-- One line per stage: YYYY-MM-DD agent: DONE | BLOCKER, short summary -->
