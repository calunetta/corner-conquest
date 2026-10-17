import type { IslandResource } from '@/lib/types';
import { getResourceDisplayName, toResourceIconId } from '@/modules/shared';
import type { PositionDialogViewModel } from './PositionDialog.types';


/** Pure. Mirrors legacy PositionDialog.tsx exactly. */
export function toPositionDialogViewModel(resources: IslandResource[]): PositionDialogViewModel {
  return {
    options: resources.map((resource) => ({
      type: resource.type,
      amount: resource.amount,
      iconId: toResourceIconId(resource.type),
      displayName: getResourceDisplayName(resource.type),
    })),
  };
}
