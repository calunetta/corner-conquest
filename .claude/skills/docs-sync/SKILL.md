---
name: docs-sync
description: Keep docs/README.md and the architecture/game-rules files it links to in sync with the actual code - including bug fixes that change previously documented behavior. Use as a mandatory stage at the end of any phase that touched game rules, architecture, or fixed a bug whose old behavior was documented.
---

# Docs sync

`docs/README.md` is a short index; the actual architecture and game-rules content lives in `docs/architecture/*.md` (each file under ~200 lines, one topic). This skill is how that split stays accurate after a code change, instead of drifting the way a single 450-line file used to.

## When this runs

Mandatory, not optional, whenever a phase's diff:
- Changes a game rule: numbers, costs, win conditions, card/monster/ability effects, turn flow, bot behavior.
- Changes architecture: where code lives, how state flows, a hook's responsibility, a Firestore read/write pattern.
- **Fixes a bug whose old (wrong) behavior is what the docs currently describe.** A bug fix is not exempt just because it "isn't a new feature" — if the doc's text matches the pre-fix behavior, it's now wrong and must be corrected. This is the easiest case to skip by mistake: the diff looks small, so it's tempting to assume nothing doc-worthy happened.

Skip it only when the diff is pure refactor/typo/style with zero behavior or file-location change, or touches no file described anywhere in `docs/README.md` or `docs/architecture/`.

Distinct from `docs/ai/lessons-learned.md` (skill `lessons-learned`): that file is a standing warning for future agents about a *mistake pattern*. This skill updates the docs to state the *current correct behavior*. The same bug fix can need both — a lessons-learned entry if the mistake was non-obvious, and a docs update either way.

## How to do it

1. **Find the owning file.** Read `docs/README.md`'s table to find which `docs/architecture/*.md` file covers the area you changed. If none does (new system), add a row to the table and create a new file following the others' size and structure — don't let any single file grow past ~200 lines; split it into a sibling file first if it would.
2. **Match the section, not just the file.** Each file keeps the global section numbers (`§5`, `§6.3`, …) from the original single-document numbering. Edit the relevant `§N` section in place; don't renumber unless you're deliberately restructuring (if you do, update every `§N` citation across `.claude/skills/`, `.claude/agents/`, `CLAUDE.md`, and the live docs — `docs/gameplay-ideas.md`, `docs/ai/functionality-audit.md` — in the same change; leave historical `docs/ai/tasks/*/*.md` records alone, they're frozen snapshots).
3. **Write exactly what's true now.** State the current rule or architecture plainly, the way the rest of that file already reads — no changelog language ("previously X, now Y") inside the architecture doc itself. If the history of a bug matters, that belongs in `docs/ai/lessons-learned.md` or the task's own `progress.md`, not here.
4. **Verify before writing.** Don't describe a number, prop, or file path you haven't confirmed in the diff or the current source (skill `anti-hallucination`). A docs-sync pass that invents a detail is worse than one that runs late.
5. **Check cross-references.** If you touched a `§N` heading's meaning (not just its prose), grep for that section number across `.claude/skills/`, `.claude/agents/`, `CLAUDE.md`, `docs/gameplay-ideas.md`, and `docs/ai/functionality-audit.md` to see if any citation now points at the wrong thing.

## In the swarm pipeline

Runs as agent `docs-sync`, as its own mandatory stage after `tester-b`/`preview-b` and before the final review, for every phase of every tier that touched game-rules or architecture code (see `.claude/skills/swarm/SKILL.md`'s Phase loop and `.claude/skills/triage/SKILL.md`'s pipeline table). `architect-b`'s final review checks that this stage ran and that the result matches the diff — it does not do the doc edit itself.

For tier XS/S work done without the full pipeline, do this yourself as the last step before the commit; there's no agent to delegate it to.
