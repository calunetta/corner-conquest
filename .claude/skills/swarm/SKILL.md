---
name: swarm
description: Coordinator playbook for running the agent pairs on a triaged task - stage order, what to pass each agent, waiting for the DONE/BLOCKER sentinel, proposer/challenger revision rounds, phases with commits, and model escalation. Use after triage, when asked to run the swarm or pipeline, or to resume a task folder.
argument-hint: "[task folder or request]"
---

# Swarm coordinator

You, the main session, coordinate. You route work, check results and keep `progress.md` current; agents write the code.

## Before starting
- The task folder must contain `triage.md`; if not, run skill `triage` first.
- Read `triage.md` (Pipeline, Overrides, Phases) and, when resuming, `progress.md`: continue from its first unticked box.
- Run skill `ultracave` for your own coordinator messages (status updates, phase stops, user-facing reports) for the rest of this run. Agents already carry their own tier (`caveman` for planners, `ultracave` for builders) via `.claude/agents/*.md` — don't override it.

## Stages
| Stage | Agents | Reads | Writes |
|---|---|---|---|
| Game design | `game-designer-a` → `game-designer-b` | triage.md, `docs/README.md` §5–6, rule code | game-design.md |
| UI design | `ui-designer-a` → `ui-designer-b` | triage.md, game-design.md, current UI | ui-design.md |
| Plan | `architect-a` → `architect-b` | all of the above, code | plan.md (Status: APPROVED), progress.md |
| Build | `implementer-a` ∥ `implementer-b` | plan.md, ui-design.md | logic files ∥ view files, then cross-review |
| Tests | `tester-a` → `tester-b` | plan.md, code | tests |
| Previews | `preview-a` → `preview-b` | plan.md, ui-design.md | `*.preview.tsx`, registry, screenshots |
| Final review | `architect-b` (Mode: final-review) | plan.md, `git diff`, checks | review.md |

## Spawning an agent
Agent tool, `subagent_type` = the agent name. Pass `model` only when `Overrides:` names that agent. Prompt:
```
Task folder: docs/ai/tasks/<folder>
Stage: <stage>   Phase: <n>/<total>   Mode: <default | revise | final-review>
Do your stage as your instructions define it and end with DONE or BLOCKER.
```
In revise mode add: `Address the review in <file>, section "Review (<agent>-b)"`, or paste the failing check output. Pass paths, not file contents: agents read the files themselves.

## Never run two `npm install`s at once
All agents share one `node_modules` and `package-lock.json`. Two agents adding a devDependency at the same time (even for different, unrelated tasks) can corrupt the lockfile — an unrelated package silently disappears from it, breaking every test suite on the next clean install, and the failure looks nothing like its cause. Before spawning an agent whose job includes `npm install`, confirm no other running agent is also installing; if several tasks need new dependencies, install them yourself up front (or run those stages one at a time) rather than letting parallel agents race on `package.json`. If `npm test` ever fails identically across every suite with a "Cannot find module" for a package nobody touched, suspect this before anything else: `git diff package-lock.json`, then a clean `npm install` (fixing any peer-dependency conflict first) usually repairs it.

## The sentinel
- Every agent ends with a final line that is only `DONE` or `BLOCKER` (bold and surrounding spaces are tolerated).
- Wait for it before starting the next stage. Never run two dependent stages at once.
- No sentinel counts as BLOCKER.
- BLOCKER: stop the pipeline, tick nothing, show the user the agent's `## Blocker` section and ask how to proceed.

## Proposer and challenger
- After every `-b` agent, read its `VERDICT:` line. APPROVED: next stage. CHANGES REQUESTED: resume the `-a` agent with Mode: revise, then the `-b` agent again. After two rounds without approval, stop and show the user both positions.
- **Resume, don't respawn, within the same coordinator session.** If the `-a` agent is still addressable (you hold its id from this session's `Agent` call), send the revise-mode prompt to it with `SendMessage` instead of a fresh `Agent` call. It already has its skills, the code it read, and the task folder in context — a fresh spawn re-derives and re-pays for all of that from zero. Only fall back to a fresh `Agent` call when the agent id isn't addressable (e.g. you're resuming a task folder in a new coordinator session and the prior run's agents no longer exist).
- `implementer-a` and `implementer-b` own disjoint files: spawn them in parallel. Each report ends with a VERDICT on the other's files; route requested changes to the owner.
- The cross-review needs both sets of files to exist. If one implementer finishes first and reports "nothing to review yet", wait for the other, then resume the first with SendMessage ("their files now exist, finish your cross-review"). Don't accept a VERDICT-less report as done.
- Final review is per phase for tier L, even if `progress.md` lists it only once. If architect-a drops a phase's final-review box, put it back; skipping it leaves that phase checked only by tests and cross-reviews.
- An agent that dies on an API or rate-limit error (no sentinel, no report) is not a BLOCKER of the task: re-run it once from scratch and say in the prompt that no partial report exists. A second failure goes to the user.
- `tester-a` before `tester-b` (logic first); `preview-a` before `preview-b`.

## Phase loop
For each phase of `plan.md`:
1. Build, tests, previews (only the stages in the pipeline).
2. Run `npm run typecheck`, `npm run lint`, then `npm test`. A failure goes back to the owning agent in revise mode with the output.
3. Skill `ui-verify` on the previews and pages `plan.md` lists.
4. Final review by `architect-b`. CHANGES REQUESTED: route each finding to its owner, then review again (two rounds at most).
5. Tick `progress.md`, add the log lines, update `docs/README.md` if rules or architecture changed, and confirm the reviewing agent appended to `docs/ai/lessons-learned.md` (skill `lessons-learned`) if this phase's review caught a non-obvious bug.
6. Commit code and task folder together: `<type>(<module>): <phase title> [phase n/N]`.
   - Other sessions and tasks may be editing the same working tree. Run `git status`, then `git add` the task's files by path (never `-A` or `.`), and leave every other task's files, untracked ones included, for its own session. `git status` again before committing.
   - The hash only exists after the commit. Tick `committed: <hash>` in a small follow-up `docs(<module>): record phase n commit hash` commit, and set the task's row in `docs/ai/refactor.md` if it has one.
   - A check that cannot run here (e2e without Java 21) is written into `progress.md` as "not run: <error>", not ticked silently and not treated as a blocker. Say it in the report to the user.
7. If phases remain, stop: "Phase n/N committed (<hash>). Type `continue` for phase n+1." Don't start it before the user does.

## Escalation
- An agent call fails with a transient infra error (rate limit / `429`, a stream stall, "no progress for Ns") rather than a reported BLOCKER: retry the same spawn once, same model and prompt, before treating it as anything else. Only escalate or treat it as a real BLOCKER if the retry also fails.
- A haiku builder returns a genuine BLOCKER (not an infra failure) twice on the same step: re-spawn it with `model: sonnet`.
- A sonnet builder is blocked: ask `architect-a` (revise mode) whether the plan is wrong; still blocked, ask the user.
- Don't silently fix an agent's work yourself. If you take over a small fix, record it in `progress.md`.

## Headless runs
`scripts/claude-swarm-runner.sh <task-folder> [agent …]` runs the same pipeline through the Claude CLI with the same sentinel, verdict and round rules (`--dry-run` prints the commands). Use it when the user wants an unattended run.

Agent teams (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`) are experimental and don't run with `claude -p`, so this setup uses sub-agents plus hand-off files, which work in both modes. Use teams only when the user asks.
