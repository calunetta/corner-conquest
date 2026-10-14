import type { ResourceGainLogEntry, ResourceType } from '@/lib/types';

/** Converts a reducer's per-type gained-amount map (and optional per-type tile-id map) into the
 *  flat array `pushLogEntry` attaches as `resourceGain`. A type with amount <= 0 is dropped. A
 *  type absent from `tileIdsByType` (or passed with an empty array) gets no `tileIds` field. */
export function toResourceGainEntries(
  amounts: Partial<Record<ResourceType, number>>,
  tileIdsByType?: Partial<Record<ResourceType, string[]>>,
): ResourceGainLogEntry[] {
  return Object.entries(amounts)
    .filter(([, amount]) => amount !== undefined && amount > 0)
    .map(([type, amount]) => {
      const resourceType = type as ResourceType;
      const tileIds = tileIdsByType?.[resourceType];
      return tileIds && tileIds.length > 0
        ? { type: resourceType, amount: amount as number, tileIds: [...tileIds] }
        : { type: resourceType, amount: amount as number };
    });
}
