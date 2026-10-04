'use client';

import Image from 'next/image';
import { LOBBY_ISLANDS, LOBBY_BOATS } from './LobbyBackground.map';
import { styles } from './LobbyBackground.styles';

export function LobbyBackground() {
  return (
    <div className={styles.root}>
      {/* Deep Ocean Gradient */}
      <div className={styles.gradientBg} />

      {/* Ambient Radial Bioluminescent Glows */}
      <div className={styles.glowCyan} />
      <div className={styles.glowPurple} />
      <div className={styles.glowAmber} />
      <div className={styles.glowEmerald} />

      {/* Subtle Grid Water Texture */}
      <div className={styles.waterPattern} />

      {/* Floating Tactical Islands */}
      {LOBBY_ISLANDS.map((island) => (
        <div key={island.id} className={island.wrapperClassName}>
          <div className={island.cardClassName}>
            <Image
              src={island.mainSprite.src}
              alt={island.mainSprite.alt}
              width={island.mainSprite.width}
              height={island.mainSprite.height}
              className={island.mainSprite.imageClassName}
              unoptimized
            />
            {island.decorations.map((decoration, idx) => (
              <div key={idx} className={decoration.positionClassName}>
                <Image
                  src={decoration.src}
                  alt={decoration.alt}
                  width={decoration.width}
                  height={decoration.height}
                  className={decoration.imageClassName}
                  unoptimized
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Naval Patrol Fleet */}
      {LOBBY_BOATS.map((boat) => (
        <div key={boat.id} className={boat.wrapperClassName}>
          <Image
            src={boat.sprite.src}
            alt={boat.sprite.alt}
            width={boat.sprite.width}
            height={boat.sprite.height}
            className={boat.sprite.imageClassName}
            unoptimized
          />
        </div>
      ))}

      {/* Subtle Fog & Lighting Particle Highlights */}
      <div className={styles.fogOverlay} />
    </div>
  );
}
