export const styles = {
  root: 'fixed inset-0 z-0 overflow-hidden pointer-events-none select-none',
  sky: 'absolute inset-x-0 top-0 h-full bg-[linear-gradient(180deg,#2a1b3d_0%,#5c2f3a_42%,#a85a3b_70%,#d98b4c_100%)]',
  // Tiled water.png sprite (the bg-water-pattern utility) covering the bottom ~30% of the stage.
  sea: 'absolute inset-x-0 bottom-0 h-[30%] bg-water-pattern bg-repeat bg-[length:48px_48px]',
  // Keyframes `animate-cloud-drift` (tailwind.config.ts) drift and fade the cloud once; duration is inline.
  cloud: 'absolute animate-cloud-drift',
  // Same terrain surface as a real board tile (IslandTile.styles.ts `terrain`), without its z-index layering.
  // Hidden below md: at phone width the 26%-wide islands sit entirely behind the login card.
  island: 'absolute hidden md:block aspect-square rounded-lg border-2 border-black/50 bg-terrain bg-cover bg-center bg-no-repeat shadow-2xl',
  // Clips the monster's wander (AnimatedMonster translates the sprite inside its own box) to this tile.
  monsterIsland: 'overflow-hidden',
  islandSprite: 'absolute inset-[15%] drop-shadow-[0_4px_10px_rgba(0,0,0,0.7)]',
  resourceNode: 'absolute',
  sprite: 'object-contain',
} as const;
