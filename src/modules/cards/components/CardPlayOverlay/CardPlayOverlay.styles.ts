import { cn } from '@/lib/utils';

export const styles = {
  root: 'fixed inset-0 z-40 pointer-events-none flex items-center justify-center',
  vignette: ({ isReducedMotion }: { isReducedMotion: boolean }) =>
    cn(
      'absolute inset-0 bg-black/30',
      isReducedMotion ? 'animate-card-play-fade' : 'animate-card-play-vignette',
    ),
  stage: ({ isReducedMotion }: { isReducedMotion: boolean }) =>
    cn(
      'relative flex flex-col items-center gap-3',
      isReducedMotion ? 'animate-card-play-fade' : 'animate-card-play',
    ),
  name: ({ isMobile }: { isMobile: boolean }) =>
    cn(
      'font-black tracking-wide bg-gradient-to-r from-amber-300 via-yellow-400 to-primary bg-clip-text text-transparent',
      isMobile ? 'text-base' : 'text-lg',
    ),
} as const;
