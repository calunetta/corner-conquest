import type { ComponentPreview } from '../../testbed.types';

export interface PreviewGroup {
  name: string;
  previews: ComponentPreview[];
}

export interface TestbedSidebarViewModel {
  groups: PreviewGroup[];
  /** The current route's pathname, from usePathname(); no query string. */
  pathname: string;
}
