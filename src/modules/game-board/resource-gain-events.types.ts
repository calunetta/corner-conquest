import type { ResourceType } from '@/lib/types';

export interface ResourceGainEvent {
  playerId: string;
  type: ResourceType;
  /** Always an array; empty = no tile for this gain (Wealthy, Steal). May contain duplicates. */
  tileIds: string[];
}
