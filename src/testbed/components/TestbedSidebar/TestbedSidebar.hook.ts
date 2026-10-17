import { usePathname } from 'next/navigation';
import { previews } from '../../registry';
import { isPreviewVisible } from '../../testbed.config';
import { groupPreviews } from './TestbedSidebar.map';
import type { TestbedSidebarViewModel } from './TestbedSidebar.types';

/** Connects TestbedSidebarView: reads the registry (`previews`) and the route (`usePathname`). */
export function useTestbedSidebar(): TestbedSidebarViewModel {
  const pathname = usePathname();
  const groups = groupPreviews(previews.filter((preview) => isPreviewVisible(preview)));

  return { groups, pathname };
}
