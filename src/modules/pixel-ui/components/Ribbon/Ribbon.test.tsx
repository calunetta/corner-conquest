import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { Ribbon } from './Ribbon';

/** Cells of the aria-hidden art layer; each cell carries one slice's background-image. */
function getArtCells(container: HTMLElement): HTMLElement[] {
  const art = container.querySelector<HTMLElement>('[aria-hidden="true"]');
  if (!art) throw new Error('art layer not found');
  return Array.from(art.children) as HTMLElement[];
}

describe('Ribbon', () => {
  it('renders the text', () => {
    render(<Ribbon>Turn 14 - Your move</Ribbon>);

    expect(screen.getByText('Turn 14 - Your move')).toBeInTheDocument();
  });

  it('sets the full text as the title attribute of the text element', () => {
    render(<Ribbon>Turn 14 - Your move</Ribbon>);

    expect(screen.getByText('Turn 14 - Your move')).toHaveAttribute('title', 'Turn 14 - Your move');
  });

  it('keeps a line longer than the ribbon whole in the title attribute', () => {
    const longLine = 'Mia moved the monster from the northern forest to the southern coast before dawn';
    render(<Ribbon>{longLine}</Ribbon>);

    expect(screen.getByText(longLine)).toHaveAttribute('title', longLine);
  });

  it('renders no heading by default', () => {
    render(<Ribbon>Turn 14</Ribbon>);

    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it.each([
    ['h2', 2],
    ['h3', 3],
  ] as const)('renders the text as a heading when as is %s', (as, level) => {
    render(<Ribbon as={as}>Event Log</Ribbon>);

    expect(screen.getByRole('heading', { level, name: 'Event Log' })).toBeInTheDocument();
  });

  it('puts the heading on the text only, so the title attribute stays on the heading', () => {
    render(<Ribbon as="h2">Event Log</Ribbon>);

    expect(screen.getByRole('heading', { level: 2 })).toHaveAttribute('title', 'Event Log');
  });

  it('renders the icon directly before the text', () => {
    render(<Ribbon icon={<span>12</span>}>Gold</Ribbon>);

    const icon = screen.getByText('12');

    expect(screen.getByText('Gold').previousElementSibling).toBe(icon);
  });

  it('draws the blue art by default', () => {
    const { container } = render(<Ribbon>Turn 14</Ribbon>);

    const cells = getArtCells(container);

    expect(cells.every((cell) => cell.style.backgroundImage.includes('Ribbon_Blue_3Slides.png'))).toBe(true);
  });

  it.each([
    ['blue', 'Ribbon_Blue_3Slides.png'],
    ['red', 'Ribbon_Red_3Slides.png'],
    ['yellow', 'Ribbon_Yellow_3Slides.png'],
  ] as const)('draws the %s art when color is %s', (color, file) => {
    const { container } = render(<Ribbon color={color}>Turn 14</Ribbon>);

    const cells = getArtCells(container);

    expect(cells).toHaveLength(3);
    expect(cells.every((cell) => cell.style.backgroundImage.includes(file))).toBe(true);
  });

  it('passes className to the outer frame', () => {
    const { container } = render(<Ribbon className="test-extra-class">Turn 14</Ribbon>);

    expect(container.firstChild).toHaveClass('test-extra-class');
  });

  it('renders ReactNode children as the text, after the icon', () => {
    render(
      <Ribbon icon={<span>12</span>}>
        <strong>Gold</strong>
      </Ribbon>,
    );

    const textElement = screen.getByText('Gold').parentElement;

    expect(screen.getByText('12').nextElementSibling).toBe(textElement);
  });

  it('sets no title attribute when children is not a string', () => {
    render(
      <Ribbon>
        <strong>Gold</strong>
      </Ribbon>,
    );

    expect(screen.getByText('Gold').parentElement).not.toHaveAttribute('title');
  });

  it('sets the explicit title when children is not a string', () => {
    render(
      <Ribbon title="Gold income">
        <strong>Gold</strong>
      </Ribbon>,
    );

    expect(screen.getByText('Gold').parentElement).toHaveAttribute('title', 'Gold income');
  });

  it('uses the explicit title over the string children', () => {
    render(<Ribbon title="Turn fourteen">Turn 14</Ribbon>);

    expect(screen.getByText('Turn 14')).toHaveAttribute('title', 'Turn fourteen');
  });

  it('forwards the ref to the text element', () => {
    const ref = createRef<HTMLHeadingElement>();
    render(<Ribbon ref={ref}>Turn 14</Ribbon>);

    expect(ref.current).toBe(screen.getByText('Turn 14'));
  });

  it('forwards the ref to the heading when as is h2', () => {
    const ref = createRef<HTMLHeadingElement>();
    render(
      <Ribbon as="h2" ref={ref}>
        Event Log
      </Ribbon>,
    );

    expect(ref.current).toBe(screen.getByRole('heading', { level: 2, name: 'Event Log' }));
  });

  it('puts id, data-* and aria-* attributes on the text element, not the frame', () => {
    const { container } = render(
      <Ribbon id="turn-ribbon" data-testid="turn" aria-describedby="turn-hint">
        Turn 14
      </Ribbon>,
    );

    const textElement = screen.getByTestId('turn');

    expect(textElement).toBe(screen.getByText('Turn 14'));
    expect(textElement).toHaveAttribute('id', 'turn-ribbon');
    expect(textElement).toHaveAttribute('aria-describedby', 'turn-hint');
    expect(container.firstChild).not.toHaveAttribute('id');
    expect(container.firstChild).not.toHaveAttribute('data-testid');
  });

  it('renders the text as a level 2 heading that keeps the given id', () => {
    render(
      <Ribbon as="h2" id="event-log-title">
        Event Log
      </Ribbon>,
    );

    expect(screen.getByRole('heading', { level: 2, name: 'Event Log' })).toHaveAttribute('id', 'event-log-title');
  });
});
