---
name: lessons-learned
description: Read or append entries in docs/ai/lessons-learned.md, the cross-task record of non-obvious mistakes this project's agents have made and the rule that prevents each one. Use at the start of any stage to check for entries relevant to the files you're touching, and after a gate, final, or cross-review catches a real bug the plan or an earlier check missed.
---

# Lessons learned

`docs/ai/lessons-learned.md` is a durable record, separate from any one task's `progress.md`. A task's progress file is history for that task; this file is a standing warning for every future task.

## Reading it

Before writing or reviewing code in an area, skim the file's section headers (hooks & effects, testing/Jest, TypeScript casts, etc. — headers grow over time) and read any entry whose topic overlaps your files. Don't re-explain an entry you apply — just follow its rule, and if your own change would otherwise repeat the mistake, say so in your report instead of silently avoiding it.

## When to append

Append an entry only when a review step (architect-b's gate review or final review, or an implementer's cross-review of the other implementer's files) catches something that:
- Is **non-obvious**: it passed typecheck, lint, and the existing tests, and a careful reader could plausibly write it again.
- Is **general**: the rule it implies applies beyond this one file or task, to a pattern (a kind of refactor, a tool's quirk, a cast, a data-source ambiguity).

Don't append:
- Style nits, naming preferences, or anything the linter would already catch.
- One-off typos or a plan that was simply wrong about a file path (that belongs in the task's own `progress.md`, not here).
- Anything you haven't verified — reproduce the bug or the fix yourself before writing the rule down, per skill `anti-hallucination`.

## How to append

1. Pick the existing section that fits (by topic, not by task), or add a new `##` section if none fits — keep section names short and topic-based, never per-task.
2. Add one bullet in this exact shape, newest first in its section:
   ```
   - **<what went wrong, one sentence, in bold>** → <the rule that prevents it, one sentence>. (source: <task folder>, <YYYY-MM-DD>)
   ```
3. Keep it to two sentences. Anyone reading the whole file later should be able to skim it in under a minute.
4. This file is small and append-mostly: if an entry has clearly been superseded (the pattern it warns about no longer exists in the codebase, e.g. the file it's about was deleted), remove it instead of letting it go stale — but don't remove an entry just because you haven't verified it's still relevant.

## In the swarm pipeline

The `swarm` skill's phase loop ticks `progress.md` (step 6), after `docs-sync` (step 4) has updated the relevant `docs/architecture/*.md` file when behavior changed. Add this entry at the `progress.md` step: if this phase's gate review or final review caught something that qualifies per "When to append" above, append it here before moving on. This is the reviewer's responsibility (architect-b, or an implementer cross-reviewing), not the coordinator's — the coordinator only checks it happened.
