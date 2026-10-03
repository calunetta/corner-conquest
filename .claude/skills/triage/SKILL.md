---
name: triage
description: Size a feature, component, bug fix, refactor or gameplay request (tier XS to XL) and decide which agent pairs run, in which order, on which models, in how many phases; writes the task's triage.md. Use first for any request that will change code, before planning or editing.
argument-hint: "[what to build or fix]"
---

# Triage

Match the effort to the task: a typo never needs twelve agents, and risky game logic never gets one cheap pass.

## 1. Understand the request
- Restate it in one line. If the goal or the expected behavior is unclear, ask the user now (all questions in one message) and stop.
- Find the code it touches with Glob and Grep; verify every path you will cite (skill `anti-hallucination`).

## 2. Read the signals
| Signal | Question |
|---|---|
| Size | How many files, which layers (data, logic, view)? |
| Gameplay | Does it change rules, numbers, cards, monsters, economy, turn flow, win conditions or bots? |
| Visible UI | Will the player see something new or different? |
| Data | Firestore writes, document shape or `GameState` fields? |
| Risk | Game-rule reducers (`src/modules/game-rules`), timers, concurrency, multiplayer sync? |
| Bug | Is it reproducible? Is the root cause known? |

## 3. Pick the tier
| Tier | Typical scope | Pipeline |
|---|---|---|
| XS | Copy, typo, style or config tweak; one file, no logic | No agents and no task folder. Edit directly, run the checks. |
| S | Small fix or tweak, 1–3 files, one layer, obvious solution | `implementer-a tester-a` (bug: `tester-a implementer-a`) |
| M | New component, or a feature inside one module, or a bug that needs root-cause analysis | `architect-a architect-b implementer-a implementer-b tester-a tester-b preview-a preview-b architect-b:final-review` |
| L | Feature across modules, gameplay change, `GameState` or Firestore shape change | M's pipeline, run once per phase after the planning stages |
| XL | Epic | `architect-a architect-b` only: a roadmap of L tasks. Stop for approval, then triage each one. |

Add or drop stages:
- Prepend `game-designer-a game-designer-b` when the Gameplay signal is yes (any tier from S), and for "make the game more fun" requests, where only the game designers run.
- Insert `ui-designer-a ui-designer-b` before the architects when the Visible UI signal is yes, from tier M. At S, implementers follow existing patterns.
- Drop `preview-a preview-b` when no component is created and no visual state changes.
- Bugs from tier M: put `tester-a` right after the architects so the failing reproduction test exists before the fix.

## 4. Pick the models
- Planners (`game-designer-*`, `ui-designer-*`, `architect-*`) run on claude-sonnet-5, from their files.
- Builders (`implementer-*`, `tester-*`, `preview-*`) run on haiku, from their files.
- Escalate a builder to sonnet in `Overrides:` when its work touches game-rule reducers, Firestore writes or transactions, timers or concurrency, or a cross-module refactor, and for every builder in L tasks.
- At run time, a haiku builder that returns BLOCKER twice on the same step is re-run on sonnet (skill `swarm`).

## 5. Phases
One phase if the task fits in about 6 files and one sitting; otherwise estimate the count here and let architect-a cut the phases (one layer or about 6 files each).

## 6. Write the record
1. Create `docs/ai/tasks/<YYYY-MM-DD>-<kebab-slug>/` and copy `docs/ai/templates/triage.md` into it as `triage.md`. Fill every field. Keep `Pipeline:` space-separated agent names and `Overrides:` as `agent=model` pairs or `none`: `scripts/claude-swarm-runner.sh` parses both lines.
2. Show the user a five-line card: tier, why, pipeline, models, phases.
3. XS, S, M: continue with skill `swarm` unless there are open questions. L, XL: wait for the user's go-ahead.

Never raise the tier to look thorough, and never lower it to save time on risky code.
