import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { Toast, ToastAction, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from './toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';

beforeAll(() => {
  // Radix Popper (Tooltip and Popover positioning) measures with ResizeObserver, which jsdom does not provide.
  if (!window.ResizeObserver) {
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof window.ResizeObserver;
  }
  // jsdom has no PointerEvent, so fireEvent would drop clientX/clientY. Radix's hover-exit polygon
  // reads them (undefined yields NaN and throws "unreachable"), so fall back to MouseEvent, which keeps them.
  if (!window.PointerEvent) {
    window.PointerEvent = MouseEvent as unknown as typeof PointerEvent;
  }
});

/** Radix Tooltip opens on pointer move; `delayDuration={0}` keeps hover assertions free of timers. */
function renderTooltip(trigger: ReactNode) {
  return render(
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent>End turn</TooltipContent>
      </Tooltip>
    </TooltipProvider>,
  );
}

describe('Tooltip', () => {
  describe('sprite Button trigger', () => {
    it('shows the content on keyboard focus and hides it on blur', async () => {
      renderTooltip(<Button>Actions</Button>);
      const trigger = screen.getByRole('button', { name: 'Actions' });

      fireEvent.focus(trigger);

      expect(await screen.findByRole('tooltip')).toHaveTextContent('End turn');

      fireEvent.blur(trigger);

      await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
    });

    it('shows the content on pointer move and hides it once the pointer leaves', async () => {
      renderTooltip(<Button>Actions</Button>);
      const trigger = screen.getByRole('button', { name: 'Actions' });

      fireEvent.pointerMove(trigger, { clientX: 0, clientY: 0 });

      expect(await screen.findByRole('tooltip')).toHaveTextContent('End turn');

      fireEvent.pointerLeave(trigger, { clientX: 0, clientY: 0 });
      // Radix keeps a hover grace area open after leaving the trigger; it closes on the next
      // document pointer move that lands outside that area.
      fireEvent.pointerMove(document.body, { clientX: 500, clientY: 500 });

      await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
    });
  });

  describe('Button asChild trigger', () => {
    it('shows the content on keyboard focus and hides it on blur', async () => {
      renderTooltip(
        <Button asChild>
          <a href="#end-turn">Actions</a>
        </Button>,
      );
      const trigger = screen.getByRole('link', { name: 'Actions' });

      fireEvent.focus(trigger);

      expect(await screen.findByRole('tooltip')).toHaveTextContent('End turn');

      fireEvent.blur(trigger);

      await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
    });

    it('shows the content on pointer move and hides it once the pointer leaves', async () => {
      renderTooltip(
        <Button asChild>
          <a href="#end-turn">Actions</a>
        </Button>,
      );
      const trigger = screen.getByRole('link', { name: 'Actions' });

      fireEvent.pointerMove(trigger, { clientX: 0, clientY: 0 });

      expect(await screen.findByRole('tooltip')).toHaveTextContent('End turn');

      fireEvent.pointerLeave(trigger, { clientX: 0, clientY: 0 });
      // Radix keeps a hover grace area open after leaving the trigger; it closes on the next
      // document pointer move that lands outside that area.
      fireEvent.pointerMove(document.body, { clientX: 500, clientY: 500 });

      await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
    });
  });
});

describe('Popover', () => {
  function renderPopover(contentClassName?: string) {
    return render(
      <Popover>
        <PopoverTrigger asChild>
          <Button>Open game</Button>
        </PopoverTrigger>
        <PopoverContent className={contentClassName}>Players: 2 of 4</PopoverContent>
      </Popover>,
    );
  }

  it('is closed until the trigger is clicked', () => {
    renderPopover();

    expect(screen.queryByText('Players: 2 of 4')).not.toBeInTheDocument();
  });

  it('opens its content when the trigger is clicked', async () => {
    renderPopover();

    fireEvent.click(screen.getByRole('button', { name: 'Open game' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Players: 2 of 4')).toBeInTheDocument();
  });

  it('closes when Escape is pressed', async () => {
    renderPopover();
    fireEvent.click(screen.getByRole('button', { name: 'Open game' }));
    const dialog = await screen.findByRole('dialog');

    fireEvent.keyDown(dialog, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('applies the caller className to the content element', async () => {
    // Prop forwarding: the caller's marker class is the observable contract here, not styling.
    renderPopover('caller-width-marker');
    fireEvent.click(screen.getByRole('button', { name: 'Open game' }));

    expect(await screen.findByRole('dialog')).toHaveClass('caller-width-marker');
  });
});

describe('Tabs', () => {
  function renderTabs() {
    return render(
      <Tabs defaultValue="island">
        <TabsList>
          <TabsTrigger value="island">Island</TabsTrigger>
          <TabsTrigger value="players">Players</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
        </TabsList>
        <TabsContent value="island">Island settings body</TabsContent>
        <TabsContent value="players">Player seats body</TabsContent>
        <TabsContent value="rules">Rule toggles body</TabsContent>
      </Tabs>,
    );
  }

  it('exposes a tablist with tabs, one selected, and a labelled tabpanel', () => {
    renderTabs();

    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByRole('tab', { name: 'Island' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Players' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tabpanel', { name: 'Island' })).toHaveTextContent('Island settings body');
  });

  // Radix moves focus from arrow keys in a setTimeout (roving focus), so the focus assertions wait for it.
  it('moves focus and selection to the next tab on ArrowRight', async () => {
    renderTabs();
    const island = screen.getByRole('tab', { name: 'Island' });
    island.focus();

    fireEvent.keyDown(island, { key: 'ArrowRight' });

    const players = screen.getByRole('tab', { name: 'Players' });
    await waitFor(() => expect(players).toHaveFocus());
    expect(players).toHaveAttribute('aria-selected', 'true');
    expect(island).toHaveAttribute('aria-selected', 'false');
  });

  it('moves focus and selection back to the previous tab on ArrowLeft', async () => {
    renderTabs();
    const island = screen.getByRole('tab', { name: 'Island' });
    island.focus();
    fireEvent.keyDown(island, { key: 'ArrowRight' });
    const players = screen.getByRole('tab', { name: 'Players' });
    await waitFor(() => expect(players).toHaveFocus());

    fireEvent.keyDown(players, { key: 'ArrowLeft' });

    await waitFor(() => expect(island).toHaveFocus());
    expect(island).toHaveAttribute('aria-selected', 'true');
    expect(players).toHaveAttribute('aria-selected', 'false');
  });

  it('switches the visible tabpanel content when the selection moves', async () => {
    renderTabs();
    const island = screen.getByRole('tab', { name: 'Island' });
    island.focus();
    fireEvent.keyDown(island, { key: 'ArrowRight' });
    const players = screen.getByRole('tab', { name: 'Players' });
    await waitFor(() => expect(players).toHaveFocus());

    fireEvent.keyDown(players, { key: 'ArrowRight' });

    const rules = screen.getByRole('tab', { name: 'Rules' });
    await waitFor(() => expect(rules).toHaveAttribute('aria-selected', 'true'));
    expect(screen.getByRole('tabpanel', { name: 'Rules' })).toHaveTextContent('Rule toggles body');
    expect(screen.queryByText('Island settings body')).not.toBeInTheDocument();
  });

  it('selects a tab on mouse press', () => {
    renderTabs();

    // Radix activates tabs on mousedown (button 0), not click.
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Rules' }), { button: 0 });

    expect(screen.getByRole('tab', { name: 'Rules' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'Rules' })).toHaveTextContent('Rule toggles body');
  });
});

describe('Toast', () => {
  function renderToast(props: { variant?: 'default' | 'destructive'; onAction?: () => void; onOpenChange?: (open: boolean) => void } = {}) {
    return render(
      <ToastProvider>
        <Toast variant={props.variant} open onOpenChange={props.onOpenChange}>
          <div className="grid gap-1">
            <ToastTitle>Game saved</ToastTitle>
            <ToastDescription>Your island is stored.</ToastDescription>
          </div>
          <ToastAction altText="Undo the save" onClick={props.onAction}>
            Undo
          </ToastAction>
          <ToastClose />
        </Toast>
        <ToastViewport />
      </ToastProvider>,
    );
  }

  it('renders the title, the description and the action', () => {
    renderToast();

    expect(screen.getByText('Game saved')).toBeInTheDocument();
    expect(screen.getByText('Your island is stored.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
  });

  it('renders the default variant', () => {
    renderToast({ variant: 'default' });

    expect(screen.getByText('Game saved')).toBeInTheDocument();
  });

  it('renders the destructive variant', () => {
    renderToast({ variant: 'destructive' });

    // The destructive colour is class-only; the `destructive` group marker is the only hook that tells variants apart.
    expect(screen.getByText('Game saved').closest('.destructive')).not.toBeNull();
  });

  it('gives the close button an accessible name', () => {
    renderToast();

    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('runs the action onClick when the action is pressed', () => {
    const onAction = jest.fn();
    renderToast({ onAction });

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('asks to close when the close button is pressed', () => {
    const onOpenChange = jest.fn();
    renderToast({ onOpenChange });

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
