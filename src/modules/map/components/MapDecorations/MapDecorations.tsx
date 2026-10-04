import React from 'react';
import Image from 'next/image';
import { toVisibleDecorations } from './MapDecorations.map';
import { styles } from './MapDecorations.styles';
import type { MapDecorationsProps } from './MapDecorations.types';

export const MapDecorations = React.memo(function MapDecorations({ isMobile = false }: MapDecorationsProps) {
  const { rocks, clouds } = toVisibleDecorations(isMobile);

  return (
    <div className={styles.root} aria-hidden="true">
      {/* Decorative Rocks */}
      {rocks.map((rock) => (
        <div
          key={rock.id}
          data-testid="decorative-rock"
          className={styles.rockContainer}
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
            className={styles.rockImage}
            unoptimized
          />
        </div>
      ))}

      {/* Decorative Clouds surrounding the uncharted waters */}
      {clouds.map((cloud) => (
        <div
          key={cloud.id}
          data-testid="decorative-cloud"
          className={styles.cloudContainer}
          style={{
            left: cloud.left,
            top: cloud.top,
            width: `${cloud.width}px`,
            height: `${cloud.height}px`,
            opacity: cloud.opacity ?? 0.8,
          }}
        >
          <Image
            src={cloud.src}
            alt="perimeter cloud"
            width={cloud.width}
            height={cloud.height}
            className={styles.cloudImage}
            unoptimized
          />
        </div>
      ))}
    </div>
  );
});
