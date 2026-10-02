---
name: testing
description: How tests are written and run here - Jest 30 with React Testing Library for map, service, hook and view files, Playwright for e2e flows - including file locations, mocks, fixtures, the logic-before-DOM order and bug reproduction tests. Use when writing or fixing tests, or when verifying any code change.
---

# Testing

## Commands
| What | Command |
|---|---|
| One file or folder | `npx jest <path>` |
| Everything | `npm test` |
| E2E | `npm run test:e2e` (read the E2E section first) |

## Order of work
tester-a must prioritize unit-testing the isolated logic files (the `.map.ts` data transformers and the `.hook.ts` state managers, plus `.service.ts`) before writing DOM-heavy tests for the `.tsx` view. This repo has no Contentful: `.map.ts` files turn Firestore documents and `GameState` into view models. tester-b writes the view tests and e2e specs after tester-a reports DONE.

## Where tests live
- New code: next to the file under test (`Name.map.test.ts`, `Name.hook.test.ts`, `Name.test.tsx`, `name.service.test.ts`).
- Legacy code keeps its `__tests__/` folders (`src/lib/__tests__/`, …).
- E2E: `e2e/<flow>.spec.ts`.

## Logic tests (`.map.ts`, `.service.ts`)
- Table-driven with `it.each` for value rules. Cover empty input, boundaries (goal reached, hand limit, max armies) and invalid input.
- Assert that inputs aren't mutated when the function must be pure.
- Game-state fixtures: build them with the real initializer like `src/lib/__tests__/combat.test.ts` (`initializeGame`, `addPlayerToGame`, `startGame`), or with small typed literals (`{ … } as Player`) when a few fields matter.
- Services: `jest.mock('@/lib/firebase')` and assert what is written. Never call real Firestore.

## Hook tests (`.hook.ts`)
- `renderHook` and `act` from `@testing-library/react`.
- Mock app state at the module boundary:
  `jest.mock('@/features/game/context/GameBoardContext', () => ({ useGameBoard: jest.fn() }));`
  then `jest.mocked(useGameBoard).mockReturnValue({ … } as unknown as ReturnType<typeof useGameBoard>);`
- Timers: `jest.useFakeTimers()` and `act(() => jest.advanceTimersByTime(ms))`.

## View tests (`.tsx`)
- Render the pure `NameView` with data from `Name.fixtures.ts`.
- Query like a player: `getByRole`, `getByLabelText`, `getByText`, scoped with `within(…)`. Test ids only when no role fits.
- Interact with `fireEvent` from `@testing-library/react` (`@testing-library/user-event` isn't installed).
- Assert behavior and ARIA (`aria-current`, `aria-valuenow`, disabled), never Tailwind classes.
- jest-dom matchers (`toBeInTheDocument`, `toHaveAttribute`, …) are available in TypeScript.
- `next/image`: mock it like `src/features/game/components/__tests__/MapDecorations.test.tsx`.

## Bugs
Write the test that reproduces the bug first, run it, and confirm it fails for the reason given in the root-cause analysis. Then fix. The test stays as the regression guard.

## E2E (Playwright)
- Runs against the local Firestore emulator (project `demo-corner-conquest`, `firebase.json`), never the real project. No `.env.local` is needed; Java 21 is. If the emulator can't start, report "e2e not run: <error>" and verify through the testbed (skill `ui-verify`).
- `playwright.config.ts` starts the emulator on 127.0.0.1:8080, then `npm run build && npm run start` on port 3000 with `NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST` set, and stops both at the end. Port 3000 must be free: Playwright never reuses a server it didn't start there.
- Every spec registers `test.afterEach(async ({ page }) => { await safeCleanupGame(page); });` from `e2e/e2e-cleanup.ts`.
- Locate by role, label or `data-testid`; wait with `expect(…).toBeVisible({ timeout })`, never fixed sleeps.
- E2E covers flows across components (create a match → play → leave). Single components are covered by view tests and the testbed.

## Never
- Skip, disable, `.only` or weaken a test to make the suite pass.
- Write snapshot-only tests.
- Report "tests pass" without quoting the summary line of a run from this session.
