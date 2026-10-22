import type { ComponentPreview } from '@/testbed';
import { Button } from '@/components/ui/button';
import { PixelPanel } from './PixelPanel';
import type { PanelVariant } from './PixelPanel.types';

const VARIANTS: PanelVariant[] = ['wood', 'banner', 'paper', 'special', 'carved'];

function VariantPanel({ variant, title }: { variant: PanelVariant; title?: string }) {
  return (
    <PixelPanel variant={variant} title={title}>
      <p>{variant} panel</p>
    </PixelPanel>
  );
}

function FocusPanel({ variant }: { variant: PanelVariant }) {
  return (
    <PixelPanel variant={variant} title="Focus check">
      <Button size="sm">Focusable {variant}</Button>
    </PixelPanel>
  );
}

function SizedPanel({ width, height }: { width: number; height: number }) {
  return (
    <div className="max-w-full" style={{ width }}>
      <PixelPanel variant="paper" style={{ width: '100%', height }}>
        <p>
          {width} x {height}
        </p>
      </PixelPanel>
    </div>
  );
}

export const pixelPanelPreview: ComponentPreview = {
  slug: 'pixel-ui-panel',
  title: 'Pixel panel',
  group: 'Pixel UI',
  states: [
    ...VARIANTS.map((variant) => ({
      name: `Variant ${variant}`,
      render: () => <VariantPanel variant={variant} />,
    })),
    { name: 'Titled paper', render: () => <VariantPanel variant="paper" title="Titled panel" /> },
    { name: 'Titled wood', render: () => <VariantPanel variant="wood" title="Titled panel" /> },
    { name: 'Size small', render: () => <SizedPanel width={160} height={126} /> },
    { name: 'Size medium', render: () => <SizedPanel width={320} height={200} /> },
    { name: 'Size large', render: () => <SizedPanel width={640} height={320} /> },
    { name: 'Carved minimum 126x126', render: () => <SizedPanel width={126} height={126} /> },
    { name: 'Focus child on paper', render: () => <FocusPanel variant="paper" /> },
    { name: 'Focus child on wood', render: () => <FocusPanel variant="wood" /> },
  ],
};
