import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { styles as actionsPanelStyles } from './ActionsPanel.styles';

export const styles = {
  /** Spacer div that reserves space for the fixed bar to avoid covering content below. */
  spacer: 'block',

  /** Fixed bottom bar container: full width, positioned over viewport, with top border and upward shadow. */
  barContainer:
    'fixed inset-x-0 bottom-0 z-30 border-t border-white/10 shadow-[0_-8px_32px_rgba(0,0,0,0.5)] bg-background/40 backdrop-blur-xl flex flex-col gap-1.5 p-3',

  /** Row 1: conditional Cancel/Deselect/banner buttons. */
  row1: 'flex flex-wrap items-center justify-between gap-1.5',

  /** Row 2: main grid for Position/Attack/Deploy/End Turn. Variants for 3 or 4 columns. */
  row2: cva('grid gap-1.5', {
    variants: {
      columnCount: {
        3: 'grid-cols-3',
        4: 'grid-cols-4',
      },
    },
    defaultVariants: {
      columnCount: 4,
    },
  }),

  /** Ring merged onto row2 while an army is selected, matching the desktop mainGrid emphasis. */
  row2Active: 'rounded-lg ring-1 ring-primary/40',

  /** Cancel button (Row 1, conditional). */
  cancelButton: 'h-7 text-xs px-2',

  /** Deselect button (Row 1, conditional). */
  deselectButton: 'h-7 text-xs px-2',

  /** Extra-move banner (Row 1, conditional). */
  extraMoveBanner:
    'bg-amber-500/20 border border-amber-500/40 rounded-lg p-2 text-xs font-semibold text-amber-200 flex items-center gap-2 animate-pulse',

  /** "More Actions" button trigger (opens the sheet). */
  moreActionsButton: 'h-7 text-xs px-2 whitespace-nowrap flex items-center gap-1',

  /** End Turn button container (mobile-only sizing, reused for desktop internal tokens). */
  endTurnButtonMobile: cn(
    actionsPanelStyles.buttonVariant({ isMain: true, isPendingMatch: false }),
    'relative overflow-hidden',
  ),

  /** Sheet container with motion-reduce overrides. */
  sheetContent: 'motion-reduce:duration-0 motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none',

  /** Sheet header: title, info beacon, deck count. */
  sheetHeader: 'flex flex-col gap-2',

  /** Sheet header title. */
  sheetTitle: 'text-base font-bold flex items-center gap-2',

  /** Sheet deck count text. */
  sheetDeckCount: 'text-xs text-muted-foreground font-semibold',

  /** Sheet body: secondary actions grid (2 columns). */
  sheetBody: 'grid grid-cols-2 gap-1.5',
} as const;
