import type { ComponentPreview } from '../../testbed.types';
import type { PreviewGroup } from './TestbedSidebar.types';

const byName = (a: string, b: string) => a.localeCompare(b);

/** Groups shown above the rest, in this order, so the dev tools are always at the top of the sidebar. */
export const PINNED_GROUPS = ['Dev tools'];

function compareGroups(a: string, b: string): number {
  const pinnedA = PINNED_GROUPS.indexOf(a);
  const pinnedB = PINNED_GROUPS.indexOf(b);
  if (pinnedA !== -1 || pinnedB !== -1) {
    if (pinnedA === -1) return 1;
    if (pinnedB === -1) return -1;
    return pinnedA - pinnedB;
  }
  return byName(a, b);
}

/** Groups previews by their `group`: pinned groups first, then the rest alphabetically; titles are alphabetical. */
export function groupPreviews(previews: ComponentPreview[]): PreviewGroup[] {
  const previewsByGroup = new Map<string, ComponentPreview[]>();

  for (const preview of previews) {
    const groupPreviews = previewsByGroup.get(preview.group) ?? [];
    previewsByGroup.set(preview.group, [...groupPreviews, preview]);
  }

  return [...previewsByGroup.keys()].sort(compareGroups).map((name) => ({
    name,
    previews: [...(previewsByGroup.get(name) ?? [])].sort((a, b) => byName(a.title, b.title)),
  }));
}

/** True when `pathname` (trailing slash tolerated) equals exactly `/testbed/<slug>`. */
export function isRowActive(pathname: string, slug: string): boolean {
  if (pathname === '/') return false;
  const normalized = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  return normalized === `/testbed/${slug}`;
}

/** True when `pathname` is the testbed index: `/testbed` or `/testbed/`. */
export function isIndexRoute(pathname: string): boolean {
  return pathname === '/testbed' || pathname === '/testbed/';
}

/** "N states", except "1 state" for exactly one. */
export function pluralizeStates(count: number): string {
  return `${count} state${count === 1 ? '' : 's'}`;
}
