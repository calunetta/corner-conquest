# UI design: Resource collection feedback + farmer-boat reset

## Spec (ui-designer-a)

### Purpose and user story
As a player, I want to see that my positioned armies collected resources at the start of my turn, and to know when an army is sitting idle because its position expired, so that the economy loop is never silent and I know exactly when to re-click Position.

Two notifications, both toasts, both local-client-only (no multiplayer broadcast, no Firestore write):
1. **Collection toast** — fires when `collectedResources` is non-empty for the local player's turn (final spec item 5, `game-design.md:119`).
2. **Idle-farm toast** — fires when the local player has at least one army sitting on an eligible, un-positioned resource/Base spot (final spec item 4, `game-design.md:118`).

### Placement and layout
- Desktop (1280x720) and mobile (390x844): reuse the existing global `<Toaster/>` (`src/app/layout.tsx`, confirmed) and `useToast()` (`src/modules/shared`, confirmed `src/modules/shared/use-toast.ts`) exactly as `AbilitiesDialog.hook.ts:15,20` already does for "Purchase Successful!" — same viewport, same stacking (`TOAST_LIMIT = 3`, `toast-store.ts:5`), same position and motion. No new placement, no new z-index: this reuses an existing, already-shipped pattern, so it does not compete with the map grid on mobile (toast viewport renders above all content, independent of `MapGrid`).
- Both toasts can appear the same turn (one army finished collecting, a different army is idle). They stack normally through the existing `TOAST_LIMIT`; no custom grouping.

### States
| State | What the player sees | Trigger |
|---|---|---|
| Default (no toast) | Nothing — the local player has no positioned armies and no idle-eligible armies this turn. | n/a |
| Collection toast | Toast with title "Resources collected" and description listing resource + amount pairs. | `handleEndTurn` credited `collectedResources` for the local player this turn (`player-turn.reducer.ts:8-31`, `card-effects.reducer.ts:48-92` per final spec items 1 and 5). |
| Idle-farm toast | Toast with title "Army idle" (singular) or "Armies idle" (plural) and a description naming the count. | The local player has >=1 army on a Resource/Base tile with an open, eligible spot and no entry in `player.positions` for it (final spec item 4). |
| Both toasts same turn | Both stack, newest on top, independently dismissible (existing `ToastClose`, confirmed `src/components/ui/toast.tsx`). | Both trigger conditions true simultaneously (different armies). |

No loading/error/disabled state: this is a one-shot, fire-and-forget notification with no user input and no failure path (same category as the existing "Purchase Successful!" toast).

### Components and tokens
- Reuse only, no new primitive: `Toaster` (`src/components/ui/toaster.tsx`), `useToast`/`toast()` (`src/modules/shared/use-toast.ts`, `src/modules/shared/toast-store.ts`), following `AbilitiesDialog.hook.ts:1,15,20` as the call-site pattern (import `useToast` from `@/modules/shared`, call `toast({ title, description })`).
- Variant: `default` (not `destructive` — neither event is an error; `toastVariants`, `src/components/ui/toast.tsx:27-38`, confirmed).
- Tokens: none new. The toast's own `bg-background text-foreground` default variant classes are already theme tokens (confirmed `src/components/ui/toast.tsx:33`).
- Icons: none added. `GameLog.tsx:14` maps the `economy` category to the `Coins` lucide icon for log entries, but that is the log's own category-icon system, not a toast pattern — `AbilitiesDialog`'s toast calls carry no icon (confirmed `AbilitiesDialog.hook.ts:20,24`), so adding one here would be a new pattern for a single feature. Keep both toasts text-only, matching the existing toast call site exactly.

### Copy
- Collection toast, title: `Resources collected`
- Collection toast, description — one resource: `Collected 2 Food.`
- Collection toast, description — multiple resources, comma-joined in the same order the economy log already uses (`collectedStrings.join(', ')`, `player-turn.reducer.ts:20`): `Collected 2 Food, 1 Gold.`
  - Resource names are capitalized versions of `ResourceType` values (`food`/`wood`/`gold`, confirmed `src/lib/types/cards.ts:24-29`): Food, Wood, Gold.
- Idle-farm toast, title: `Army idle` when exactly one army qualifies, `Armies idle` when more than one.
- Idle-farm toast, description — one army: `1 army is idle on a resource spot. Re-position it to keep collecting.`
- Idle-farm toast, description — N armies (N > 1): `N armies are idle on resource spots. Re-position them to keep collecting.`
- Tutorial beacon (final spec item 7): in `src/features/game/components/GameBoard.tsx:42` (confirmed live copy site; `TutorialBeacon.preview.tsx:12` carries the same string for the testbed preview and must change identically), replace:
  - Old: `Move onto Resource Islands and click "Position" to gather resources automatically every turn.`
  - New: `Move onto Resource Islands and click "Position" to gather resources — re-position each turn to keep collecting.`

### Interactions and motion
- No new interaction surface: toasts are passive, auto-dismiss after `TOAST_REMOVE_DELAY` (2000ms, confirmed `toast-store.ts:5`) once closed, or the player can dismiss early via the existing `ToastClose` button (confirmed `src/components/ui/toast.tsx:66-78`, already keyboard- and screen-reader-accessible via Radix).
- Entrance/exit animation: unchanged, inherited from `toastVariants` (`data-[state=open]:animate-in`, `data-[state=closed]:animate-out`, confirmed `src/components/ui/toast.tsx:28`), which already respects `prefers-reduced-motion` at the Tailwind/Radix layer used everywhere else in the app (no feature-specific override needed).
- Both toasts for a turn should fire together, not staggered, so the player isn't left wondering if a second one is still coming: dispatch both `toast()` calls in the same turn-start handling pass (an implementation detail for the architect/implementer, not a new visual pattern).

