import type { PanelPadding, PanelSpec } from './PixelPanel.types';

export const styles = {
  root: (isTitled: boolean) => (isTitled ? 'relative mt-8' : 'relative'),
  titleSlot: 'absolute left-1/2 -top-[30px] z-10 max-w-full -translate-x-1/2',
  frame: 'block',
  titledContent: 'pt-8',
} as const;

export const textToneClass: Record<PanelSpec['textTone'], string> = {
  ink: 'text-ink',
  light: 'text-foreground',
};

export const paddingClass: Record<PanelPadding, string> = {
  none: '',
  sm: 'p-2',
  md: 'p-4',
};
