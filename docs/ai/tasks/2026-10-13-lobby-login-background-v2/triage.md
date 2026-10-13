# Triage: Implement the "Home Islands" lobby/login background

Request: Build the real `LobbyBackground` component for the design already agreed through several rounds of an interactive HTML/CSS sketch (reference artifact below) — dusk sky + sea + slow-spawning clouds + three real-tile-styled islands (base, resource, monster) — and fix the mount/navigation bug while at it.
Type: component
Tier: M
Pipeline: architect-a architect-b implementer-a implementer-b tester-a tester-b preview-a preview-b docs-sync architect-b:final-review
Overrides: none
Phases: 1

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier
- Single shared component rewrite (`src/modules/lobby/components/LobbyBackground/`) plus its two consumers (`Login.tsx`, `Lobby.tsx`) and the mount point (`src/app/page.tsx`) — one module, full visual rebuild: tier M, not S.
- Visible UI signal: yes. **`ui-designer-a`/`ui-designer-b` are deliberately skipped** — the user drove the design themselves through ~8 rounds of a published, iteratively-corrected HTML/CSS artifact (https://claude.ai/artifact/8jzZZvb4CSnyrXwHtyceL4), verified in a real browser along the way (caught and fixed real layout bugs: a CSS stacking bug, a flex percentage-height bug, island overlap, monsters escaping their tile). That artifact is the agreed, final visual spec; architect-a treats it as `ui-design.md` would normally serve, cited directly in this triage doc instead of re-deriving it.
- Gameplay signal: no rule/balance change — purely decorative reuse of real sprites, slot coordinates (as literal values, not imports) and the real `AnimatedMonster` hook. No game-designer stage.
- **Hard architectural constraint, the actual point of this task**: every position/size value for the decorative islands (tile size, gaps, slot coordinates, cloud timing) must live in a new file/files owned by `LobbyBackground`, with **zero import from `src/modules/map/island-tile-slots.types.ts`** — that file holds the real board's locked slot values (standing user rule: never edit without explicit ask, see `docs/ai/lessons-learned.md` / memory). Several of the lobby background's starting numbers happen to equal values from that file, copied as literals, not references — architect-a's plan must make this a named file-ownership rule, and `architect-b`'s review must verify zero cross-import before approving.
- Known bug to fix in the same phase: `LobbyBackground` is currently mounted separately by `Login.tsx` and `Lobby.tsx`, so it fully unmounts/remounts on navigation between them — needs a single persistent mount (e.g. in `src/app/page.tsx`), already scoped once in this conversation's prior (fully reverted) attempt.
- Confirmed reusable as-is, no fork needed: `src/modules/map/components/AnimatedMonster/` (`AnimatedMonster.tsx` + `.hook.ts` + `.types.ts`) takes a `Monster`-shaped prop (`@/lib/types`) and runs exactly the wander/attack algorithm the agreed design wants, unmodified. Its `Tooltip` wrapper needs a `TooltipProvider` ancestor (`IslandTile.tsx:83`) — architect-a's plan must say whether `LobbyBackground` adds its own provider or whether the tooltip is suppressed for this decorative use.
- Risk: low. No Firestore, no game-rules reducers, no `GameState` change. The only non-trivial ask is the file-ownership/decoupling rule above, which is a one-line review check, not complex logic.

## Scope
- In: Full rebuild of `LobbyBackground` (view, styles, a new lobby-owned position/size constants file, hook(s) for the monster/cloud behavior reusing real logic where it exists), wiring a single persistent mount in `page.tsx`, removing the component's render from `Login.tsx`/`Lobby.tsx`, matching the agreed artifact's composition (dusk sky, sea, 4-5 clouds on the spawn/drift/fade loop, three islands — base/resource/monster — sized and spaced per the artifact's final version, monster layer clipped to its tile).
- Out: Any change to the real game board, `IslandTile`, `TileResources`, `AnimatedMonster`, or `island-tile-slots.types.ts` themselves (read-only reference only); any gameplay/rule/balance change; final pixel-tuning of the decorative islands' exact position/size numbers — the user is doing that hand-tuning themselves in the new constants file this task creates, so the file's initial values only need to be reasonable (matching the artifact), not pixel-final.

## Open questions
- None — proceeding; the one real open design question (whether the monster tooltip should be suppressed for this decorative context) is delegated to architect-a as a plan-level decision, not a blocker.
