import type { ComponentPreview } from '@/testbed/testbed.types';
import { TileVariantGallery } from './TileVariantGallery';

export const tileVariantGalleryPreview: ComponentPreview = {
  slug: 'tile-variant-gallery',
  title: 'Tile Variant Gallery',
  group: 'Dev tools',
  devTool: true,
  states: [{ name: 'Gallery', render: () => <TileVariantGallery /> }],
};
