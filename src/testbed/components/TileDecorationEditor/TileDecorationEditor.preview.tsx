import type { ComponentPreview } from '@/testbed/testbed.types';
import { TileDecorationEditor } from './TileDecorationEditor';

export const tileDecorationEditorPreview: ComponentPreview = {
  slug: 'tile-decoration-editor',
  title: 'Tile Decoration Editor',
  group: 'Dev tools',
  states: [
    { name: 'Editor', render: () => <TileDecorationEditor /> },
  ],
};
