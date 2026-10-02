# Plan: <title>

Status: <DRAFT | APPROVED>
Inputs: triage.md<, game-design.md (Final spec)><, ui-design.md (Final spec)>

## Goal and acceptance criteria
- [ ] <observable outcome>

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `GameState` | `src/lib/types/game.ts:<line>` | <reason> |

## Root cause (bugs only)
- Reproduction: <steps or failing test>
- Cause: <what is wrong, with path:line evidence>

## Decisions
- <decision> because <reason>. Rejected: <alternative> (<why>).

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/<domain>/components/<Name>/<Name>.hook.ts` | new | <one responsibility> | implementer-a |

## Contracts
```ts
// Exact types, props, hook return shape and map/service signatures.
// Implementers code against this block; changing it requires architect sign-off.
```

## Phases
### Phase 1: <title>
1. <small, verifiable step> (<owner>)

Model escalation: <steps that need sonnet, or none>

## Test plan
- tester-a (logic, first): <cases for *.map.ts, *.service.ts, *.hook.ts>
- tester-b (view and e2e): <cases for *.tsx; e2e flow if any>

## Preview states
- <ComponentName>: <Default, Empty, ...> (<fixtures>)

## Risks
- <risk and mitigation>

## Review (architect-b)
VERDICT: <APPROVED | CHANGES REQUESTED>
- <findings, each with evidence>
