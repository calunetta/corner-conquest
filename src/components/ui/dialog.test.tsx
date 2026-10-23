import { useState, type ReactNode } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Button } from './button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from './dialog';

const PNG_FILE_NAME = /([^/]+\.png)/;

/** Sorted, de-duplicated sprite sheet file names drawn under `root` (the art layers, not the text). */
function getDrawnSheetFiles(root: HTMLElement): string[] {
  const images = Array.from(root.querySelectorAll<HTMLElement>('*'))
    .map((element) => element.style.backgroundImage)
    .filter((image) => image !== '');
  const files = images.map((image) => PNG_FILE_NAME.exec(image)?.[1] ?? image);
  return [...new Set(files)].sort();
}

/** The element whose id is held by `attribute` on `element` (Radix wires the title and description this way). */
function getReferencedElement(element: HTMLElement, attribute: 'aria-labelledby' | 'aria-describedby') {
  return document.getElementById(element.getAttribute(attribute) ?? '');
}

/** Opens and closes like the player does: the Close control or Escape updates the parent state. */
function StatefulDialog({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
  const [open, setOpen] = useState(true);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        onOpenChange?.(next);
      }}
    >
      <DialogContent>
        <DialogTitle>Move army</DialogTitle>
        <DialogDescription>Choose how many units to send.</DialogDescription>
        <p>Units ready: 4</p>
      </DialogContent>
    </Dialog>
  );
}

function TriggeredDialog({ trigger }: { trigger: ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogTitle>Move army</DialogTitle>
        <DialogDescription>Choose how many units to send.</DialogDescription>
      </DialogContent>
    </Dialog>
  );
}

