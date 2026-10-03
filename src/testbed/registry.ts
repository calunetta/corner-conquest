import { mapZoomControlsPreview } from './legacy/MapZoomControls.preview';
import { sabotageDialogPreview } from './legacy/SabotageDialog.preview';
import { combatDialogPreview } from '@/modules/combat/components/CombatDialog/CombatDialog.preview';
import type { ComponentPreview } from './testbed.types';

/** Every preview shown in the testbed. Register new previews here (skill: testbed-preview). */
export const previews: ComponentPreview[] = [mapZoomControlsPreview, sabotageDialogPreview, combatDialogPreview];

export function findPreview(slug: string): ComponentPreview | undefined {
  return previews.find((preview) => preview.slug === slug);
}
