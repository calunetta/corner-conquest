import type { PreviewGroup } from './TestbedSidebar.types';

export const sampleGroups: PreviewGroup[] = [
  {
    name: 'HUD',
    previews: [
      {
        slug: 'hud-player-standings',
        title: 'Player standings',
        group: 'HUD',
        states: [
          { name: 'Mid game', render: () => null },
          { name: 'Tied for first', render: () => null },
        ],
      },
    ],
  },
  {
    name: 'Legacy',
    previews: [
      {
        slug: 'legacy-map-zoom',
        title: 'Map zoom controls',
        group: 'Legacy',
        states: [{ name: 'Default', render: () => null }],
      },
      {
        slug: 'legacy-sabotage-dialog',
        title: 'Sabotage dialog',
        group: 'Legacy',
        states: [
          { name: 'No target selected', render: () => null },
          { name: 'Target selected', render: () => null },
        ],
      },
    ],
  },
];

export const emptyGroups: PreviewGroup[] = [];
