import type { ComponentPreview } from '@/testbed';
import { PixelIcon } from './PixelIcon';
import type {
  PixelIconColorName,
  PixelIconGreyName,
  PixelIconSize,
  PixelIconState,
} from './PixelIcon.types';

const COLOUR_NAMES: PixelIconColorName[] = [
  'hammer', 'wood', 'gold', 'food', 'attack', 'close', 'settings', 'info', 'music',
];
const GREY_NAMES: PixelIconGreyName[] = [
  'grey-close', 'grey-settings', 'grey-sound', 'grey-one', 'grey-two',
  'grey-three', 'grey-cart', 'grey-plus', 'grey-minus', 'grey-unlock',
];
const SIZES: { label: string; size: PixelIconSize }[] = [
  { label: '32 px', size: 'sm' },
  { label: '64 px', size: 'lg' },
];
const STATES: PixelIconState[] = ['regular', 'pressed', 'disabled'];

function IconGrid({ names, size, state }: { names: string[]; size: PixelIconSize; state?: PixelIconState }) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      {names.map((name) => (
        <div key={name} className="flex flex-col items-center gap-1">
          <PixelIcon name={name as never} size={size} state={state} label={name} />
          <span className="text-xs text-muted-foreground">{name}</span>
        </div>
      ))}
    </div>
  );
}

export const pixelIconPreview: ComponentPreview = {
  slug: 'pixel-ui-icon',
  title: 'Pixel icon',
  group: 'Pixel UI',
  states: [
    ...SIZES.map(({ label, size }) => ({
      name: `Colour ${label}`,
      render: () => <IconGrid names={COLOUR_NAMES} size={size} />,
    })),
    ...STATES.flatMap((state) =>
      SIZES.map(({ label, size }) => ({
        name: `Grey ${state} ${label}`,
        render: () => <IconGrid names={GREY_NAMES} size={size} state={state} />,
      })),
    ),
  ],
};
