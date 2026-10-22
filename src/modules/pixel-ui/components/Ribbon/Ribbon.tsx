import { cn } from '@/lib/utils';
import { ThreeSlice } from '../SliceFrame/SliceFrame';
import { toRibbonSheet } from './Ribbon.map';
import { ribbonTextColor, styles } from './Ribbon.styles';
import type { RibbonProps } from './Ribbon.types';

const RIBBON_MIN_WIDTH = 192;

export function Ribbon({ color = 'blue', as: Text = 'div', icon, className, children }: RibbonProps) {
  return (
    <ThreeSlice
      sheet={toRibbonSheet(color)}
      minWidth={RIBBON_MIN_WIDTH}
      className={cn(styles.frame, className)}
      contentClassName={styles.content}
    >
      {icon}
      <Text title={children} className={cn(styles.text, ribbonTextColor[color])}>
        {children}
      </Text>
    </ThreeSlice>
  );
}
