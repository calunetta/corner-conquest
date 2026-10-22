import { render, screen } from '@testing-library/react';
import { PixelBar } from './PixelBar';

/** The fill is the only element without a role; its width is the visible result of the fraction. */
function getFill(): HTMLElement {
  return screen.getByTestId('pixel-bar-fill');
}

/** Cells of the aria-hidden art layer; each cell carries one slice of the base sheet. */
function getArtCells(container: HTMLElement): HTMLElement[] {
  const art = container.querySelector<HTMLElement>('[aria-hidden="true"]');
  if (!art) throw new Error('art layer not found');
  return Array.from(art.children) as HTMLElement[];
}

describe('PixelBar', () => {
  it('exposes a progressbar named by aria-label', () => {
    render(<PixelBar value={7} max={10} aria-label="Gold" />);

    expect(screen.getByRole('progressbar', { name: 'Gold' })).toBeInTheDocument();
  });

  it('reports value, minimum and maximum through aria values', () => {
    render(<PixelBar value={7} max={10} aria-label="Gold" />);

    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '10');
    expect(bar).toHaveAttribute('aria-valuenow', '7');
  });

  it('clamps aria-valuenow to the maximum when value is above max', () => {
    render(<PixelBar value={15} max={10} aria-label="Gold" />);

    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '10');
    expect(bar).toHaveAttribute('aria-valuemax', '10');
  });

  it('reports zero for every aria value when max is zero', () => {
    render(<PixelBar value={5} max={0} aria-label="Gold" />);

    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '0');
    expect(bar).toHaveAttribute('aria-valuenow', '0');
  });

  it('fills 70% of the track for 7 of 10', () => {
    render(<PixelBar value={7} max={10} aria-label="Gold" />);

    expect(getFill()).toHaveStyle({ width: '70%' });
  });

  it('fills 0% for an empty bar', () => {
    render(<PixelBar value={0} max={10} aria-label="Gold" />);

    expect(getFill()).toHaveStyle({ width: '0%' });
  });

  it('fills 100% when value is at max', () => {
    render(<PixelBar value={10} max={10} aria-label="Gold" />);

    expect(getFill()).toHaveStyle({ width: '100%' });
  });

  it('fills 100% and no more when value is above max', () => {
    render(<PixelBar value={15} max={10} aria-label="Gold" />);

    expect(getFill()).toHaveStyle({ width: '100%' });
  });

  it('shows the label as visible text when one is given', () => {
    render(<PixelBar value={7} max={10} label="7/10" aria-label="Gold" />);

    expect(screen.getByText('7/10')).toBeVisible();
  });

  it('renders no text when no label is given', () => {
    render(<PixelBar value={7} max={10} aria-label="Gold" />);

    expect(screen.getByRole('progressbar').textContent).toBe('');
  });

  it('draws the big bar art by default', () => {
    const { container } = render(<PixelBar value={7} max={10} aria-label="Gold" />);

    const cells = getArtCells(container);
    expect(cells.some((cell) => cell.style.backgroundImage.includes('BigBar_Base.png'))).toBe(true);
  });

  it('draws the small bar art when size is small', () => {
    const { container } = render(<PixelBar value={7} max={10} size="small" aria-label="Gold" />);

    const cells = getArtCells(container);
    expect(cells.some((cell) => cell.style.backgroundImage.includes('SmallBar_Base.png'))).toBe(true);
  });

  it('keeps the decorative art layers out of the accessibility tree', () => {
    const { container } = render(<PixelBar value={7} max={10} aria-label="Gold" />);

    const hiddenLayers = container.querySelectorAll('[aria-hidden="true"]');
    expect(hiddenLayers.length).toBeGreaterThan(0);
    hiddenLayers.forEach((layer) => {
      expect(layer.textContent).toBe('');
    });
  });
});
