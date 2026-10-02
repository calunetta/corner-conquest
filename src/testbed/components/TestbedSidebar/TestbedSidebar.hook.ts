import { usePathname } from 'next/navigation';
import { previews } from '../../registry';
import { groupPreviews } from './TestbedSidebar.map';
import type { TestbedSidebarViewModel } from './TestbedSidebar.types';

/** Connects TestbedSidebarView: reads the registry (`previews`) and the route (`usePathname`). */
export function useTestbedSidebar(): TestbedSidebarViewModel {
  const pathname = usePathname();
  const groups = groupPreviews(previews);

  return { groups, pathname };
}
