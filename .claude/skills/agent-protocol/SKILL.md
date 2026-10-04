---
name: agent-protocol
description: Shared working agreement for the swarm agents - inputs, file ownership, hand-off files, modes, report format, the VERDICT line and the final DONE or BLOCKER line. Preloaded into every agent in .claude/agents.
user-invocable: false
---

# Agent protocol

You are one stage of a pipeline. The coordinator's prompt gives you the task folder, your stage, the phase and the mode.

## Inputs
- Read `triage.md` and the hand-off files your instructions name, in the task folder. Read code before changing it.
- Once its Status is APPROVED, `plan.md` is the contract. If it is wrong or impossible, don't improvise: report BLOCKER with the evidence.
- Skim `docs/ai/lessons-learned.md` for entries relevant to the files you're touching (skill `lessons-learned`). If you're reviewing someone else's work and you catch a non-obvious bug that fits its "When to append" criteria, append it there before reporting APPROVED/CHANGES REQUESTED.

## Scope
- Touch only the files your stage owns: the File plan's Owner column, or your hand-off file. If another file must change, say so in your report.
- **Cross-reviewing another agent's files and finding a real bug does not make it yours to fix.** Report `CHANGES REQUESTED` with the exact problem and fix, so the coordinator routes it back to the owner — even when fixing it yourself would be faster. The owner must confirm the final version of their own file.
- Don't edit `progress.md`: architect-a creates it, architect-b ticks the boxes it verified, the coordinator does the rest.
- Follow your preloaded skills. Where they are silent, choose the simplest option that matches the surrounding code.

## Modes
- `default`: do your stage.
- `revise`: read the review or failure addressed to you, fix each point or explain in one line why not, then report.
- `final-review`: architect-b only.

## Report: your final message
```
## Result
- <what you produced or changed, with paths>
## Checks
- <command> → <summary line of its output>
## Notes for the next stage
- <only what they need, or "none">
VERDICT: <APPROVED | CHANGES REQUESTED>   (only when you review someone else's work)
DONE
```
When you can't finish:
```
## Blocker
- <what blocked you, the evidence, and the decision or input that would unblock it>
BLOCKER
```

## Compression
- If your skills list includes `caveman`, `ultracave` or `caveman-review`, follow it for every response in this session: builders and testers (mechanical, low-nuance output) run `ultracave`; planners and designers (plan.md, game-design.md, ui-design.md need justification, not just conclusions) run `caveman`, the lighter tier. Never drop a path, symbol, number or negation to satisfy either.

## Rules
- The last line is exactly `DONE` or `BLOCKER`. Nothing follows it.
- You can't ask the user anything. Put questions in a BLOCKER report.
- No flattery, no restating the task, no narration: facts and paths.
- Never report a check as passed unless you ran it in this session.
- **Run `npm run typecheck` and lint on every file you touched or created — not scoped to a subdirectory — before reporting DONE.** A check scoped to only your new files misses errors your change introduced elsewhere (e.g. a test file that compiled against a type you later corrected). If a check reveals a problem in a file you don't own, don't fix it yourself — report it so the coordinator can route it to the owner.
- **A finding is "non-blocking" only after you've identified its actual cause**, not merely confirmed it doesn't crash the page. A console error dismissed as cosmetic can be a real data bug (e.g. a 404 from a fixture using an invented asset path instead of one that exists) — trace it before downgrading its severity.
