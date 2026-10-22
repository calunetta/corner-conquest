import { cn } from '@/lib/utils';
import { Ribbon } from '../Ribbon/Ribbon';
import { NineSlice } from '../SliceFrame/SliceFrame';
import { toPanelSpec } from './PixelPanel.map';
import { paddingClass, styles, textToneClass } from './PixelPanel.styles';
import type { PixelPanelProps } from './PixelPanel.types';

export function PixelPanel({
  variant = 'paper',
  title,
  titleColor = 'blue',
  titleAs = 'h2',
  padding = 'md',
  className,
  children,
  ...rest
}: PixelPanelProps) {
  const spec = toPanelSpec(variant);
  const isTitled = Boolean(title);

  return (
    <div className={styles.root(isTitled)}>
      {title && (
        <div className={styles.titleSlot}>
          <Ribbon as={titleAs} color={titleColor}>
            {title}
          </Ribbon>
        </div>
      )}
      <NineSlice
        {...rest}
        sheet={spec.sheet}
        minWidth={spec.minWidth}
        minHeight={spec.minHeight}
        className={cn(styles.frame, className)}
        contentClassName={textToneClass[spec.textTone]}
      >
        <div className={cn(paddingClass[padding], isTitled && styles.titledContent)}>{children}</div>
      </NineSlice>
    </div>
  );
}
