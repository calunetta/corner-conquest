import type { LobbyBoat, LobbyIsland } from './LobbyBackground.types';

/** Hand-authored decorative layout, ported verbatim from the legacy LobbyBackground.tsx. */
export const LOBBY_ISLANDS: LobbyIsland[] = [
  {
    id: 'blue-citadel',
    wrapperClassName:
      'absolute top-[6%] left-[3%] opacity-45 hover:opacity-85 transition-opacity duration-700 hidden md:block animate-bounce [animation-duration:8s]',
    cardClassName:
      'relative w-28 h-28 rounded-2xl bg-terrain bg-cover bg-center shadow-2xl border border-blue-400/30 rotate-6 p-2 flex flex-col items-center justify-center',
    mainSprite: { src: '/sprites/castle_blue.png', alt: 'Blue Castle', width: 48, height: 48, imageClassName: 'drop-shadow-lg object-contain' },
    decorations: [
      { positionClassName: 'absolute -bottom-2 -right-2', src: '/sprites/blue.gif', alt: 'Blue Knight', width: 32, height: 32, imageClassName: 'drop-shadow-md object-contain' },
    ],
  },
  {
    id: 'wild-bear-cave',
    wrapperClassName:
      'absolute top-[4%] left-[45%] opacity-35 hover:opacity-75 transition-opacity duration-700 hidden xl:block animate-bounce [animation-duration:9s] [animation-delay:1.8s]',
    cardClassName:
      'relative w-24 h-24 rounded-2xl bg-terrain bg-cover bg-center shadow-2xl border border-white/20 -rotate-3 p-1.5 flex flex-col items-center justify-center',
    mainSprite: { src: '/sprites/bear_idle.gif', alt: 'Wild Bear', width: 40, height: 40, imageClassName: 'drop-shadow-md object-contain' },
    decorations: [
      { positionClassName: 'absolute -top-2 -left-2', src: '/sprites/pine_tree.gif', alt: 'Pine Tree', width: 26, height: 26, imageClassName: 'drop-shadow-sm object-contain' },
    ],
  },
  {
    id: 'red-outpost',
    wrapperClassName:
      'absolute top-[8%] right-[4%] opacity-45 hover:opacity-85 transition-opacity duration-700 hidden md:block animate-bounce [animation-duration:9.5s] [animation-delay:2s]',
    cardClassName:
      'relative w-32 h-32 rounded-2xl bg-terrain bg-cover bg-center shadow-2xl border border-red-500/30 rotate-12 p-2 flex flex-col items-center justify-center',
    mainSprite: { src: '/sprites/castle_red.png', alt: 'Red Castle', width: 48, height: 48, imageClassName: 'drop-shadow-lg object-contain' },
    decorations: [
      { positionClassName: 'absolute -bottom-2 -left-2', src: '/sprites/red.gif', alt: 'Red Knight', width: 32, height: 32, imageClassName: 'drop-shadow-md object-contain' },
      { positionClassName: 'absolute -top-1 -right-1', src: '/sprites/lancer_idle.gif', alt: 'Red Lancer', width: 28, height: 28, imageClassName: 'drop-shadow-sm object-contain' },
    ],
  },
  {
    id: 'yellow-sun-citadel',
    wrapperClassName:
      'absolute top-[42%] left-[2%] opacity-40 hover:opacity-80 transition-opacity duration-700 hidden lg:block animate-bounce [animation-duration:10s] [animation-delay:0.8s]',
    cardClassName:
      'relative w-28 h-28 rounded-2xl bg-terrain bg-cover bg-center shadow-2xl border border-yellow-400/30 -rotate-12 p-2 flex flex-col items-center justify-center',
    mainSprite: { src: '/sprites/castle_yellow.png', alt: 'Yellow Castle', width: 44, height: 44, imageClassName: 'drop-shadow-lg object-contain' },
    decorations: [
      { positionClassName: 'absolute -bottom-1 -right-1', src: '/sprites/yellow.gif', alt: 'Yellow Knight', width: 30, height: 30, imageClassName: 'drop-shadow-md object-contain' },
      { positionClassName: 'absolute -top-2 -left-1', src: '/sprites/farm_yellow.gif', alt: 'Yellow Farm', width: 24, height: 24, imageClassName: 'drop-shadow-sm object-contain' },
    ],
  },
  {
    id: 'purple-mystic-bastion',
    wrapperClassName:
      'absolute top-[44%] right-[2%] opacity-40 hover:opacity-80 transition-opacity duration-700 hidden lg:block animate-bounce [animation-duration:11.5s] [animation-delay:1.2s]',
    cardClassName:
      'relative w-28 h-28 rounded-2xl bg-terrain bg-cover bg-center shadow-2xl border border-purple-400/30 rotate-6 p-2 flex flex-col items-center justify-center',
    mainSprite: { src: '/sprites/castle_purple.png', alt: 'Purple Castle', width: 44, height: 44, imageClassName: 'drop-shadow-lg object-contain' },
    decorations: [
      { positionClassName: 'absolute -bottom-1 -left-1', src: '/sprites/purple.gif', alt: 'Purple Knight', width: 30, height: 30, imageClassName: 'drop-shadow-md object-contain' },
      { positionClassName: 'absolute -top-2 -right-1', src: '/sprites/collector_purple_idle.gif', alt: 'Purple Collector', width: 24, height: 24, imageClassName: 'drop-shadow-sm object-contain' },
    ],
  },
  {
    id: 'minotaur-lair',
    wrapperClassName:
      'absolute bottom-[8%] left-[5%] opacity-40 hover:opacity-80 transition-opacity duration-700 hidden md:block animate-bounce [animation-duration:11s] [animation-delay:1s]',
    cardClassName:
      'relative w-32 h-32 rounded-2xl bg-terrain bg-cover bg-center shadow-2xl border border-amber-500/30 -rotate-6 p-2 flex flex-col items-center justify-center',
    mainSprite: { src: '/sprites/minotaur_idle.gif', alt: 'Minotaur Monster', width: 52, height: 52, imageClassName: 'drop-shadow-lg object-contain' },
    decorations: [
      { positionClassName: 'absolute top-1 left-2', src: '/sprites/gold.gif', alt: 'Gold Treasure', width: 26, height: 26, imageClassName: 'drop-shadow-md object-contain' },
      { positionClassName: 'absolute -bottom-1 -right-1', src: '/sprites/medium_rock.gif', alt: 'Rock', width: 20, height: 20, imageClassName: 'drop-shadow-sm object-contain' },
    ],
  },
  {
    id: 'ogre-pasture',
    wrapperClassName:
      'absolute bottom-[8%] right-[5%] opacity-40 hover:opacity-80 transition-opacity duration-700 hidden md:block animate-bounce [animation-duration:10.5s] [animation-delay:0.5s]',
    cardClassName:
      'relative w-30 h-30 rounded-2xl bg-terrain bg-cover bg-center shadow-2xl border border-emerald-500/30 -rotate-12 p-2 flex flex-col items-center justify-center',
    mainSprite: { src: '/sprites/ogre_idle.gif', alt: 'Ogre Monster', width: 48, height: 48, imageClassName: 'drop-shadow-lg object-contain' },
    decorations: [
      { positionClassName: 'absolute -top-1 -right-1', src: '/sprites/sheep.gif', alt: 'Pasture Sheep', width: 24, height: 24, imageClassName: 'drop-shadow-md object-contain' },
      { positionClassName: 'absolute -bottom-1 -left-1', src: '/sprites/tree.gif', alt: 'Tree', width: 24, height: 24, imageClassName: 'drop-shadow-sm object-contain' },
    ],
  },
];

export const LOBBY_BOATS: LobbyBoat[] = [
  {
    id: 'patrol-boat-1',
    wrapperClassName:
      'absolute top-[35%] left-[8%] opacity-35 hover:opacity-75 transition-opacity duration-700 hidden xl:block animate-pulse [animation-duration:7s]',
    sprite: { src: '/sprites/boat.gif', alt: 'Patrol Boat 1', width: 44, height: 44, imageClassName: 'drop-shadow-md object-contain -rotate-6' },
  },
  {
    id: 'patrol-boat-2',
    wrapperClassName:
      'absolute bottom-[28%] right-[12%] opacity-30 hover:opacity-75 transition-opacity duration-700 hidden xl:block animate-pulse [animation-duration:8.5s] [animation-delay:2s]',
    sprite: { src: '/sprites/boat.gif', alt: 'Patrol Boat 2', width: 38, height: 38, imageClassName: 'drop-shadow-md object-contain rotate-12' },
  },
];

export function toLobbyBackground(): { islands: LobbyIsland[]; boats: LobbyBoat[] } {
  return { islands: LOBBY_ISLANDS, boats: LOBBY_BOATS };
}
