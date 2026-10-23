import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from './sheet';

const PNG_FILE_NAME = /([^/]+\.png)/;

/** Sorted, de-duplicated sprite sheet file names drawn under `root` (the art layers, not the text). */
function getDrawnSheetFiles(root: HTMLElement): string[] {
  const images = Array.from(root.querySelectorAll<HTMLElement>('*'))
    .map((element) => element.style.backgroundImage)
    .filter((image) => image !== '');
  const files = images.map((image) => PNG_FILE_NAME.exec(image)?.[1] ?? image);
  return [...new Set(files)].sort();
}

type SheetSide = 'right' | 'left' | 'top' | 'bottom';

function SheetWithTitle({
  side,
  className,
  onOpenChange,
}: {
  side?: SheetSide;
  className?: string;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        onOpenChange?.(next);
      }}
    >
      <SheetContent side={side} className={className}>
        <SheetTitle>Event Log</SheetTitle>
        <SheetDescription>Last 20 events.</SheetDescription>
        <p>Ada gained 5 Gold</p>
      </SheetContent>
    </Sheet>
  );
}

describe('Sheet', () => {
  it('renders role="dialog" named by the title heading and described by the description', () => {
    render(<SheetWithTitle />);

    const dialog = screen.getByRole('dialog', { name: 'Event Log' });
    const heading = screen.getByRole('heading', { level: 2, name: 'Event Log' });
    expect(document.getElementById(dialog.getAttribute('aria-labelledby') ?? '')).toBe(heading);
    expect(document.getElementById(dialog.getAttribute('aria-describedby') ?? '')).toHaveTextContent(
      'Last 20 events.',
    );
  });

  it.each<SheetSide>(['right', 'left', 'top', 'bottom'])(
    'renders the %s side open with data-state="open" and the children inside it',
    (side) => {
      render(<SheetWithTitle side={side} />);

      const dialog = screen.getByRole('dialog', { name: 'Event Log' });
      expect(dialog).toHaveAttribute('data-state', 'open');
      expect(within(dialog).getByText('Ada gained 5 Gold')).toBeInTheDocument();
    },
  );

  it('defaults to the right side when no side is given', () => {
    render(<SheetWithTitle />);

    expect(screen.getByRole('dialog', { name: 'Event Log' })).toHaveAttribute('data-state', 'open');
  });

  it.each<SheetSide>(['right', 'left', 'top', 'bottom'])('draws the special paper frame on the %s side', (side) => {
    render(<SheetWithTitle side={side} />);

    expect(getDrawnSheetFiles(screen.getByRole('dialog'))).toContain('SpecialPaper.png');
  });

  it('has a Close button that calls onOpenChange(false) and removes the sheet', () => {
    const onOpenChange = jest.fn();
    render(<SheetWithTitle onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes on Escape', () => {
    const onOpenChange = jest.fn();
    render(<SheetWithTitle onOpenChange={onOpenChange} />);

    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Event Log' }), { key: 'Escape' });

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders nothing while closed', () => {
    render(
      <Sheet open={false} onOpenChange={jest.fn()}>
        <SheetContent>
          <SheetTitle>Event Log</SheetTitle>
          <SheetDescription>Last 20 events.</SheetDescription>
        </SheetContent>
      </Sheet>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // Class-only: jsdom has no layout, so the caller's height and padding can only be checked on the
  // class string. Both assertions are the merge result, not the geometry.
  it('keeps the caller className on the shell', () => {
    render(<SheetWithTitle className="h-[75vh] max-h-[85vh] flex flex-col p-0" />);

    expect(screen.getByRole('dialog')).toHaveClass('h-[75vh]', 'max-h-[85vh]', 'flex', 'flex-col', 'p-0');
  });
});
