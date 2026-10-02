import { mapZoomControlsPreview } from './legacy/MapZoomControls.preview';
import type { ComponentPreview } from './testbed.types';

/** Every preview shown in the testbed. Register new previews here (skill: testbed-preview). */
export const previews: ComponentPreview[] = [mapZoomControlsPreview];

export function findPreview(slug: string): ComponentPreview | undefined {
  return previews.find((preview) => preview.slug === slug);
}
