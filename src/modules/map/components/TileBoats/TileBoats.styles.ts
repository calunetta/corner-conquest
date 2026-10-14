// Sizes are percentages of the tile side T (ui-design.md sizing table). The boat entry
// is sized against the tile; the boat hull and collector are sized against the boat box.
export const styles = {
  container: 'pointer-events-none absolute inset-0 z-[25] select-none',
  boatEntry: 'absolute',
  boat: 'relative h-full w-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)] transition-transform duration-300 hover:scale-110',
  boatImage: 'object-contain',
  // Size/position come from IDLE_COLLECTOR_SIZE/IDLE_COLLECTOR_TOP via inline style in
  // TileBoats.tsx (island-tile-slots.types.ts), not a class here.
  collectorOverlay: 'absolute z-[26] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]',
  collectorImage: 'object-contain',
} as const;
