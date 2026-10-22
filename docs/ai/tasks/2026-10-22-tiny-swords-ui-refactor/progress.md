# Progress: Tiny Swords UI refactor

Tier: XL · Phases: 7 (see triage.md). Phase 1 is split into 1a-1e and Phase 2 into 2a-2h (see plan.md); phases 3-7 are planned when reached.

## Phase 1a: theme and fonts (layout.tsx, tailwind.config.ts, globals.css, theme-tokens test)
- [x] plan approved (architect-b)
- [x] implementation (implementer-b)
- [x] tests (tester-a)
- [x] checks: typecheck, lint, unit tests
- [x] UI verified (ui-verify): `/`, `/testbed/session-login`, `/testbed/lobby-main`, body font Pixelify Sans
- [x] final review (architect-b)
- [ ] committed: 66250b3

## Phase 1b: slice engine (types, asset-url, slice.map, SliceFrame/NineSlice/ThreeSlice, barrel)
- [x] implementation (implementer-a, implementer-b)
- [x] tests (tester-a, tester-b)
- [x] previews (preview-a, preview-b)
- [x] checks: typecheck, lint, unit tests
- [x] UI verified (ui-verify): `/testbed/slice-frame`, 400% zoom, no seams
- [x] final review (architect-b)
- [ ] committed: 25880b9

## Phase 1c: Ribbon and PixelPanel
- [x] implementation (implementer-a, implementer-b)
- [x] tests (tester-a, tester-b)
- [x] previews (preview-a, preview-b)
- [x] checks: typecheck, lint, unit tests
- [x] UI verified (ui-verify): 5 variants, 3 sizes, ribbon contrast, two-tone focus ring on paper and wood
- [x] final review (architect-b)
- [ ] committed: a414fb0

## Phase 1d: PixelBar and PixelIcon
- [x] implementation (implementer-a, implementer-b)
- [x] tests (tester-a, tester-b)
- [x] previews (preview-a, preview-b)
- [x] checks: typecheck, lint, unit tests
- [x] UI verified (ui-verify): bar track alignment (tune `BAR_ART`), icons at 32 and 64 px
- [x] final review (architect-b)
- [ ] committed: 888d457

## Phase 1e: PixelButton, typography preview, docs, Phase 1 close-out
- [x] implementation (implementer-a, implementer-b)
- [x] tests (tester-a, tester-b)
- [x] previews (preview-a, preview-b)
- [x] checks: typecheck, lint, unit tests
- [x] UI verified (ui-verify): all pixel-ui previews at 1280x720 and 390x844; label contrast, 48x48 icon hit box, no 404 under `/tiny-swords`
- [x] typography verdict recorded in Log (Pixelify vs Outfit at 14 px)
- [x] docs-sync
- [x] final review (architect-b)
- [ ] committed: 689a301

## Phase 2a: PixelButton prerequisites (types, map, hook, styles, tsx; neutral variant, forwardRef, composed handlers)
- [x] plan approved (architect-b)
- [x] implementation (implementer-a, implementer-b)
- [x] tests (tester-a, tester-b)
- [x] previews (preview-a)
- [x] checks: typecheck, lint, unit tests (quote summary lines)
- [x] UI verified (ui-verify): `/testbed/pixel-ui-button` neutral states, computed `filter` brightness(1.1) on hover, art url `Button_Hover_3Slides`
- [x] final review (architect-b)
- [ ] committed: a6d4c2b

## Phase 2b: Ribbon ReactNode/forwardRef/rest props and PixelPanel `padding="none"` + `rootClassName`
- [ ] implementation (implementer-a, implementer-b)
- [ ] tests (tester-a, tester-b)
- [ ] previews (preview-a)
- [ ] checks: typecheck, lint, unit tests (quote summary lines)
- [ ] UI verified (ui-verify): `/testbed/pixel-ui-ribbon` "Node children"; `/testbed/pixel-ui-panel` unchanged
- [ ] final review (architect-b)
- [ ] committed: <hash>

