import type { ComponentPreview } from '../../testbed.types';
import type { PreviewGroup } from './PreviewCatalog.types';

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
