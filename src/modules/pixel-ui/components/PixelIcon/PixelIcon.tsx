import { cn } from '@/lib/utils';
import { toIconSource } from './PixelIcon.map';
import { styles } from './PixelIcon.styles';
import type { PixelIconProps } from './PixelIcon.types';

export function PixelIcon({ name, size = 'lg', state = 'regular', label, className }: PixelIconProps) {
  const source = toIconSource(name, size, state);
  if (!source) return null;

  const accessibility = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };

  return (
    <span
      className={cn(styles.icon, className)}
      style={{
        width: source.px,
        height: source.px,
        backgroundImage: `url("${source.url}")`,
        backgroundSize: `${source.px}px ${source.px}px`,
      }}
      {...accessibility}
    />
  );
}
