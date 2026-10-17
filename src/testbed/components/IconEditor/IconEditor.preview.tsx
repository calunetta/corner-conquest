import type { ComponentPreview } from '@/testbed/testbed.types';
import { IconEditor } from './IconEditor';

// Renders the connected editor, like the Tile Decoration Editor preview: uploads go through the
// dev-only routes and the picked file is what gets shown. A fixture stand-in here once swapped
// in a sample sprite for every upload, hiding the real result.
export const iconEditorPreview: ComponentPreview = {
  slug: 'icon-editor',
  title: 'Icon Editor',
  group: 'Dev tools',
  devTool: true,
  states: [
    { name: 'Editor', render: () => <IconEditor /> },
  ],
};
