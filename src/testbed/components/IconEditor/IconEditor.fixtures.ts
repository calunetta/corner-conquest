import type { IconOverridesConfig, IconRegistryEntry } from '@/modules/icons';

/** Deterministic sample registry shared by tests and the testbed preview: spans combat/hud/map
 *  and mixes both source kinds. The image entry reuses a real sprite path (see
 *  src/modules/shared/fight-icon.tsx) rather than inventing one. */
export const sampleIconRegistry: IconRegistryEntry[] = [
  {
    id: 'swords',
    label: 'Swords',
    module: 'combat',
    defaultSource: { kind: 'lucide', name: 'Swords' },
    defaultRotation: 0,
    defaultSize: 100,
  },
  {
    id: 'info',
    label: 'Info',
    module: 'hud',
    defaultSource: { kind: 'lucide', name: 'Info' },
    defaultRotation: 0,
    defaultSize: 100,
  },
  {
    id: 'icon-fight',
    label: 'Icon Fight',
    module: 'hud',
    defaultSource: { kind: 'image', src: '/sprites/icon_fight.png' },
    defaultRotation: 0,
    defaultSize: 100,
  },
  {
    id: 'zoom-in',
    label: 'Zoom In',
    module: 'map',
    defaultSource: { kind: 'lucide', name: 'ZoomIn' },
    defaultRotation: 0,
    defaultSize: 100,
  },
];

/** One icon already has a saved override. */
export const sampleSavedOverrides: IconOverridesConfig = {
  info: { rotation: 45 },
};

/** Same saved override, plus an unsaved edit to "zoom-in" to exercise the dirty-row state. */
export const sampleDraftOverrides: IconOverridesConfig = {
  info: { rotation: 45 },
  'zoom-in': { rotation: 90 },
};
