# Triage: Thanks page crediting Tiny Swords

Status: SCHEDULED, not started. Requested by the user 2026-10-22 while working on ads-consent-legal.

## Request
A `/thanks` page that thanks the creator of the Tiny Swords asset pack (UI/art library used by the game) and links to its itch.io page.

## Open questions (ask the user before building)
- Exact itch.io URL and creator name/handle. Not verified in this repo (grep found no existing credit); do not guess. Likely Pixel Frog's "Tiny Swords" page, confirm.
- Which assets in the game come from Tiny Swords (UI only, or sprites too), and the pack's license credit wording.
- Where to link the page from (home footer, `/privacy`, `/terms`).

## Suggested sizing
Tier XS/S: one static server component `src/app/thanks/page.tsx` (same pattern as `src/app/privacy/page.tsx`), one render test, a link from the home page, one docs-sync line in `docs/architecture/structure-and-state.md` and `systems-and-visuals.md`. One phase.