## Phase 2c: Button bridge (button.tsx, HUD `size="plate"` x3 tags, button.test.tsx, shadcn-bridge preview + registry)
- [ ] implementation (implementer-a, implementer-b)
- [ ] tests (tester-a, tester-b)
- [ ] previews (preview-a)
- [ ] checks: typecheck, lint, unit tests (quote summary lines)
- [ ] full `npm test` run read; failing tests listed with cause (expected none)
- [ ] UI verified (ui-verify): `/testbed/shadcn-bridge` buttons at 1280x720 and 390x844; tooltip on sprite and asChild triggers; HUD button boxes (`/testbed/hud-actions-panel`, `/testbed/hud-game-board-header`) same size as before
- [ ] final review (architect-b)
- [ ] committed: <hash>

## Phase 2d: Dialog family (dialog-frame.tsx, dialog.tsx, alert-dialog.tsx, sheet.tsx, DeleteAccountButton variant, tests, dialog previews)
- [ ] implementation (implementer-a, implementer-b)
- [ ] tests (tester-a, tester-b)
- [ ] previews (preview-a)
- [ ] checks: typecheck, lint, unit tests (quote summary lines)
- [ ] full `npm test` run read; failing tests listed with cause; test edits justified in the log
- [ ] UI verified (ui-verify): shell 374 / text column 310 at 390 px, close button inside frame and clear of ribbon, contrast samples on dark field, sheet edge bleed, CombatDialog hybrid (`/testbed/combat-combat-dialog`), tunable values reported old/new in the log
- [ ] final review (architect-b)
- [ ] committed: <hash>

## Phase 2e: Card, Input, Textarea, Label, Badge, Progress (plates)
- [ ] implementation (implementer-a, implementer-b)
- [ ] tests (tester-a, tester-b)
- [ ] previews (preview-a)
- [ ] checks: typecheck, lint, unit tests (quote summary lines)
- [ ] UI verified (ui-verify): `/testbed/lobby-main`, `/testbed/session-login`, `turn-countdown-timer` badge; Input boundary contrast >= 3:1 and primary-foreground ratio recorded
- [ ] final review (architect-b)
- [ ] committed: <hash>

## Phase 2f: Tooltip, Popover, Tabs, Toast (plates)
- [ ] implementation (implementer-a, implementer-b)
- [ ] tests (tester-a, tester-b)
- [ ] previews (preview-a)
- [ ] checks: typecheck, lint, unit tests (quote summary lines)
- [ ] UI verified (ui-verify): TutorialBeacon and LobbyGameRow popovers same size class behaviour
- [ ] final review (architect-b)
- [ ] committed: <hash>

## Phase 2g: Switch, Checkbox, Radio, Slider, Separator, ScrollArea, Avatar (plates)
- [ ] implementation (implementer-a, implementer-b)
- [ ] tests (tester-a, tester-b)
- [ ] previews (preview-a)
- [ ] checks: typecheck, lint, unit tests (quote summary lines)
- [ ] UI verified (ui-verify): `/testbed/lobby-settings-sheet` controls readable on the dark field
- [ ] final review (architect-b)
- [ ] committed: <hash>

## Phase 2h: Close-out (no new source files)
- [ ] full typecheck, lint, unit tests (quote summary lines)
- [ ] e2e: gameplay, auth-and-lobby, map-viewport, tutorial-beacons, bot-vs-bot-ui, reconnect-bot-takeover pass (needs Java 21)
- [ ] UI verified (ui-verify): `/`, lobby, in-game screen with a dialog, mobile bottom sheet at 1280x720 and 390x844; zero `/tiny-swords` 404s
- [ ] migration-debt report written to the Log (categories A-E of plan.md "P2 Migration debt", scan re-run)
- [ ] docs-sync (`docs/architecture/pixel-ui.md` new bridge section + PixelButton/Ribbon/PixelPanel text; `systems-and-visuals.md` sentence; `docs/README.md` index if it lists sections)
- [ ] lessons-learned reviewed (architect-b)
- [ ] final review (architect-b)
- [ ] committed: <hash>

## Phase 3: Login and footer on a water background
- [ ] plan approved (architect-b)
- [ ] implementation
- [ ] tests
- [ ] previews
- [ ] checks: typecheck, lint, unit tests
- [ ] UI verified (ui-verify)
- [ ] final review (architect-b)
- [ ] committed: <hash>

