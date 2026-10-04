'use client';

import { MapDecorations } from './MapDecorations';
import type { ComponentPreview } from '@/testbed/testbed.types';

export const mapDecorationsPreview: ComponentPreview = {
  slug: 'map-decorations',
  title: 'Map Decorations',
  group: 'Game map',
  states: [
    {
      name: 'Desktop',
      render: () => <MapDecorations isMobile={false} />,
    },
    {
      name: 'Mobile',
      render: () => <MapDecorations isMobile={true} />,
    },
  ],
};
