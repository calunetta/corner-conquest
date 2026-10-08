# Corner Conquest - Application Architecture

This document and the files it links to are the shared source of truth for the "Corner Conquest" architecture and game rules, used as context for AI-assisted development.

**Development Directives for the AI Assistant:**
The working rules for AI agents (workflow, code layout, testing, verification) live in `CLAUDE.md` and `.claude/`; see `docs/ai/README.md`. These docs stay the source of truth for architecture and game rules:
1.  **Synchronized Documentation:** Every change to game rules or architecture, including a bug fix that changes documented behavior, updates the relevant file below in the same phase, so code and documentation stay in sync. This is a mandatory pipeline stage — see agent `docs-sync` and skill `docs-sync`.
2.  **Blueprint-First Validation:** Before implementing a change, analyze it against the architecture and rules documented here. If the request conflicts with them, report the discrepancy and wait for confirmation before proceeding.
3.  **Automated Testing:** Every feature, UI mechanic, or bug fix ships with unit tests (`npm test`). User flows also get Playwright E2E specs (`npm run test:e2e`); see the `testing` skill for when and how they run.
4.  **Mandatory Verification Pipeline:** After every fix or enhancement, run the project checks in order: TypeScript (`npm run typecheck`), lint (`npm run lint`), unit tests (`npm test`), and E2E where relevant (`npm run test:e2e`).

## 1. Core Technologies

- **Framework:** Next.js with App Router
- **Language:** TypeScript
- **UI:** React, ShadCN UI Components, Tailwind CSS
- **State Management (Local/UI):** React Context + Reducer (`src/features/game/context/GameBoardContext.tsx` consuming `useGameBoard()`)
- **State Management (Shared Game):** Firestore real-time listeners (`useGameEngine`)
- **Testing:** Jest (`npm test`) for unit/reducer tests & Playwright (`npm run test:e2e`) for browser E2E tests
- **Backend/Database:** Firebase (Firestore)

## Architecture & game-rules docs

This file is the index. Each linked file is kept under ~200 lines and owns a self-contained topic, so an agent or reviewer only needs to open the file for the area it's touching:

| File | Covers |
|---|---|
| [`architecture/structure-and-state.md`](architecture/structure-and-state.md) | §2 Project structure & where code goes, §3 Shared vs. local state management, §4 Root-cause debugging philosophy |
| [`architecture/game-mechanics.md`](architecture/game-mechanics.md) | §5 Core mechanics (win condition, map, resources), §6.1–6.5 Turn structure, army selection, army actions, strategic actions, combat flow |
| [`architecture/special-cards.md`](architecture/special-cards.md) | §6.6 Every special card's trigger, UI flow and resolution |
| [`architecture/systems-and-visuals.md`](architecture/systems-and-visuals.md) | §6.7–6.13 UI/UX, fog of war & debug mode, bot logic, mobile responsiveness, tutorial system, E2E test lifecycle, island tile visual/sprite architecture |

Section numbers (`§5`, `§6.3`, …) are stable identifiers used across the codebase's comments, skills, agents and task records — when editing, keep a section's number attached to its content even if you reorder within a file. (2026-10-09: fixed a pre-existing duplicate "§6.3" heading from the original single-file version; everything from the old §6.4 onward shifted up by one. Historical task records under `docs/ai/tasks/` written before this split may cite the old numbers.)
