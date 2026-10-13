import { useEffect, useState } from 'react';
import {
  CLOUD_LEFT_PERCENT_RANGE,
  CLOUD_SCALE_RANGE,
  CLOUD_SPAWN,
  CLOUD_TOP_PERCENT_RANGE,
  type NumberRange,
} from './LobbyBackground.layout';
import type { CloudViewModel, LobbyBackgroundViewModel } from './LobbyBackground.types';

const MS_PER_SECOND = 1000;

const CLOUD_SPRITES = [
  '/sprites/cloud_small.png',
  '/sprites/cloud_medium.png',
  '/sprites/cloud_big.png',
];

function randomWithin(range: NumberRange): number {
  return range.min + Math.random() * (range.max - range.min);
}

function pickRandomSprite(): string {
  return CLOUD_SPRITES[Math.floor(Math.random() * CLOUD_SPRITES.length)];
}

function createCloud(id: string): CloudViewModel {
  return {
    id,
    left: randomWithin(CLOUD_LEFT_PERCENT_RANGE),
    top: randomWithin(CLOUD_TOP_PERCENT_RANGE),
    durationSeconds: randomWithin({ min: CLOUD_SPAWN.minDurationSeconds, max: CLOUD_SPAWN.maxDurationSeconds }),
    scale: randomWithin(CLOUD_SCALE_RANGE),
    sprite: pickRandomSprite(),
  };
}

/** Owns only the cloud lifecycle: spawn on an interval, remove each cloud when its lifetime ends. */
export function useLobbyBackground(): LobbyBackgroundViewModel {
  const [clouds, setClouds] = useState<CloudViewModel[]>([]);

  useEffect(() => {
    let nextCloudNumber = 0;
    // One removal timer per live cloud, so the map size is the live cloud count.
    const removalTimers = new Map<string, ReturnType<typeof setTimeout>>();

    const removeCloud = (id: string) => {
      removalTimers.delete(id);
      setClouds((current) => current.filter((cloud) => cloud.id !== id));
    };

    const spawnCloud = () => {
      if (removalTimers.size >= CLOUD_SPAWN.maxConcurrent) return;

      const cloud = createCloud(`cloud-${nextCloudNumber}`);
      nextCloudNumber += 1;
      removalTimers.set(
        cloud.id,
        setTimeout(() => removeCloud(cloud.id), cloud.durationSeconds * MS_PER_SECOND),
      );
      setClouds((current) => [...current, cloud]);
    };

    const spawnInterval = setInterval(spawnCloud, CLOUD_SPAWN.spawnIntervalMs);

    return () => {
      clearInterval(spawnInterval);
      removalTimers.forEach((timer) => clearTimeout(timer));
      removalTimers.clear();
    };
  }, []);

  return { clouds };
}
