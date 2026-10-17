import type { ReactNode } from 'react';

export type Status = { kind: 'idle' } | { kind: 'busy' } | { kind: 'ok'; message: string } | { kind: 'error'; message: string };

/** Status line for the testbed lab's save, upload and speed actions. */
export function StatusText({ status }: { status: Status }): ReactNode {
  if (status.kind === 'ok') return <span className="text-sm text-muted-foreground">{status.message}</span>;
  if (status.kind === 'error') return <span className="text-sm text-destructive">{status.message}</span>;
  if (status.kind === 'busy') return <span className="text-sm text-muted-foreground">Working…</span>;
  return null;
}