### Accessibility
- Radix `ToastPrimitives.Root`/`Viewport` already provide the live region semantics (`role="status"`-equivalent via Radix's `ToastProvider`) used by every other toast in the app; no new ARIA work.
- Dismiss button already has keyboard focus and `focus-visible:ring-2` styling via the shared `ToastClose` (confirmed pattern applies at the primitive level, not per-caller).
- Text-only content at the existing toast type scale already meets the app's 4.5:1 contrast baseline (same `text-foreground`/`bg-background` tokens as every other toast); no color-only signal — the title text itself ("Resources collected" / "Army idle" / "Armies idle") states the event in words, not an icon or color alone.

### Acceptance criteria
- [ ] Positioning an army, ending enough turns for it to collect, and starting the next turn as that player shows a toast titled "Resources collected" listing the correct resource(s) and amount(s).
- [ ] The toast does not appear on a turn where the local player collected nothing (no positioned armies, or all positions already cleared).
- [ ] After a position clears (post-collection), an army left sitting on that now-unpositioned, still-eligible spot triggers an "Army idle" (or "Armies idle" for 2+) toast on that player's next turn start, naming the correct count.
- [ ] The idle-farm toast does not appear for an army on a tile with no open eligible spot (e.g., all spots already taken by positioned armies) or for an army not on a Resource/Base tile.
- [ ] Both toasts can appear in the same turn without one replacing or hiding the other (verified by triggering both conditions for the same local player in one turn).
- [ ] `src/features/game/components/GameBoard.tsx` and `TutorialBeacon.preview.tsx` show the updated Position tooltip copy, not the old "automatically every turn" wording.
- [ ] (Routed, not blocking this spec — tracked for the map/TileBoats owner per `game-design.md` finding 3) When a player has two armies positioned on the same island and only one clears, only that army's boat sprite reverts to idle; the other keeps its collecting sprite. `TileBoats.map.ts:74` currently keys the idle/collecting state by `playerId` only, not by army, so this will fail until that file is updated — call out as a known gap, do not block this task's other acceptance criteria on it.

## Review (ui-designer-b)
VERDICT: APPROVED

Checked against `docs/ai/tasks/2026-10-11-resource-collection-feedback/game-design.md` Final spec items 4, 5, 7 and against the visual-language rules in skill `ui-design`.

- Reuse verified: `src/modules/shared/use-toast.ts`, `src/modules/shared/toast-store.ts`, `src/components/ui/toaster.tsx`, `src/components/ui/toast.tsx:27-38,66-78`, `src/app/layout.tsx` (Toaster mounted globally — re-verified: `grep -n Toaster src/app/layout.tsx` returns a hit), `src/modules/cards/components/AbilitiesDialog/AbilitiesDialog.hook.ts:1,15,20` as the call-site pattern. No new visual pattern introduced, consistent with the "at most one new pattern per feature" rule (this spends zero).
- Both tutorial-copy sites are named and the real one is correctly distinguished from the preview fixture (`GameBoard.tsx:42` is live, `TutorialBeacon.preview.tsx:12` is testbed-only) — matches `game-design.md:70` which only names the preview file; this spec correctly adds the live site the game-design proposal missed.
- Copy is exact and singular/plural variants are both specified, closing the ambiguity in `game-design.md:118`'s "N army(s)" placeholder.
- Accessibility section correctly scopes to "no new work" rather than inventing requirements, since the underlying Radix primitive already covers live-region and focus behavior — verified `src/components/ui/toast.tsx:66-78` shows `ToastClose` already carries `focus:outline-none focus:ring-2`.
- Acceptance criteria are each observable by a human playtester or an automated test driving `handleEndTurn`/`toast-store`'s `getToastState()`; none require a judgment call.
- The routed TileBoats finding (finding 3 in `game-design.md:96-98`) is correctly carried into this spec's acceptance criteria as non-blocking, with the exact line (`TileBoats.map.ts:74`) and reason repeated so a later stage can't lose it — appropriate, since fixing it is out of this file's ownership.
- No mobile-specific placement change proposed, and none is needed: the toast viewport is independent of `MapGrid`'s layout, so the "whole map grid stays visible on mobile" rule is unaffected by construction, not by a mitigation this spec had to add.
- One non-blocking note for the next stage: the spec doesn't say what happens if the collection toast and the idle-farm toast would produce an identical title+description to the system's existing duplicate-suppression check (`toast()`'s `isDuplicate` guard, `toast-store.ts:117-124`, compares title+description+variant of currently-open toasts). Since both toasts have distinct titles ("Resources collected" vs "Army/Armies idle"), they can never collide with each other, and two consecutive identical collection amounts across turns is actually the desired suppression (avoids a flood of identical toasts if a player tabs away for several turns) — not a bug, just worth the implementer knowing it's inherited behavior, not a gap to fix.

## Final spec
The Spec section above is approved as written, no changes required. Items of note for later stages:
- Toast copy (collection and idle-farm, singular/plural) is final; implementer should not restate the resource list logic — reuse `collectedStrings`-equivalent output already computed in `applyAutomaticCollection`/`handleUseProductiveCard` per `game-design.md` items 1 and 5.
- Two live sites carry the Position tooltip copy and both must change together: `src/features/game/components/GameBoard.tsx:42` (owner: implementer, live copy) and `src/modules/hud/components/TutorialBeacon/TutorialBeacon.preview.tsx:12` (testbed fixture).
- The last acceptance criterion (two armies, one island, one clears) is explicitly routed to the TileBoats owner, not resolved here — `TileBoats.map.ts:74` needs an `armyId`-level check instead of `playerId`-level before that criterion can pass; this spec's other criteria do not depend on it.

DONE
