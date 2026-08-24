'use client';

import React from 'react';
import Image from 'next/image';

interface RockDef {
  id: string;
  src: string;
  left: string;
  top: string;
  size: number;
  desktopOnly?: boolean;
}

export const FIXED_ROCK_LAYOUT: RockDef[] = [
  // Four Strategic Corner Rocks
  { id: 'rock-tl', src: '/sprites/small_rock.gif', left: '3%', top: '3%', size: 22 },
  { id: 'rock-tr', src: '/sprites/medium_rock.gif', left: '97%', top: '3%', size: 24 },
  { id: 'rock-bl', src: '/sprites/mini_rock.gif', left: '3%', top: '97%', size: 18 },
  { id: 'rock-br', src: '/sprites/big_rock.gif', left: '97%', top: '97%', size: 26 },

  // Top Water Margin
  { id: 'rock-t1', src: '/sprites/mini_rock.gif', left: '26%', top: '2%', size: 16, desktopOnly: true },
  { id: 'rock-t2', src: '/sprites/small_rock.gif', left: '50%', top: '2%', size: 20 },
  { id: 'rock-t3', src: '/sprites/medium_rock.gif', left: '74%', top: '2%', size: 22, desktopOnly: true },

  // Bottom Water Margin
  { id: 'rock-b1', src: '/sprites/small_rock.gif', left: '24%', top: '98%', size: 18, desktopOnly: true },
  { id: 'rock-b2', src: '/sprites/medium_rock.gif', left: '50%', top: '98%', size: 24 },
  { id: 'rock-b3', src: '/sprites/mini_rock.gif', left: '76%', top: '98%', size: 16, desktopOnly: true },

  // Left Water Margin
  { id: 'rock-l1', src: '/sprites/medium_rock.gif', left: '2%', top: '28%', size: 22, desktopOnly: true },
  { id: 'rock-l2', src: '/sprites/small_rock.gif', left: '2%', top: '50%', size: 20 },
  { id: 'rock-l3', src: '/sprites/big_rock.gif', left: '2%', top: '72%', size: 24, desktopOnly: true },

  // Right Water Margin
  { id: 'rock-r1', src: '/sprites/small_rock.gif', left: '98%', top: '28%', size: 20, desktopOnly: true },
  { id: 'rock-r2', src: '/sprites/mini_rock.gif', left: '98%', top: '50%', size: 18 },
  { id: 'rock-r3', src: '/sprites/medium_rock.gif', left: '98%', top: '72%', size: 22, desktopOnly: true },
];

interface MapDecorationsProps {
  isMobile?: boolean;
}

export function MapDecorations({ isMobile = false }: MapDecorationsProps) {
  const rocksToRender = isMobile
    ? FIXED_ROCK_LAYOUT.filter(rock => !rock.desktopOnly)
    : FIXED_ROCK_LAYOUT;

  return (
    <div className="absolute inset-0 pointer-events-none z-5 overflow-visible" aria-hidden="true">
      {rocksToRender.map(rock => (
        <div
          key={rock.id}
          data-testid="decorative-rock"
          className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-500 hover:scale-110"
          style={{
            left: rock.left,
            top: rock.top,
            width: `${rock.size}px`,
            height: `${rock.size}px`,
          }}
        >
          <Image
            src={rock.src}
            alt="decorative rock"
            width={rock.size}
            height={rock.size}
            className="drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] object-contain select-none"
            unoptimized
          />
        </div>
      ))}
    </div>
  );
}
