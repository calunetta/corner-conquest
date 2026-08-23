'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';

const ROCK_SPRITES = [
  '/sprites/small_rock.gif',
  '/sprites/mini_rock.gif',
  '/sprites/medium_rock.gif',
  '/sprites/big_rock.gif',
];

interface MapDecorationsProps {
  cols: number;
  rows: number;
  tileSize: number;
  gap: number;
  isMobile: boolean;
}

export function MapDecorations({ cols, rows, tileSize, gap, isMobile }: MapDecorationsProps) {
  const decorations = useMemo(() => {
    if (isMobile) return [];

    const result: { src: string; style: React.CSSProperties }[] = [];
    const totalGridWidth = cols * tileSize + (cols - 1) * gap;
    const totalGridHeight = rows * tileSize + (rows - 1) * gap;
    const numRocks = 50;

    let attempts = 0;
    while (result.length < numRocks && attempts < numRocks * 10) {
      attempts++;
      const rockSrc = ROCK_SPRITES[Math.floor(Math.random() * ROCK_SPRITES.length)];
      const size = Math.random() * 20 + 12;
      const isHorizontalGap = Math.random() > 0.5;
      let x: number, y: number;

      if (isHorizontalGap) {
        const col = Math.floor(Math.random() * Math.max(1, cols - 1));
        const gapXStart = (col + 1) * tileSize + col * gap;
        x = gapXStart + Math.random() * gap;
        y = Math.random() * totalGridHeight;
      } else {
        const row = Math.floor(Math.random() * Math.max(1, rows - 1));
        const gapYStart = (row + 1) * tileSize + row * gap;
        x = Math.random() * totalGridWidth;
        y = gapYStart + Math.random() * gap;
      }

      if (x < size || y < size || x > totalGridWidth - size || y > totalGridHeight - size) {
        continue;
      }

      result.push({
        src: rockSrc,
        style: {
          position: 'absolute',
          zIndex: 5,
          pointerEvents: 'none',
          width: `${size}px`,
          height: `${size}px`,
          left: `${x}px`,
          top: `${y}px`,
          transform: 'translate(-50%, -50%)',
        },
      });
    }

    return result;
  }, [isMobile, tileSize, gap, cols, rows]);

  if (isMobile || decorations.length === 0) return null;

  return (
    <>
      {decorations.map((deco, index) => (
        <Image
          key={`deco-${index}`}
          src={deco.src}
          alt="decorative rock"
          width={20}
          height={20}
          style={deco.style}
          unoptimized
        />
      ))}
    </>
  );
}
