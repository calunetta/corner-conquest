'use client';

import { cn } from '@/lib/utils';
import { NineSlice, ThreeSlice } from '../SliceFrame/SliceFrame';
import { usePixelButtonVisual } from './PixelButton.hook';
import { toButtonArt } from './PixelButton.map';
import { styles } from './PixelButton.styles';
import type { PixelButtonProps, PixelButtonVisual } from './PixelButton.types';

const VISUALS: readonly PixelButtonVisual[] = ['regular', 'hover', 'pressed', 'disabled'];
const ICON_SHEET_PX = 64;
const LOADING_TEXT = '...';

export function PixelButton({
  variant = 'primary',
  size = 'default',
  loading = false,
  disabled,
  className,
  children,
  ...rest
}: PixelButtonProps) {
  const isDisabled = Boolean(disabled) || loading;
  const { visual, handlers } = usePixelButtonVisual(isDisabled);
  const art = toButtonArt(variant, size);

  return (
    <button
      type="button"
      {...rest}
      {...handlers}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      data-visual={visual}
      className={cn(styles.root({ size }), className)}
    >
      <span aria-hidden className={styles.artStack(visual === 'pressed' && art.kind !== 'icon')}>
        {VISUALS.map((layerVisual) => {
          const layerState = layerVisual === visual ? 'visible' : 'invisible';
          if (art.kind === 'icon') {
            return (
              <span
                key={layerVisual}
                className={cn(
                  styles.iconLayer,
                  layerState,
                  layerVisual === 'disabled' && styles.iconDisabled,
                )}
                style={{
                  backgroundImage: `url("${art.urls[layerVisual]}")`,
                  backgroundSize: `${ICON_SHEET_PX}px ${ICON_SHEET_PX}px`,
                }}
              />
            );
          }
          const layerClassName = cn(styles.sliceLayer, layerState);
          if (art.kind === 'three') {
            return <ThreeSlice key={layerVisual} sheet={art.sheets[layerVisual]} className={layerClassName} />;
          }
          return <NineSlice key={layerVisual} sheet={art.sheets[layerVisual]} className={layerClassName} />;
        })}
      </span>
      <span className={styles.label({ visual, loading })}>{children}</span>
      {loading && (
        <span aria-hidden className={styles.loadingDots}>
          {LOADING_TEXT}
        </span>
      )}
    </button>
  );
}
