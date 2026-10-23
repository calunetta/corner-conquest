# HANDOFF: Tiny Swords UI refactor (read this first)

Branch: `ui-refactor-to-be-decided` (origin). Parked on 2026-10-23 because the user was not convinced by the look and asked to go back to the old UI on `main`. Nothing here is lost: this branch has all the code, docs, mockups and measuring tools to continue.

## Git facts
- Base (last commit before the refactor, still on `main`): `552702e` (thanks page + site footer).
- Refactor commits on this branch: `363589c` .. `b6b579e` (31 commits, phases 1a to 2h) plus the handoff commit on top.
- `main` was reverted with commit `45ffdf9` (one revert commit, tree identical to `552702e`). `origin/main` still contains refactor Phase 1 (up to `835704d`) unless the revert was pushed later: check `git log origin/main`.
- To resume: `git checkout ui-refactor-to-be-decided` (or `git worktree add ../ui-refactor ui-refactor-to-be-decided`). To adopt it into main later: merge this branch into `main` AFTER reverting the revert (`git revert 45ffdf9`) or cherry-pick; expect conflicts in `src/app/layout.tsx`, `tailwind.config.ts`, `src/app/globals.css` if main moved.
- Caution when merging: commit `2266536` also contains the user's own edits to `src/modules/icons/icon-overrides.config.json` and `src/modules/map/components/TileVariants/tile-variants.config.json` (they were uncommitted user work swept in by a broad `git add src`). On `main` those two files are uncommitted user modifications. Do not let this branch overwrite newer versions of them.

