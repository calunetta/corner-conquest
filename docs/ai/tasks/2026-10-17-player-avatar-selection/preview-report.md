# Preview report, phase 3/3 (preview verification)

Server: http://localhost:9002 (already running). Screenshots in `test-results/ui-verify/` (absolute prefix `/Users/clunetta/Documents/Games/Corner Conquest/`).

## Pages checked (snapshot.mjs, desktop 1280x720 + mobile 390x844): all PASS, 0 console errors, 0 HTTP errors
- /testbed/avatars-avatar-picker-button -> testbed-avatars-avatar-picker-button--{desktop,mobile}.png (landing shows "Select a state above"; states are tabs)
- /testbed/hud-player-info?state=Chosen avatar -> testbed-hud-player-info-state-Chosen-20avatar--{desktop,mobile}.png
- /testbed/session-victory-dialog?state=You won, chosen avatar -> testbed-session-victory-dialog-state-You-20won-20chosen-20avatar--{desktop,mobile}.png
- /testbed/lobby-game-row?state=Mixed avatars and fallback -> testbed-lobby-game-row-state-Mixed-20avatars-20and-20fallback--{desktop,mobile}.png

## Picker, all 5 states, both sizes (custom Playwright script, per-state)
- Images: assets live in `public/tiny-swords/UI Elements/UI Elements/Human Avatars/`. 0 responses >=400, 0 broken `<img>` (naturalWidth>0) in every state; 25 `[data-avatar-id]` cells, 26 imgs when dialog open (25 + trigger thumbnail). No-avatar state shows 0 imgs (icon).
- Console errors: none in any state/size.
- Trigger: desktop label "Change Avatar", 36px high (129-137px wide); mobile icon-only, accessible name "Change your avatar", 44x44 (matches Final spec).
- Grid: desktop cells 64x64, dialog 512 wide. Mobile cells 52x52, grid spans x=30.6..359.4 inside a 390 dialog, no horizontal scroll (scrollWidth <= innerWidth) in any state. Exactly 1 `aria-pressed="true"` cell in dialog states; selected amber ring/glow visible; Saving shows spinner on the cell; Error shows destructive text "Couldn't save your avatar. Try again." with dialog still open.
- Interaction (Dialog open, Saving, Error; both sizes): Escape closes, trigger reopens, outside click (3,3) closes, trigger reopens. All true. Trigger states without preopened dialog: click opens dialog with 25 cells.
- Screenshots: picker-{desktop,mobile}-{Dialog-open-avatar-selected,Saving,Error}-{open,reopen}.png, picker-{desktop,mobile}-Trigger-*-clicked.png.

## Findings (all non-blocking)
1. Mobile dialog is edge-to-edge (x=0, width 390), not inset by 16px. Cause: `src/components/ui/dialog.tsx:41` base `w-full max-w-lg` with no mobile margin; `AvatarPickerButton.styles.ts:7` `dialogContent` does not add `max-w-[calc(100vw-2rem)]`. The grid itself keeps ~30px side padding and nothing clips. Same chrome as CreateGameDialog, ui-design.md:31 itself says Radix default clamping is acceptable. Owner: implementer-b, only if a literal 16px outer gutter is required.
2. Lobby row avatar stack is small (~30px) on both sizes; the chosen avatar is readable but tiny next to the red "B" fallback. Cosmetic, matches existing stack size. Owner: none.

Preview states match plan.md "Preview states" (Default, Chosen, Dialog open, Saving, Error; PlayerInfo, VictoryDialog, LobbyGameRow extra states present and visually distinct).

VERDICT on preview-a: APPROVED
DONE
