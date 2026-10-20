import { cva } from 'class-variance-authority';

export const styles = {
  root: cva('relative shrink-0', {
    variants: {
      size: {
        tile: 'transition-transform duration-150 hover:scale-105 motion-reduce:transform-none',
        hero: '',
        'hero-compact': '',
      },
    },
  }),
  image: 'h-full w-full rounded-lg object-contain drop-shadow-lg select-none',
  placeholder: 'flex h-full w-full items-center justify-center rounded-lg bg-muted/40',
  placeholderIcon: 'h-6 w-6 text-muted-foreground',
} as const;
