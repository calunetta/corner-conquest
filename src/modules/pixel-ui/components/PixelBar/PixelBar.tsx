import { cn } from '@/lib/utils';
import { ThreeSlice } from '../SliceFrame/SliceFrame';
import { BAR_ART, toBarFill } from './PixelBar.map';
import { styles } from './PixelBar.styles';
import type { PixelBarProps } from './PixelBar.types';

const FULL_PERCENT = 100;

export function PixelBar({ value, max, size = 'big', label, className, ...rest }: PixelBarProps) {
  const art = BAR_ART[size];
  const { fraction, valueNow, valueMax } = toBarFill(value, max);

  return (
    <ThreeSlice
      sheet={art.sheet}
      role="progressbar"
      aria-label={rest['aria-label']}
      aria-valuemin={0}
      aria-valuemax={valueMax}
      aria-valuenow={valueNow}
      className={cn(styles.root, className)}
    >
      <div className={styles.trackBox} style={{ height: art.trackHeight }}>
        <div className={styles.track}>
          <span
            data-testid="pixel-bar-fill"
            className={styles.fill}
            style={{
              width: `${fraction * FULL_PERCENT}%`,
              backgroundImage: `url("${art.fillUrl}")`,
              backgroundSize: `100% ${art.fillSheetHeight}px`,
              backgroundPosition: `0 -${art.fillOffsetY}px`,
            }}
          />
        </div>
        {label && <span className={styles.label}>{label}</span>}
      </div>
    </ThreeSlice>
  );
}