describe('Dialog', () => {
  it('renders role="dialog" named by the title heading and described by the description', () => {
    render(<StatefulDialog />);

    const dialog = screen.getByRole('dialog', { name: 'Move army' });
    const heading = screen.getByRole('heading', { level: 2, name: 'Move army' });
    expect(getReferencedElement(dialog, 'aria-labelledby')).toBe(heading);
    expect(getReferencedElement(dialog, 'aria-describedby')).toHaveTextContent('Choose how many units to send.');
  });

  it('draws the blue ribbon by default and the red ribbon for ribbon="red"', () => {
    const { unmount } = render(<StatefulDialog />);
    expect(getDrawnSheetFiles(screen.getByRole('dialog'))).toContain('Ribbon_Blue_3Slides.png');
    unmount();

    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle ribbon="red">Leave match</DialogTitle>
          <DialogDescription>Your army stays on the map.</DialogDescription>
        </DialogContent>
      </Dialog>,
    );
    const files = getDrawnSheetFiles(screen.getByRole('dialog'));
    expect(files).toContain('Ribbon_Red_3Slides.png');
    expect(files).not.toContain('Ribbon_Blue_3Slides.png');
  });

  it('renders the title icon in the ribbon, outside the heading, without changing the accessible name', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle icon={<span data-testid="ribbon-icon" />}>Move army</DialogTitle>
          <DialogDescription>Choose how many units to send.</DialogDescription>
        </DialogContent>
      </Dialog>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Move army' });
    const icon = within(dialog).getByTestId('ribbon-icon');
    expect(screen.getByRole('heading', { level: 2, name: 'Move army' })).not.toContainElement(icon);
  });

  it('keeps a title with element children, and puts a string title in the title attribute only', () => {
    const { unmount } = render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>
            <span>Move</span> army
          </DialogTitle>
          <DialogDescription>Choose how many units to send.</DialogDescription>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Move army' })).not.toHaveAttribute('title');
    unmount();

    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Move army</DialogTitle>
          <DialogDescription>Choose how many units to send.</DialogDescription>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Move army' })).toHaveAttribute('title', 'Move army');
  });

  it('has a Close button that calls onOpenChange(false) and removes the dialog', () => {
    const onOpenChange = jest.fn();
    render(<StatefulDialog onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes on Escape', () => {
    const onOpenChange = jest.fn();
    render(<StatefulDialog onOpenChange={onOpenChange} />);

    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Move army' }), { key: 'Escape' });

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('draws the special paper frame by default', () => {
    render(<StatefulDialog />);

    const files = getDrawnSheetFiles(screen.getByRole('dialog'));
    expect(files).toContain('SpecialPaper.png');
    expect(files).not.toContain('RegularPaper.png');
  });

  it('draws the regular paper frame for frame="paper"', () => {
    render(
      <Dialog open>
        <DialogContent frame="paper">
          <DialogTitle>Move army</DialogTitle>
          <DialogDescription>Choose how many units to send.</DialogDescription>
        </DialogContent>
      </Dialog>,
    );

    const files = getDrawnSheetFiles(screen.getByRole('dialog'));
    expect(files).toContain('RegularPaper.png');
    expect(files).not.toContain('SpecialPaper.png');
  });

  it('renders the children inside the dialog', () => {
    render(<StatefulDialog />);

    expect(within(screen.getByRole('dialog')).getByText('Units ready: 4')).toBeInTheDocument();
  });

  // Class-only: jsdom applies no cascade, so the shell's override can only be checked on the class
  // string. The assertions are the merge result: the caller's glass classes are dropped, max-w-md wins.
  it('lets the caller className override max width but not the transparent shell', () => {
    render(
      <Dialog open>
        <DialogContent className="bg-background/90 backdrop-blur-2xl border border-white/15 max-w-md">
          <DialogTitle>Move army</DialogTitle>
          <DialogDescription>Choose how many units to send.</DialogDescription>
        </DialogContent>
      </Dialog>,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveClass('max-w-md', 'bg-transparent', 'border-0', 'shadow-none');
    expect(dialog).not.toHaveClass('bg-background/90', 'backdrop-blur-2xl', 'max-w-lg');
  });

  it.each([
    ['small', 'Open small', <Button key="small" size="sm">Open small</Button>],
    ['sprite', 'Open dialog', <Button key="sprite">Open dialog</Button>],
  ])('returns focus to the %s trigger after the Close button closes it', async (_label, name, trigger) => {
    render(<TriggeredDialog trigger={trigger} />);
    const triggerButton = screen.getByRole('button', { name });

    fireEvent.click(triggerButton);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    await waitFor(() => expect(triggerButton).toHaveFocus());
  });
});

describe('AlertDialog', () => {
  function ConfirmLeave({
    actionVariant,
    onAction,
    onEscapeKeyDown,
    onOpenChange,
  }: {
    actionVariant?: 'default' | 'destructive';
    onAction?: () => void;
    onEscapeKeyDown?: (event: KeyboardEvent) => void;
    onOpenChange?: (open: boolean) => void;
  }) {
    return (
      <AlertDialog open onOpenChange={onOpenChange}>
        <AlertDialogContent onEscapeKeyDown={onEscapeKeyDown}>
          <AlertDialogTitle>Leave match?</AlertDialogTitle>
          <AlertDialogDescription>Your army stays on the map.</AlertDialogDescription>
          <AlertDialogCancel>Stay</AlertDialogCancel>
          <AlertDialogAction variant={actionVariant} onClick={onAction}>
            Leave
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  it('renders role="alertdialog" named by the title and described by the description', () => {
    render(<ConfirmLeave />);

    const dialog = screen.getByRole('alertdialog', { name: 'Leave match?' });
    expect(getReferencedElement(dialog, 'aria-labelledby')).toBe(
      screen.getByRole('heading', { level: 2, name: 'Leave match?' }),
    );
    expect(getReferencedElement(dialog, 'aria-describedby')).toHaveTextContent('Your army stays on the map.');
  });

  it('has no Close button', () => {
    render(<ConfirmLeave />);

    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
  });

  it('draws the blue sprite for the default action and the red sprite for variant="destructive"', () => {
    const { unmount } = render(<ConfirmLeave />);
    const defaultFiles = getDrawnSheetFiles(screen.getByRole('alertdialog'));
    expect(defaultFiles).toContain('Button_Blue_3Slides.png');
    expect(defaultFiles).not.toContain('Button_Red_3Slides.png');
    unmount();

    render(<ConfirmLeave actionVariant="destructive" />);
    const destructiveFiles = getDrawnSheetFiles(screen.getByRole('alertdialog'));
    expect(destructiveFiles).toContain('Button_Red_3Slides.png');
    expect(destructiveFiles).not.toContain('Button_Blue_3Slides.png');
  });

  it('renders the Cancel and Action controls as buttons with the neutral Cancel art', () => {
    render(<ConfirmLeave />);

    const cancel = screen.getByRole('button', { name: 'Stay' });
    const action = screen.getByRole('button', { name: 'Leave' });
    expect(cancel).toBeInTheDocument();
    expect(action).toBeInTheDocument();
    const cancelFiles = getDrawnSheetFiles(cancel);
    expect(cancelFiles).toContain('Button_Hover_3Slides.png');
    expect(cancelFiles).not.toContain('Button_Blue_3Slides.png');
    expect(cancelFiles).not.toContain('Button_Red_3Slides.png');
  });

  it('calls the Action onClick and closes the dialog', () => {
    const onAction = jest.fn();
    const onOpenChange = jest.fn();
    render(<ConfirmLeave onAction={onAction} onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Leave' }));

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('closes the dialog when Cancel is clicked', () => {
    const onOpenChange = jest.fn();
    render(<ConfirmLeave onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Stay' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('moves focus to Cancel on open', async () => {
    render(<ConfirmLeave />);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Stay' })).toHaveFocus());
  });

  it('calls onOpenChange(false) on Escape when the caller does not prevent it', () => {
    const onOpenChange = jest.fn();
    render(<ConfirmLeave onOpenChange={onOpenChange} />);

    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('calls the caller onEscapeKeyDown and stays open when the caller prevents default', () => {
    const onEscapeKeyDown = jest.fn((event: KeyboardEvent) => event.preventDefault());
    const onOpenChange = jest.fn();
    render(<ConfirmLeave onEscapeKeyDown={onEscapeKeyDown} onOpenChange={onOpenChange} />);

    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });

    expect(onEscapeKeyDown).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });
});
