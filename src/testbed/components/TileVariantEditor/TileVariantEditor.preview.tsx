import type { ComponentPreview } from '@/testbed/testbed.types';
import { TileVariantEditor } from './TileVariantEditor';

export const tileVariantEditorPreview: ComponentPreview = {
  slug: 'tile-variant-editor',
  title: 'Tile Variant Editor',
  group: 'Dev tools',
  devTool: true,
  states: [{ name: 'Editor', render: () => <TileVariantEditor /> }],
};
