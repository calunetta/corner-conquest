import { render, screen, within } from '@testing-library/react';
import { PixelPanel } from './PixelPanel';
import type { PanelVariant } from './PixelPanel.types';

const VARIANTS: PanelVariant[] = ['wood', 'banner', 'paper', 'special', 'carved'];

/**
 * The padding wrapper is the direct parent of the body paragraph. jsdom does not load
 * Tailwind CSS, so padding pixels are checked in ui-verify; here we check which wrapper
 * the content gets and whether the wrapper changes with the props.
 */
function getPaddingWrapper(text: string): HTMLElement {
  const wrapper = screen.getByText(text).parentElement;
  if (!wrapper) throw new Error(`no wrapper around "${text}"`);
  return wrapper;
}

function getArtCells(container: HTMLElement): HTMLElement[] {
  const art = container.querySelector<HTMLElement>('[aria-hidden="true"]');
  if (!art) throw new Error('art layer not found');
  return Array.from(art.children) as HTMLElement[];
}

describe('PixelPanel', () => {
  it.each(VARIANTS)('renders the children of the %s variant', (variant) => {
    render(
      <PixelPanel data-testid="panel" variant={variant}>
        <p>Body {variant}</p>
      </PixelPanel>,
    );

    expect(within(screen.getByTestId('panel')).getByText(`Body ${variant}`)).toBeVisible();
  });

  it('renders no heading when there is no title', () => {
    render(
      <PixelPanel>
        <p>Body</p>
      </PixelPanel>,
    );

    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('renders no heading when the title is an empty string', () => {
    render(
      <PixelPanel title="">
        <p>Body</p>
      </PixelPanel>,
    );

    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('renders the title as a level 2 heading by default', () => {
    render(
      <PixelPanel title="Event Log">
        <p>Mia moved to (3,2)</p>
      </PixelPanel>,
    );

    expect(screen.getByRole('heading', { level: 2, name: 'Event Log' })).toBeInTheDocument();
  });

  it('renders the title as a level 3 heading when titleAs is h3', () => {
    render(
      <PixelPanel title="Event Log" titleAs="h3">
        <p>Mia moved to (3,2)</p>
      </PixelPanel>,
    );

    expect(screen.getByRole('heading', { level: 3, name: 'Event Log' })).toBeInTheDocument();
  });

  it('keeps the body text separate from the title heading', () => {
    render(
      <PixelPanel title="Event Log">
        <p>Mia moved to (3,2)</p>
      </PixelPanel>,
    );

    expect(screen.getByRole('heading', { name: 'Event Log' })).not.toContainElement(
      screen.getByText('Mia moved to (3,2)'),
    );
  });

  it('draws the title ribbon in red when titleColor is red', () => {
    const { container } = render(
      <PixelPanel title="Enemy turn" titleColor="red">
        <p>Body</p>
      </PixelPanel>,
    );

    const redRibbonCells = getArtCells(container).filter((cell) =>
      cell.style.backgroundImage.includes('Ribbon_Red_3Slides.png'),
    );

    expect(redRibbonCells).toHaveLength(3);
  });

  it('draws the title ribbon in blue by default', () => {
    const { container } = render(
      <PixelPanel title="Event Log">
        <p>Body</p>
      </PixelPanel>,
    );

    const hasBlueRibbon = Array.from(container.querySelectorAll<HTMLElement>('[aria-hidden="true"]')).some((art) =>
      Array.from(art.children).some((cell) => (cell as HTMLElement).style.backgroundImage.includes('Ribbon_Blue')),
    );

    expect(hasBlueRibbon).toBe(true);
  });

  it('gives sm and md padding different wrappers around the content', () => {
    render(
      <>
        <PixelPanel padding="sm">
          <p>Small</p>
        </PixelPanel>
        <PixelPanel padding="md">
          <p>Medium</p>
        </PixelPanel>
      </>,
    );

    expect(getPaddingWrapper('Small').className).not.toBe(getPaddingWrapper('Medium').className);
  });

  it('uses md padding by default', () => {
    render(
      <>
        <PixelPanel>
          <p>Default</p>
        </PixelPanel>
        <PixelPanel padding="md">
          <p>Explicit</p>
        </PixelPanel>
      </>,
    );

    expect(getPaddingWrapper('Default').className).toBe(getPaddingWrapper('Explicit').className);
  });

  it('adds extra top padding to the content when titled', () => {
    render(
      <>
        <PixelPanel title="Event Log">
          <p>Titled</p>
        </PixelPanel>
        <PixelPanel>
          <p>Untitled</p>
        </PixelPanel>
      </>,
    );

    expect(getPaddingWrapper('Titled').className).not.toBe(getPaddingWrapper('Untitled').className);
  });

  it('gives a titled panel the same padding wrapper as an untitled one when the title is empty', () => {
    render(
      <>
        <PixelPanel title="">
          <p>Empty title</p>
        </PixelPanel>
        <PixelPanel>
          <p>No title</p>
        </PixelPanel>
      </>,
    );

    expect(getPaddingWrapper('Empty title').className).toBe(getPaddingWrapper('No title').className);
  });

  it.each([
    ['wood', 256, 256],
    ['banner', 256, 256],
    ['paper', 128, 128],
    ['special', 128, 128],
    // Spec min is now 126x126, the art-driven floor for the carved corners at 1x.
    ['carved', 126, 126],
  ] as const)('renders the %s frame at no less than its minimum size', (variant, width, height) => {
    render(<PixelPanel data-testid="panel" variant={variant} />);

    expect(screen.getByTestId('panel')).toHaveStyle({
      minWidth: `${width}px`,
      minHeight: `${height}px`,
    });
  });

  it('passes className and data-testid to the frame', () => {
    render(
      <PixelPanel data-testid="panel" className="test-extra-class">
        <p>Body</p>
      </PixelPanel>,
    );

    expect(screen.getByTestId('panel')).toHaveClass('test-extra-class');
  });
});
