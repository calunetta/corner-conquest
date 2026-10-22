import type { ComponentPreview } from '@/testbed';
import { Ribbon } from './Ribbon';

const LONG_TEXT = 'A very long ribbon title that cannot possibly fit on a single line';

export const ribbonPreview: ComponentPreview = {
  slug: 'pixel-ui-ribbon',
  title: 'Ribbon',
  group: 'Pixel UI',
  states: [
    { name: 'Blue', render: () => <Ribbon color="blue">Blue ribbon</Ribbon> },
    { name: 'Red', render: () => <Ribbon color="red">Red ribbon</Ribbon> },
    { name: 'Yellow', render: () => <Ribbon color="yellow">Yellow ribbon</Ribbon> },
    {
      name: 'Long text overflow',
      render: () => (
        <div className="w-60 max-w-full">
          <Ribbon color="blue">{LONG_TEXT}</Ribbon>
        </div>
      ),
    },
  ],
};
