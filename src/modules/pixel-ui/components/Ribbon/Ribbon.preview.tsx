import type { ComponentPreview } from '@/testbed';
import { PixelIcon } from '../PixelIcon/PixelIcon';
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
    {
      name: 'Node children',
      render: () => (
        <div className="flex flex-col items-start gap-4">
          <Ribbon color="blue" icon={<PixelIcon name="gold" size="sm" />}>
            Blue with icon
          </Ribbon>
          <Ribbon color="red" icon={<PixelIcon name="attack" size="sm" />}>
            Red with icon
          </Ribbon>
          <Ribbon color="yellow" icon={<PixelIcon name="food" size="sm" />}>
            Yellow with icon
          </Ribbon>
        </div>
      ),
    },
    {
      name: 'Node children long text',
      render: () => (
        <div className="w-60 max-w-full">
          <Ribbon color="blue" icon={<PixelIcon name="wood" size="sm" />}>
            {LONG_TEXT}
          </Ribbon>
        </div>
      ),
    },
  ],
};
