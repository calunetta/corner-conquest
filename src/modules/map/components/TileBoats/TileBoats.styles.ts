// Sizes are percentages of the tile side T (ui-design.md sizing table). The boat entry
// is sized against the tile; the boat hull and collector are sized against the boat box.
export const styles = {
  container: 'pointer-events-none absolute inset-0 z-[25] select-none',
  boatEntry: 'absolute w-[42%] h-[42%]',
  boat: 'relative h-full w-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)] transition-transform duration-300 hover:scale-110',
  boatImage: 'object-contain',
  // 14% of the hull box, flush at its inner top-left corner: stays inside the hull and clear of the rider.
  collectorOverlay:
    'absolute z-[26] w-[14%] h-[14%] top-0 left-0 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]',
  collectorImage: 'object-contain',
} as const;
