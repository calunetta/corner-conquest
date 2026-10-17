import { ResourceType } from '@/lib/types';
import { getResourceDisplayName, toResourceIconId } from '@/modules/shared';
import type { WealthyDialogViewModel } from './WealthyDialog.types';


/** Fixed order, legacy WealthyDialog.tsx:22. */
const RESOURCES: ResourceType[] = [ResourceType.Food, ResourceType.Wood, ResourceType.Gold];

/** Pure. No gameState/props dependency: always the same 3 resources in the same order. */
export function toWealthyDialogViewModel(): WealthyDialogViewModel {
  return {
    options: RESOURCES.map((resource) => ({
      resource,
      iconId: toResourceIconId(resource),
      displayName: getResourceDisplayName(resource),
    })),
  };
}
