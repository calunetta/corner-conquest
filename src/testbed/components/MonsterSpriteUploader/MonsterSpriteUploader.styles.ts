import { cva } from 'class-variance-authority';
import { styles as editorStyles } from '../TileDecorationEditor/TileDecorationEditor.styles';

/** Same size AnimatedMonster renders a monster at in-game (MONSTER_SPRITE_SIZE_PX, 64). It is not
 *  exported from @/modules/map's index, so the preview box mirrors it with `h-16 w-16` (4rem). */
export const PREVIEW_SPRITE_SIZE_PX = 64;

export const styles = {
  root: 'flex w-full justify-center',
  panel: 'flex w-full max-w-[640px] flex-col gap-3 rounded-xl border border-white/10 bg-black/60 p-3 backdrop-blur-md',
  panelTitle: editorStyles.panelTitle,
  sectionHeading: 'text-sm font-semibold text-foreground',
  form: 'flex flex-col gap-3 md:flex-row md:items-start',
  fieldStack: 'flex flex-1 flex-col gap-3',
  fieldRow: editorStyles.fieldRow,
  label: editorStyles.label,
  nameField: editorStyles.nameField,
  fileInput:
    'text-xs text-muted-foreground file:mr-2 file:rounded-md file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-xs file:text-secondary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  bossRow: 'flex items-center justify-between gap-2',
  fieldError: 'text-xs text-destructive',
  softWarning: 'min-h-4 text-xs text-accent transition-opacity duration-200 motion-reduce:transition-none',
  previewRow: 'flex flex-row gap-3',
  previewColumn: 'flex flex-col items-center gap-1',
  previewBox: 'relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg',
  previewBoxEmpty: 'border border-dashed border-white/30 p-1 text-center text-[10px] text-muted-foreground',
  previewImage: 'object-contain',
  submitRow: 'flex flex-wrap items-center gap-2 border-t border-white/10 pt-3',
  statusText: cva('text-xs transition-opacity duration-200 motion-reduce:transition-none', {
    variants: {
      status: {
        idle: 'opacity-0',
        submitting: 'opacity-0',
        success: 'text-accent opacity-100',
        error: 'text-destructive opacity-100',
      },
    },
  }),
  spinner: editorStyles.spinner,
  catalogSection: 'flex flex-col gap-2 border-t border-white/10 pt-3',
  catalogList: 'flex max-h-64 flex-col gap-1.5 overflow-y-auto',
  catalogRow: 'flex w-full flex-wrap items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-foreground',
  catalogThumbnail: 'h-8 w-8 shrink-0 object-contain',
  catalogName: 'min-w-[8rem] flex-1 truncate',
  catalogBadges: 'flex shrink-0 items-center gap-1',
  bossBadge: 'border-accent/60 text-accent',
} as const;
