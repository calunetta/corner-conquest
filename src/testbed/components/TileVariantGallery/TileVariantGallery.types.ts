import type { TileVariant } from '@/modules/map/components/TileVariants/TileVariants.config';

/** One section of the gallery: a base colour, or a non-base type. */
export interface VariantGroup {
  key: string;
  label: string;
  variants: TileVariant[];
}

export interface DeleteFailure {
  id: string;
  message: string;
}

/** The result of deleting one variant. `sha` is the file's sha to send with the next delete. */
export type RemoveOutcome = { ok: true; sha: string } | { ok: false; message: string; sha: string };

export interface DeleteRun {
  deletedIds: string[];
  failures: DeleteFailure[];
  sha: string;
}
