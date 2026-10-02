import type { ComponentPreview } from '../../testbed.types';
import type { PreviewGroup } from './TestbedSidebar.types';

const byName = (a: string, b: string) => a.localeCompare(b);

/** Groups previews by their `group`, sorting groups and titles alphabetically for a stable catalog. */
export function groupPreviews(previews: ComponentPreview[]): PreviewGroup[] {
  const previewsByGroup = new Map<string, ComponentPreview[]>();

  for (const preview of previews) {
    const groupPreviews = previewsByGroup.get(preview.group) ?? [];
    previewsByGroup.set(preview.group, [...groupPreviews, preview]);
  }

  return [...previewsByGroup.keys()].sort(byName).map((name) => ({
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
