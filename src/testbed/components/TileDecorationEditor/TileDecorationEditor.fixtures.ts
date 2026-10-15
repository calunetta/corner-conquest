import type { DecorationLayoutsConfig } from '@/modules/map';

/** Deterministic, shared by the hook/view tests and the preview. Independent of the real
 *  migrated config: just enough variety (a populated layout, a multi-layout scenario, several
 *  empty "Default" layouts) to exercise every control without depending on production art. */
export const sampleDecorationImages: string[] = [
  '/sprites/decorations/pine_tree.gif',
  '/sprites/decorations/spring_tree.gif',
  '/sprites/decorations/autmn_tree.gif',
  '/sprites/decorations/tree.gif',
];

export const sampleDecorationLayoutsConfig: DecorationLayoutsConfig = {
  base: [
    {
      id: 'base-default',
      name: 'Default',
      instances: [
        { id: 'base-default-0', image: sampleDecorationImages[0], top: 36.5, left: 44.5, size: 15, z: 10 },
        { id: 'base-default-1', image: sampleDecorationImages[1], top: 37.5, left: 42.5, size: 15, z: 10 },
      ],
    },
  ],
  special: [
    {
      id: 'special-default',
      name: 'Default',
      instances: [{ id: 'special-default-0', image: sampleDecorationImages[0], top: 13, left: 8, size: 16, z: 10 }],
    },
  ],
  'empty-2': [
    {
      id: 'empty-2-default',
      name: 'Default',
      instances: [
        { id: 'empty-2-default-0', image: sampleDecorationImages[0], top: 32, left: 38, size: 28, z: 12 },
        { id: 'empty-2-default-1', image: sampleDecorationImages[1], top: 38, left: 62, size: 28, z: 14 },
      ],
    },
    {
      id: 'empty-2-alt',
      name: 'Clustered',
      instances: [{ id: 'empty-2-alt-0', image: sampleDecorationImages[2], top: 50, left: 50, size: 28, z: 12 }],
    },
  ],
  'empty-3': [{ id: 'empty-3-default', name: 'Default', instances: [] }],
  'resource-1': [{ id: 'resource-1-default', name: 'Default', instances: [] }],
  'resource-2': [{ id: 'resource-2-default', name: 'Default', instances: [] }],
  'resource-3': [{ id: 'resource-3-default', name: 'Default', instances: [] }],
  'resource-4': [{ id: 'resource-4-default', name: 'Default', instances: [] }],
  'monster-alive': [{ id: 'monster-alive-default', name: 'Default', instances: [] }],
  'monster-cleared': [{ id: 'monster-cleared-default', name: 'Default', instances: [] }],
};
