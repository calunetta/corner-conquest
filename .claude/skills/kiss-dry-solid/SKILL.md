---
name: kiss-dry-solid
description: How KISS, DRY and SOLID apply to React and TypeScript in this repo, the legacy anti-patterns not to repeat, and a checklist to run before reporting work as done. Use when planning a change, writing code, or reviewing a diff for over-engineering, duplication or mixed responsibilities.
---

# KISS, DRY, SOLID

## KISS: the simplest thing that fully works
- Meet the acceptance criteria, nothing more. No options, parameters or abstractions "for later".
- A plain function beats a class, a pattern or a library. A new dependency needs a written reason in `plan.md`.
- No files, wrappers or layers that only pass data through.
- If a solution needs a diagram to be understood, look for a simpler one first.

## DRY: one source of truth per piece of knowledge
- Search before writing: Grep for the name, the constant, the logic. Check `src/components/ui/`, `@/lib/utils`, `@/lib/types`, `src/lib/actions/`, each `src/modules/*/index.ts` and `src/modules/shared/`.
- Rules, numbers and types are never duplicated. Import the constant or the reducer; if it isn't exported, export it with a minimal legacy edit instead of copying it.
- Similar-looking code is not always duplication. Extract when the copies must change together, or at the third copy.
- Tests and previews share fixtures (`Name.fixtures.ts`).

## SOLID in React
| Principle | In this repo |
|---|---|
| Single responsibility | View renders, hook manages state, map transforms, service does I/O, styles hold classes. One reason to change per file. |
| Open/closed | Extend with props, `cva` variants or composition (`children`), not with boolean flags inside a component. |
| Liskov substitution | A wrapper around a primitive accepts and forwards that primitive's props (`ComponentProps<typeof Button>`) and keeps its meaning. |
| Interface segregation | Narrow props: pass the fields a component needs, not the whole `GameState`. Map functions take only what they use. |
| Dependency inversion | Views depend on a view model, not on where data comes from. Hooks depend on services and map functions. Legacy context is touched only in hooks. |

## Legacy anti-patterns (don't repeat them)
- A 700-line file mixing reducer, effects and handlers: `src/features/game/context/GameBoardContext.tsx`.
- Zero-prop components that read the whole board context, which can't be previewed or tested in isolation.
- Two entry points for one hook: `src/hooks/use-mobile.ts` only re-exports `src/hooks/use-is-mobile.ts`.
- `any` payloads in action handlers.

## Checklist before DONE
- [ ] Each file has one responsibility; the change is no bigger than the acceptance criteria need.
- [ ] I searched before writing; no constant, type, rule, helper or fixture is duplicated.
- [ ] No speculative options, unused exports, empty files or pass-through layers.
- [ ] Props are narrow; views are pure or split into `NameView` and a connected `Name`.
- [ ] Names speak the game's language (islands, armies, victory points), not the implementation's.
