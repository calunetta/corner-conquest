import { act, fireEvent, render, screen } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  WithEventLogBoard,
  emptyEventLogGameState,
} from '@/modules/hud/components/ActionsPanel/MobileEventLogSheet.preview';
import { CardPlaySandbox } from './CardPlaySandbox';

const ANIMATION_MS = 1100;

function mockMatchMedia() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: jest.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })),
  });
}

function renderDesktop() {
  return render(<CardPlaySandbox variant="desktop" />);
}

function openCards() {
  fireEvent.click(screen.getByTestId('sandbox-open-cards'));
}

function useCard(name: string) {
  fireEvent.click(screen.getByRole('button', { name: `Use ${name}` }));
}

const status = () => screen.getByRole('status');

describe('CardPlaySandbox', () => {
  const originalMatchMedia = window.matchMedia;
  const originalResizeObserver = window.ResizeObserver;

  beforeEach(() => {
    jest.useFakeTimers();
    mockMatchMedia();
    window.ResizeObserver = jest.fn(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    })) as unknown as typeof window.ResizeObserver;
  });

  afterEach(() => {
    jest.useRealTimers();
    Object.defineProperty(window, 'matchMedia', { writable: true, configurable: true, value: originalMatchMedia });
    window.ResizeObserver = originalResizeObserver;
  });

  describe('desktop', () => {
    it('Extra Move announces the play after the Cards dialog closes, then clears', () => {
      renderDesktop();
      openCards();
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();

      useCard('Extra Move');

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(status()).toHaveTextContent('You played Extra Move.');
      act(() => {
        jest.advanceTimersByTime(ANIMATION_MS);
      });
      expect(status()).toBeEmptyDOMElement();
    });

    it('Sabotage plays nothing while blocked and when cancelled, and plays after a target is picked', () => {
      renderDesktop();
      openCards();
      useCard('Sabotage');

      expect(screen.getByText('Sabotage Opponent')).toBeInTheDocument();
      expect(status()).toBeEmptyDOMElement();
      expect(screen.getByTestId('sandbox-gate')).toHaveTextContent('blocked');

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByText('Sabotage Opponent')).not.toBeInTheDocument();
      expect(status()).toBeEmptyDOMElement();
      expect(screen.getByTestId('sandbox-gate')).toHaveTextContent('open');
      expect(screen.getByText('No log entries yet.')).toBeInTheDocument();

      openCards();
      useCard('Sabotage');
      fireEvent.click(screen.getByRole('button', { name: /Red/ }));

      expect(status()).toHaveTextContent('You played Sabotage.');
    });

    it('Teleport plays on selection and does not replay when the step is finished', () => {
      renderDesktop();
      openCards();
      useCard('Teleport');

      expect(screen.getByTestId('sandbox-finish-step')).toBeVisible();
      expect(status()).toHaveTextContent('You played Teleport.');

      act(() => {
        jest.advanceTimersByTime(ANIMATION_MS);
      });
      expect(status()).toBeEmptyDOMElement();

      fireEvent.click(screen.getByTestId('sandbox-finish-step'));
      expect(screen.queryByTestId('sandbox-finish-step')).not.toBeInTheDocument();
      expect(status()).toBeEmptyDOMElement();
    });

    it('Scout plays on selection and does not replay when the step is finished', () => {
      renderDesktop();
      openCards();
      useCard('Scout');

      expect(status()).toHaveTextContent('You played Scout.');
      act(() => {
        jest.advanceTimersByTime(ANIMATION_MS);
      });
      fireEvent.click(screen.getByTestId('sandbox-finish-step'));
      expect(status()).toBeEmptyDOMElement();
    });

    it.each(['Overcome', 'War Chief', 'Decide Dice Roll'])('combat card %s logs but never animates', (name) => {
      renderDesktop();
      fireEvent.click(screen.getByRole('button', { name: `Log ${name}` }));

      expect(screen.getByTestId('sandbox-log').children).toHaveLength(1);
      act(() => {
        jest.advanceTimersByTime(ANIMATION_MS);
      });
      expect(status()).toBeEmptyDOMElement();
    });

    it('Wealthy plays only after a resource is confirmed', () => {
      renderDesktop();
      openCards();
      useCard('Wealthy');

      expect(status()).toBeEmptyDOMElement();
      fireEvent.click(screen.getByTestId('wealthy-resource-gold'));
      expect(status()).toHaveTextContent('You played Wealthy.');
    });

    it('Steal Resource plays only after the steal is confirmed', () => {
      renderDesktop();
      openCards();
      useCard('Steal Resource');

      expect(status()).toBeEmptyDOMElement();
      fireEvent.click(screen.getByTestId('steal-target-player-1'));
      fireEvent.click(screen.getByTestId('steal-resource-gold'));
      expect(status()).toBeEmptyDOMElement();
      fireEvent.click(screen.getByRole('button', { name: /^Steal 2/ }));
      expect(status()).toHaveTextContent('You played Steal Resource.');
    });
  });

  describe('mobile', () => {
    it('tapping Cards in the actions sheet closes the sheet and opens the Cards dialog', () => {
      render(
        <TooltipProvider>
          <WithEventLogBoard gameState={emptyEventLogGameState}>
            <CardPlaySandbox variant="mobile" />
          </WithEventLogBoard>
        </TooltipProvider>,
      );

      fireEvent.click(screen.getByTestId('actions-panel-more-actions'));
      const sheet = screen.getByRole('dialog');
      expect(sheet).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Cards \(2\/7\)/ }));

      expect(sheet).not.toBeInTheDocument();
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Use Extra Move' })).toBeInTheDocument();
    });
  });
});