## Phase 4: Lobby (match list, create-match, field guide, rejoin panel)
- [ ] plan approved (architect-b)
- [ ] implementation
- [ ] tests
- [ ] previews
- [ ] checks: typecheck, lint, unit tests
- [ ] UI verified (ui-verify)
- [ ] final review (architect-b)
- [ ] committed: <hash>

## Phase 5: In-game HUD skin (no layout or structure change)
- [ ] plan approved (architect-b)
- [ ] implementation
- [ ] tests
- [ ] previews
- [ ] checks: typecheck, lint, unit tests
- [ ] UI verified (ui-verify): HUD structure identical to before
- [ ] final review (architect-b)
- [ ] committed: <hash>

## Phase 6: Dialogs (cards, combat, session)
- [ ] plan approved (architect-b)
- [ ] implementation
- [ ] tests
- [ ] previews
- [ ] checks: typecheck, lint, unit tests
- [ ] UI verified (ui-verify)
- [ ] final review (architect-b)
- [ ] committed: <hash>

## Phase 7: Cleanup (old glass/gradient styles, docs, lessons-learned)
- [ ] plan approved (architect-b)
- [ ] implementation
- [ ] tests
- [ ] checks: typecheck, lint, unit tests
- [ ] UI verified (ui-verify)
- [ ] docs-sync (`docs/architecture/systems-and-visuals.md`)
- [ ] lessons-learned entry (unlayered `body { font-family }` beat Tailwind `font-body`)
- [ ] final review (architect-b)
- [ ] committed: <hash>

## Log
2026-10-22 coordinator: plan agreed with the user; triage.md written; waiting for "continue" to start Phase 1.
2026-10-22 architect-a: Phase 1 plan.md drafted (DRAFT), split into 1a-1e; progress blocks created for all phases.
2026-10-22 coordinator: applied two non-blocking 1b review notes myself (slice.map.ts reuse isThreeSlice; preview contentClassName gets flex).
2026-10-22 architect-b (1c final review): RIBBON_INSET tuned { top: 6, right: 56, bottom: 12, left: 56 } -> { top: 14, right: 56, bottom: 12, left: 56 } (text centred on ribbon face rows 3-44). Carved panel min 96 -> 126 and tone light -> ink, inline-padding inner div, Ribbon truncation classes accepted and recorded in plan.md.
2026-10-23 architect-b (1d final review): BAR_ART tuned values: big inset { top: 11, right: 11, bottom: 16, left: 11 } trackHeight 24; small inset { top: 8, right: 10, bottom: 8, left: 10 } trackHeight 3. Deviation: BarArt is { sheet: ThreeSliceSheet, fillUrl, trackHeight } (base sheets are 3-slice with transparent gaps); plan.md Contracts updated. One unidentified test failed once in the first full `npm test` and passed on three re-runs: unexplained flake.
2026-10-22 1e preview-a: Pixelify Sans not good enough at 14 px for logs/card text (l/I/1, 0/O ambiguous, parentheses read as angle brackets); use it for headings, buttons, labels; use Outfit (`font-readable`) for event log, card body, digits and ids.
2026-10-23 coordinator: full npm test showed two unrelated load-sensitive flakes once (IconEditor.preview.test.tsx, MonsterSpriteUploader.catalogEdit.hook.test.ts); both pass in isolation 3/3 and on the next full run (328 suites, 4798 tests).
2026-10-23 architect-a: Phase 2 plan appended to plan.md (DRAFT), split into 2a-2h; progress blocks created. Deviations needing architect-b sign-off: D3 SPRITE_LOCK `!` classes, D4 Button size `plate` + 3 HUD one-prop edits, D2 insets (engine trims transparent margins), D11 header alignment unchanged.
2026-10-23 coordinator: IconEditor.preview.test.tsx failed again in a full run (3rd time, ~7s vs 5s default timeout; passes alone in ~1s). Follow-up: raise that test timeout, do not weaken assertions (untouched code, not part of this task).