## What was asked and decided (user, 2026-10-22/23)
1. Explore `public/tiny-swords` (UI, UI Elements) for badges, cards, ribbons, buttons, panels and refactor the whole app look to match the itch.io Tiny Swords pack (https://pixelfrog-assets.itch.io/tiny-swords, creator Pixel Frog; credit welcome, no redistribution; `/thanks` page already credits it).
2. Scope: everywhere (login, lobby, HUD, dialogs). **The map itself stays untouched. The HUD may change its look but its structure and sizes must not change in game.**
3. Background for login/lobby: Tiny Swords water and islands (not done yet).
4. Order: login, lobby, HUD, dialogs. A footer with Privacy / Terms / Thanks on login and lobby, never in game (already on main).
5. Feedback after seeing Phase 2 (all implemented, commit `525bffd`, `c68125f`):
   - Fonts: for text read a lot (logs, card body, descriptions, inputs, tooltips, digits) use `'Patrick Hand', Lato, LatoExtended, sans-serif`; for institutional text (game name, titles) use `MedievalSharp`.
   - Give ribbon text more room (text ended almost outside the ribbon).
   - Content must look centered: add a few px of bottom margin where already geometrically centered (ribbons and buttons).
   - Evaluate with UI verification in the built-in browser (screenshots, readability).
   Current mapping lives in `tailwind.config.ts` fontFamily (body/readable = Patrick Hand+Lato; headline/pixel/medieval = MedievalSharp); plate/plain buttons use `font-readable`, sprite buttons and ribbons use `font-pixel`. This supersedes "Pixelify Sans" in triage.md and ui-design.md.
   - Ribbon inset `RIBBON_INSET` = top 12 / right 50 / bottom 14 / left 50 (Ribbon.map.ts); button labels use the `opticalPadding` table in PixelButton.styles.ts.
6. The user then said they are not convinced by the refactor and asked to park it on this branch and revert `main`.

## State: where we stopped
- DONE and committed (all with review.md verdicts, 334 test suites / 5015 tests green at the tip): Phase 1 (1a-1e, `src/modules/pixel-ui`: slice engine, Ribbon, PixelPanel, PixelBar, PixelIcon, PixelButton, theme tokens, fonts) and Phase 2 (2a-2h, the shadcn bridge in `src/components/ui`: Button tiers sprite/plate/plain, dialog/alert-dialog/sheet with special frame + ribbon title, plates for card/input/textarea/label/badge/progress/tooltip/popover/tabs/toast/switch/checkbox/radio/slider/separator/scroll-area/avatar, 37-state testbed preview `/testbed/shadcn-bridge`).
- THE STEP WE WERE AT: Phase 2 is closed (final review APPROVED, commit `c68125f` + `b6b579e`). **Next step is Phase 3: Login and footer on a water background** (progress.md has Phase 3 to 7 blocks, all unticked). The user had not yet said "continue" for Phase 3 when they decided to park the work.
- e2e specs were NOT run (no Java 21 on the dev machine): run the six specs listed in plan.md Phase 2h before merging anything.

## Where everything is
- `triage.md` (decisions, tier XL, phases), `plan.md` (Phase 1 + Phase 2 plans, contracts, debt A-K, "Carry-overs into Phase 3"), `ui-design.md` (Phase 1 and Phase 2 final specs), `review.md` (every phase's review), `progress.md` (checkboxes + Log lines, including all measured numbers and decisions).
- Architecture docs: `docs/architecture/pixel-ui.md` (§6.17, §6.18) and `docs/architecture/pixel-ui-bridge.md` (§6.19). Lessons: `docs/ai/lessons-learned.md` (entries "Slice frames", "Restyling buttons without changing layout", ring-inset caution, ribbon inset vs cap art, single-weight fonts, config files outside src).
- `handoff-assets/`: the three mockups the user saw (`mockA_login.png`, `mockB_lobby.png`, `mockC_game.png`) and the scripts that made them (`mock.py`, `run.py`, PIL, 9-slice composer), the HUD size baseline of the OLD UI (`hud-baseline.json`, `hud-measure.mjs`; the HUD must stay identical: re-run it against the dev server on :9002), layout baselines (`plates-baseline.json`, `overlays-baseline.json`, `forms-baseline.json`), the debt scanner `scan.js`, and `measure*.mjs`. These were temp files; they are only valid for the old UI baselines and need a dev server.
- Testbed: `/testbed/pixel-ui-*`, `/testbed/slice-frame`, `/testbed/shadcn-bridge`.

## Remaining plan (from triage.md) and known issues
- Phase 3 login + footer + water background; Phase 4 lobby; Phase 5 in-game HUD skin (no structure change); Phase 6 dialogs (cards, combat, session); Phase 7 cleanup.
- Carry-overs (details in plan.md): Login.tsx:64/:101 Google button wrapping and the loud autofocus ring on it; Lobby.tsx:68 "Create New Game" truncates in its narrow column; monster dialog ribbon title ellipsis at 390 px; ghost/link text on paper frames (debt G); `Card frame` drops ref; Badge digits are MedievalSharp; slider thumb has no accessible name; toast close icon hidden until hover (touch); popover touches the left edge at 390 px; raw destructive red (hsl 5 70% 45%) should become a token; migration debt A (about 23 sprite-tier call sites with colour/height overrides that `SPRITE_LOCK` hides) and B (about 37 plate-tier overrides).
- Not from this work: a hydration mismatch in the game-board position-race sandbox (tile decorations `src` differs) and flaky tests under full-suite load (IconEditor.preview, MonsterSpriteUploader.catalogEdit.hook, ConfirmExitDialog.preview, GameBoardHeader.hook, WealthyDialog SIGSEGV, CardPlaySandbox.hook "failed to run"): all pass alone.
- Firebase anonymous sign-in rate-limits (`auth/too-many-requests`) make ui-verify snapshot runs print FAIL on that console error only; environmental.
- Repo rule learned the hard way: stage commits by explicit path, never `git add src` while the user has unrelated uncommitted files.

## How to continue
1. `git checkout ui-refactor-to-be-decided`; `npm install`; `npm run dev` (port 9002).
2. Open `/testbed/shadcn-bridge` and `/testbed/pixel-ui-button` to see the current look; read the Log in progress.md.
3. Tell Claude: "continue the Tiny Swords UI refactor from docs/ai/tasks/2026-10-22-tiny-swords-ui-refactor/HANDOFF.md" (swarm skill resumes from the first unticked box: Phase 3).
4. Or, if the direction changed: edit the decisions at the top of triage.md first (fonts, scope, order), then continue; the font mapping is a 5-line change in tailwind.config.ts.
