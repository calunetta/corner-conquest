import type { ComponentPreview } from '@/testbed';
import { PixelBar } from './PixelBar';
import type { PixelBarSize } from './PixelBar.types';

const SIZES: PixelBarSize[] = ['big', 'small'];
const MAX = 10;
const LEVELS = [
  { percent: 0, value: 0 },
  { percent: 50, value: 5 },
  { percent: 100, value: 10 },
];

function BarRow({ size, value, withLabel }: { size: PixelBarSize; value: number; withLabel: boolean }) {
  return (
    <PixelBar
      size={size}
      value={value}
      max={MAX}
      label={withLabel ? `${value}/${MAX}` : undefined}
      aria-label="Preview bar"
    />
  );
}

function BarSet({ size, withLabel }: { size: PixelBarSize; withLabel: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      {LEVELS.map(({ percent, value }) => (
        <div key={percent} className="flex items-center gap-3">
          <span className="w-12 text-sm text-muted-foreground">{percent}%</span>
          <BarRow size={size} value={value} withLabel={withLabel} />
        </div>
      ))}
    </div>
  );
}

export const pixelBarPreview: ComponentPreview = {
  slug: 'pixel-ui-bar',
  title: 'Pixel bar',
  group: 'Pixel UI',
  states: SIZES.flatMap((size) => [
    { name: `${size} with label`, render: () => <BarSet size={size} withLabel /> },
    { name: `${size} without label`, render: () => <BarSet size={size} withLabel={false} /> },
  ]),
};
