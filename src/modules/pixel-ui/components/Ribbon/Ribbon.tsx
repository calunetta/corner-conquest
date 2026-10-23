import { forwardRef, type ElementType } from 'react';
import { cn } from '@/lib/utils';
import { ThreeSlice } from '../SliceFrame/SliceFrame';
import { toRibbonSheet } from './Ribbon.map';
import { ribbonTextColor, styles } from './Ribbon.styles';
import type { RibbonProps } from './Ribbon.types';

const RIBBON_MIN_WIDTH = 192;

export const Ribbon = forwardRef<HTMLElement, RibbonProps>(function Ribbon(
  { color = 'blue', as = 'div', icon, className, children, title, ...rest },
  ref,
) {
  const Text = as as ElementType;
  // Truncated text needs its full form on hover; only a string can serve as a tooltip.
  const fullText = title ?? (typeof children === 'string' ? children : undefined);

  return (
    <ThreeSlice
      sheet={toRibbonSheet(color)}
      minWidth={RIBBON_MIN_WIDTH}
      className={cn(styles.frame, className)}
      contentClassName={styles.content}
    >
      {icon}
      <Text ref={ref} {...rest} title={fullText} className={cn(styles.text, ribbonTextColor[color])}>
        {children}
      </Text>
    </ThreeSlice>
  );
});
