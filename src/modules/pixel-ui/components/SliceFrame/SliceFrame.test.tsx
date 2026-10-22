import { render, screen, within } from '@testing-library/react';
import { assetUrl } from '../../asset-url';
import type { NineSliceSheet, ThreeSliceSheet } from '../../pixel-ui.types';
import { NineSlice, ThreeSlice } from './SliceFrame';

// Geometry mirrors WoodTable (9-slice) and Ribbon_Blue_3Slides (3-slice) from plan.md Contracts.
const NINE_SLICE_SHEET: NineSliceSheet = {
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

const THREE_SLICE_SHEET: ThreeSliceSheet = {
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

/** The aria-hidden art layer; its children are the slice cells. */
function getArtLayer(frame: HTMLElement): HTMLElement {
  const art = frame.querySelector<HTMLElement>('[aria-hidden="true"]');
  if (!art) throw new Error('art layer not found');
  return art;
}

describe('NineSlice', () => {
  it('renders nine cells in the art layer', () => {
    render(
      <NineSlice data-testid="frame" sheet={NINE_SLICE_SHEET}>
        <span>Body</span>
      </NineSlice>,
    );

    const art = getArtLayer(screen.getByTestId('frame'));

    expect(art.children).toHaveLength(9);
  });

  it('hides the art layer from assistive tech', () => {
    render(
      <NineSlice data-testid="frame" sheet={NINE_SLICE_SHEET}>
        <span>Body</span>
      </NineSlice>,
    );

    expect(getArtLayer(screen.getByTestId('frame'))).toHaveAttribute('aria-hidden', 'true');
  });

  it('keeps children visible and outside the art layer', () => {
    render(
      <NineSlice data-testid="frame" sheet={NINE_SLICE_SHEET}>
        <button type="button">Save</button>
      </NineSlice>,
    );

    const button = screen.getByRole('button', { name: 'Save' });

    expect(button).toBeVisible();
    expect(getArtLayer(screen.getByTestId('frame'))).not.toContainElement(button);
  });

  it('pads the content by the inset at scale 1', () => {
    render(
      <NineSlice data-testid="frame" sheet={NINE_SLICE_SHEET}>
        <span>Body</span>
      </NineSlice>,
    );

    const content = screen.getByText('Body').parentElement as HTMLElement;

    expect(content.style.paddingTop).toBe('16px');
    expect(content.style.paddingRight).toBe('12px');
    expect(content.style.paddingBottom).toBe('20px');
    expect(content.style.paddingLeft).toBe('8px');
  });

  it('doubles the content padding at scale 2', () => {
    render(
      <NineSlice data-testid="frame" sheet={NINE_SLICE_SHEET} scale={2}>
        <span>Body</span>
      </NineSlice>,
    );

    const content = screen.getByText('Body').parentElement as HTMLElement;

    expect(content.style.paddingTop).toBe('32px');
    expect(content.style.paddingRight).toBe('24px');
    expect(content.style.paddingBottom).toBe('40px');
    expect(content.style.paddingLeft).toBe('16px');
  });

  it('uses the grid minimum (corner tracks) when no minWidth or minHeight is given', () => {
    render(
      <NineSlice data-testid="frame" sheet={NINE_SLICE_SHEET}>
        <span>Body</span>
      </NineSlice>,
    );

    const frame = screen.getByTestId('frame');

    expect(frame.style.minWidth).toBe('168px');
    expect(frame.style.minHeight).toBe('188px');
    expect(frame.style.height).toBe('');
  });

  it('raises the minimum to minWidth and minHeight when they are larger', () => {
    render(
      <NineSlice data-testid="frame" sheet={NINE_SLICE_SHEET} minWidth={256} minHeight={256}>
        <span>Body</span>
      </NineSlice>,
    );

    const frame = screen.getByTestId('frame');

    expect(frame.style.minWidth).toBe('256px');
    expect(frame.style.minHeight).toBe('256px');
  });

  it('keeps the grid minimum when minWidth and minHeight are smaller', () => {
    render(
      <NineSlice data-testid="frame" sheet={NINE_SLICE_SHEET} minWidth={40} minHeight={40}>
        <span>Body</span>
      </NineSlice>,
    );

    const frame = screen.getByTestId('frame');

    expect(frame.style.minWidth).toBe('168px');
    expect(frame.style.minHeight).toBe('188px');
  });

  it('forwards className, data-testid and ARIA attributes to the root', () => {
    render(
      <NineSlice
        data-testid="frame"
        className="panel-marker"
        role="group"
        aria-label="Resources"
        sheet={NINE_SLICE_SHEET}
      >
        <span>Body</span>
      </NineSlice>,
    );

    const frame = screen.getByTestId('frame');

    expect(frame).toHaveClass('panel-marker');
    expect(within(frame).getByText('Body')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Resources' })).toBe(frame);
  });

  it('applies contentClassName to the inset content wrapper, not the root', () => {
    render(
      <NineSlice data-testid="frame" sheet={NINE_SLICE_SHEET} contentClassName="content-marker">
        <span>Body</span>
      </NineSlice>,
    );

    const content = screen.getByText('Body').parentElement as HTMLElement;

    expect(content).toHaveClass('content-marker');
    expect(screen.getByTestId('frame')).not.toHaveClass('content-marker');
  });
});

describe('ThreeSlice', () => {
  it('renders three cells in the art layer', () => {
    render(
      <ThreeSlice data-testid="ribbon" sheet={THREE_SLICE_SHEET}>
        <span>Turn 3</span>
      </ThreeSlice>,
    );

    const art = getArtLayer(screen.getByTestId('ribbon'));

    expect(art.children).toHaveLength(3);
  });

  it('hides the art layer from assistive tech and keeps children visible', () => {
    render(
      <ThreeSlice data-testid="ribbon" sheet={THREE_SLICE_SHEET}>
        <span>Turn 3</span>
      </ThreeSlice>,
    );

    const frame = screen.getByTestId('ribbon');

    expect(getArtLayer(frame)).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('Turn 3')).toBeVisible();
    expect(getArtLayer(frame)).not.toContainElement(screen.getByText('Turn 3'));
  });

  it('fixes the height to the row size at scale 1 and doubles it at scale 2', () => {
    const { rerender } = render(
      <ThreeSlice data-testid="ribbon" sheet={THREE_SLICE_SHEET}>
        <span>Turn 3</span>
      </ThreeSlice>,
    );

    expect(screen.getByTestId('ribbon').style.height).toBe('61px');

    rerender(
      <ThreeSlice data-testid="ribbon" sheet={THREE_SLICE_SHEET} scale={2}>
        <span>Turn 3</span>
      </ThreeSlice>,
    );

    expect(screen.getByTestId('ribbon').style.height).toBe('122px');
  });

  it('pads the content by the left and right inset at scale 1', () => {
    render(
      <ThreeSlice data-testid="ribbon" sheet={THREE_SLICE_SHEET}>
        <span>Turn 3</span>
      </ThreeSlice>,
    );

    const content = screen.getByText('Turn 3').parentElement as HTMLElement;

    expect(content.style.paddingTop).toBe('0px');
    expect(content.style.paddingRight).toBe('10px');
    expect(content.style.paddingBottom).toBe('0px');
    expect(content.style.paddingLeft).toBe('10px');
  });

  it('forwards className and data-testid to the root', () => {
    render(
      <ThreeSlice data-testid="ribbon" className="ribbon-marker" sheet={THREE_SLICE_SHEET}>
        <span>Turn 3</span>
      </ThreeSlice>,
    );

    expect(screen.getByTestId('ribbon')).toHaveClass('ribbon-marker');
  });
});
