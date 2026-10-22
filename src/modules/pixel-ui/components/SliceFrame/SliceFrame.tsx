import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/utils';
import type { NineSliceSheet, SliceScale, SliceSheet, ThreeSliceSheet } from '../../pixel-ui.types';
import { toSliceGrid } from '../../slice.map';
import { styles } from './SliceFrame.styles';

interface FrameProps extends ComponentPropsWithoutRef<'div'> {
  scale?: SliceScale;
  /** Classes of the inset content wrapper. */
  contentClassName?: string;
  /** Px, max()'d with the grid minimum. */
  minWidth?: number;
  minHeight?: number;
}

type SliceFrameProps = FrameProps & { sheet: SliceSheet };

function SliceFrame({
  sheet,
  scale = 1,
  contentClassName,
  minWidth,
  minHeight,
  className,
  style,
  children,
  ...rest
}: SliceFrameProps) {
  const grid = toSliceGrid(sheet, scale);
  const { top, right, bottom, left } = sheet.inset;

  return (
    <div
      {...rest}
      className={cn(styles.root, className)}
      style={{
        ...style,
        minWidth: Math.max(grid.minWidth, minWidth ?? 0),
        minHeight: Math.max(grid.minHeight, minHeight ?? 0),
        height: grid.fixedHeight ?? undefined,
      }}
    >
      <div
        aria-hidden
        className={styles.art}
        style={{ gridTemplateColumns: grid.columns, gridTemplateRows: grid.rows }}
      >
        {grid.cells.map((cell) => (
          <div key={cell.key} className={styles.cell} style={cell.style} />
        ))}
      </div>
      <div
        className={cn(styles.content, contentClassName)}
        style={{
          padding: `${top * scale}px ${right * scale}px ${bottom * scale}px ${left * scale}px`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function NineSlice(props: FrameProps & { sheet: NineSliceSheet }) {
  return <SliceFrame {...props} />;
}

export function ThreeSlice(props: FrameProps & { sheet: ThreeSliceSheet }) {
  return <SliceFrame {...props} />;
}
