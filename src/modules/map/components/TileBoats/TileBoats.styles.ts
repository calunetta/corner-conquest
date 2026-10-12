// Sizes are percentages of the tile side T (ui-design.md sizing table). The boat entry
// is sized against the tile; the boat hull and collector are sized against the boat box.
export const styles = {
  container: 'pointer-events-none absolute inset-0 z-[25] select-none',
  boatEntry: 'absolute w-[42%] h-[42%]',
  boat: 'relative h-full w-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)] transition-transform duration-300 hover:scale-110',
  boatImage: 'object-contain',
  // 36%×32% of the hull box, centered at 50%/54% so it sits on the basket floor inside the
  // hull's painted silhouette (boat.gif spans about 21-78% x, 29-71% y), not on the grass beside it.
  collectorOverlay:
    'absolute z-[26] w-[36%] h-[32%] left-1/2 top-[54%] -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]',
  collectorImage: 'object-contain',
} as const;
