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

## Scope
- Touch only the files your stage owns: the File plan's Owner column, or your hand-off file. If another file must change, say so in your report.
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

## Rules
- The last line is exactly `DONE` or `BLOCKER`. Nothing follows it.
- You can't ask the user anything. Put questions in a BLOCKER report.
- No flattery, no restating the task, no narration: facts and paths.
- Never report a check as passed unless you ran it in this session.
