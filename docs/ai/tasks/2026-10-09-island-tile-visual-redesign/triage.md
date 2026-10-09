# Triage: Island tile visual redesign (resources, base layout, cloud density)

Request: Fix audit points 109, 110, 117, 118 — the resource-sprite layout on islands "looks weird," the resource-node collector needs repositioning/resizing, the Base tile composition needs rework, and the perimeter cloud decoration is too sparse. The user explicitly asked for browser verification plus a design pass (game designer + UI designer), not a blind code fix.
Type: component
Tier: M
Pipeline: ui-designer-a ui-designer-b architect-a architect-b implementer-b tester-b preview-a preview-b architect-b:final-review
Overrides: none
Phases: 2 (Phase 1: design spec + cloud density, lower-risk and decoupled; Phase 2: TileResources + IslandTile base layout rework, once the design spec is approved)

## Why this tier
- Three existing, already-split components (`TileResources`, `IslandTile`, `MapDecorations`) get real layout changes, not just class tweaks — `TileResources`' organic scatter algorithm and `IslandTile`'s base composition are both load-bearing for how every island on the board reads, so a UI designer pass is warranted before code changes (per `ui-design` skill).
- Visual-only (no `GameState` shape changes), but touches enough surface area and needs enough back-and-forth with the user's own eyes in a live browser that it doesn't fit tier S.

## Scope
- In: `MapDecorations.map.ts`'s fixed cloud layout (density/coverage), `TileResources`' sprite scatter/sizing (`TileResources.map.ts`/`.styles.ts`) including the active-collector sprite's position and size on the resource node, `IslandTile`'s base-tile composition (castle + forest + resource nodes + collectors + boat).
- Out: the idle-collector-on-boat sizing/layering bug (separate task, `2026-10-09-sprite-sizing-fixes` — that one has a confirmed code-level root cause and doesn't need design review; this task is about the resource-node-positioned collector and the overall island composition, a different rendering path).
- Out: any gameplay/logic change — resource amounts, positions-per-island rules, etc. (`docs/README.md` §5.2-5.3) are unaffected; this is presentation only.

## Open questions
- None to block starting — the user explicitly asked for "use the browser to access the game and check with designer and ui designer on how to implement this properly," i.e. they want the design pass to happen as part of this task, not before it. ui-designer-a/b should treat the current live rendering (via `ui-verify`) as their starting reference, not a blank slate.
