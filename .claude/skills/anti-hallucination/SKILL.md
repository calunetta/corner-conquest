---
name: anti-hallucination
description: Verification protocol against invented files, symbols, props, commands, versions, library APIs or game rules, and against claiming checks that were not run. Use before citing, importing or calling anything, while planning, whenever unsure, and before reporting work as done.
---

# Anti-hallucination protocol

A wrong claim costs more than "I don't know". Verify, then state.

## Verify before you rely on it
| You want to rely on | Verify with |
|---|---|
| A file or folder | Glob or `ls`. Paths in docs and plans drift. |
| A function, component, hook or constant | Grep for its definition; Read the signature. |
| A prop or type field | Read the type (`src/lib/types/*.ts`, the component's props). |
| An npm script | `package.json` → `scripts`. |
| A library API | The installed version (`node_modules/<pkg>/package.json`) and its `.d.ts` files, not memory. At bootstrap: Next.js 15.3, React 18, Tailwind 3, Jest 30, Playwright 1.62. APIs from other major versions don't apply. |
| A game rule or number | The code: `src/modules/game-rules/`, `src/lib/game-initializer.ts`, `src/lib/card-data.ts`. `docs/README.md` explains intent; when they disagree the code wins, and you report the drift. |
| A UI behavior | A test you ran, or the browser (skill `ui-verify`). |

## Never
- Invent a path, import, prop, CSS token, test id or command.
- Assume an export exists because the name sounds right.
- Claim typecheck, lint or tests passed without running them in this session. Quote the summary line instead (`Tests: 52 passed, 52 total`).
- Claim a UI works without looking at it in a browser.
- Fill a gap in the requirements with a guess. Ask (main session) or report BLOCKER (sub-agent).

## How to state things
- Cite evidence as `path:line`.
- Label what you couldn't check: "unverified: …".
- In plans, list each existing symbol you rely on under "Verified context" with its location; mark new symbols as new.
- Quote code rather than paraphrase it when precision matters.

## Before DONE
1. Re-open each file you changed and confirm the change is there.
2. Run the checks your stage requires and read their output.
3. Re-read your report: every path, number and claim in it is verified.
