// Where a decoration's centre may sit on a tile, in % of the tile side. The limits keep every decoration
// inside the island's visible grass: nothing sits on the tile's top rim or right-hand edge.
export const DECORATION_TOP_BOUNDS = { min: 3, max: 85 } as const;
export const DECORATION_LEFT_BOUNDS = { min: 8, max: 85 } as const;

function clamp(value: number, bounds: { min: number; max: number }): number {
  return Math.min(bounds.max, Math.max(bounds.min, value));
}

/** Clamps a decoration's centre into the allowed area. Values that are not finite fall back to the lower bound. */
export function clampDecorationPosition(position: { top: number; left: number }): { top: number; left: number } {
  return {
    top: clamp(Number.isFinite(position.top) ? position.top : DECORATION_TOP_BOUNDS.min, DECORATION_TOP_BOUNDS),
    left: clamp(Number.isFinite(position.left) ? position.left : DECORATION_LEFT_BOUNDS.min, DECORATION_LEFT_BOUNDS),
  };
}

export function isDecorationPositionInBounds(position: { top: number; left: number }): boolean {
  return (
    position.top >= DECORATION_TOP_BOUNDS.min &&
    position.top <= DECORATION_TOP_BOUNDS.max &&
    position.left >= DECORATION_LEFT_BOUNDS.min &&
    position.left <= DECORATION_LEFT_BOUNDS.max
  );
}
