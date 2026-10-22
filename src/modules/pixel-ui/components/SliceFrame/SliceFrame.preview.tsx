import type { ComponentPreview } from '@/testbed';
import { assetUrl } from '../../asset-url';
import type { NineSliceSheet, ThreeSliceSheet } from '../../pixel-ui.types';
import { NineSlice, ThreeSlice } from './SliceFrame';

// Same geometry as SliceFrame.test.tsx: WoodTable (9-slice) and Ribbon_Blue_3Slides (3-slice).
const WOOD_TABLE: NineSliceSheet = {
  url: assetUrl('UI Elements/UI Elements/Wood Table/WoodTable.png'),
  width: 448,
  height: 448,
  inset: { top: 16, right: 12, bottom: 20, left: 8 },
  cols: [
    { start: 44, size: 84 },
    { start: 192, size: 64 },
    { start: 320, size: 84 },
  ],
  rows: [
    { start: 43, size: 85 },
    { start: 192, size: 64 },
    { start: 320, size: 103 },
  ],
};

const BLUE_RIBBON: ThreeSliceSheet = {
  url: assetUrl('UI/Ribbons/Ribbon_Blue_3Slides.png'),
  width: 192,
  height: 64,
  inset: { top: 0, right: 10, bottom: 0, left: 10 },
  cols: [
    { start: 3, size: 61 },
    { start: 64, size: 64 },
    { start: 128, size: 61 },
  ],
  rows: [{ start: 0, size: 61 }],
};

function Table({ width, height }: { width: number; height: number }) {
  return (
    <div className="max-w-full" style={{ width }}>
      <NineSlice sheet={WOOD_TABLE} style={{ width: '100%', height }}>
        <span className="text-sm text-card-foreground">
          {width} x {height}
        </span>
      </NineSlice>
    </div>
  );
}

function Ribbon({ width }: { width: number }) {
  return (
    <div className="max-w-full" style={{ width }}>
      <ThreeSlice sheet={BLUE_RIBBON} style={{ width: '100%' }} contentClassName="flex items-center justify-center">
        <span className="text-sm text-white">Width {width}</span>
      </ThreeSlice>
    </div>
  );
}

export const sliceFramePreview: ComponentPreview = {
  slug: 'slice-frame',
  title: 'Slice frame',
  group: 'Pixel UI',
  states: [
    { name: 'NineSlice small', render: () => <Table width={256} height={256} /> },
    { name: 'NineSlice medium', render: () => <Table width={480} height={320} /> },
    { name: 'NineSlice large', render: () => <Table width={720} height={400} /> },
    { name: 'ThreeSlice ribbon width 192', render: () => <Ribbon width={192} /> },
    { name: 'ThreeSlice ribbon width 320', render: () => <Ribbon width={320} /> },
  ],
};
