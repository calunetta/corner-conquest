export const styles = {
  root: 'flex flex-col gap-4 text-foreground',
  intro: 'text-sm text-muted-foreground',
  panel: 'flex flex-col gap-2 rounded-lg border border-border bg-card p-3',
  panelTitle: 'text-xs font-semibold uppercase tracking-widest text-muted-foreground',
  statusList: 'flex flex-col gap-1 text-sm',
  buttonRow: 'flex flex-wrap gap-2',
  logList: 'flex flex-col gap-1 text-sm',
  logEntry: 'rounded-md bg-muted px-2 py-1',
  logEmpty: 'text-sm text-muted-foreground',
} as const;
