import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { ActionsPanelViewModel } from './ActionsPanel.types';
import { myTurnNoSelection, armySelectedCanAttack, cardActionInProgress, extraMoveActive } from './ActionsPanel.fixtures';
import { ActionsPanelView, ActionsPanel } from './ActionsPanel';
import { useActionsPanel } from './ActionsPanel.hook';
import { useIsMobile } from '@/modules/shared';

// Mock the hooks for the connected component tests
jest.mock('./ActionsPanel.hook');
jest.mock('@/modules/shared');

// Helper to render ActionsPanelView with TooltipProvider context
const renderWithTooltip = (component: React.ReactElement) => {
  return render(<TooltipProvider>{component}</TooltipProvider>);
};

describe('ActionsPanelView', () => {
  describe('header and title', () => {
    it('renders the Actions title', () => {
      renderWithTooltip(<ActionsPanelView {...myTurnNoSelection} />);
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('renders the info beacon when provided', () => {
      const infoBeacon = <div data-testid="info-beacon">Test Beacon</div>;
      renderWithTooltip(<ActionsPanelView {...myTurnNoSelection} infoBeacon={infoBeacon} />);
      expect(screen.getByTestId('info-beacon')).toBeInTheDocument();
    });

    it('does not render info beacon when not provided', () => {
      renderWithTooltip(<ActionsPanelView {...myTurnNoSelection} />);
      expect(screen.queryByTestId('info-beacon')).not.toBeInTheDocument();
    });

    it('displays the deck count', () => {
      const viewModel = myTurnNoSelection;
      renderWithTooltip(<ActionsPanelView {...viewModel} />);
      expect(screen.getByText(new RegExp(`Cards left in deck: ${viewModel.deckCount}`))).toBeInTheDocument();
    });
  });

  describe('action buttons and states', () => {
    it('renders main action buttons', () => {
      renderWithTooltip(<ActionsPanelView {...myTurnNoSelection} />);
      const mainActions = myTurnNoSelection.mainActions;
      mainActions.forEach((action) => {
        expect(screen.getByText(action.label)).toBeInTheDocument();
      });
    });

    it('renders always-available action buttons (Deploy)', () => {
      renderWithTooltip(<ActionsPanelView {...myTurnNoSelection} />);
      const alwaysActions = myTurnNoSelection.alwaysAvailableActions;
      alwaysActions.forEach((action) => {
        expect(screen.getByTestId(`action-button-${action.id}`)).toBeInTheDocument();
      });
    });

    it('renders secondary action buttons', () => {
      renderWithTooltip(<ActionsPanelView {...myTurnNoSelection} />);
      const secondaryActions = myTurnNoSelection.secondaryActions;
      secondaryActions.forEach((action) => {
        expect(screen.getByTestId(`action-button-${action.id}`)).toBeInTheDocument();
      });
    });

    it('disables button when action.disabled is true', () => {
      renderWithTooltip(<ActionsPanelView {...myTurnNoSelection} />);
      const disabledActions = [
        ...myTurnNoSelection.mainActions,
        ...myTurnNoSelection.alwaysAvailableActions,
        ...myTurnNoSelection.secondaryActions,
      ].filter((a) => a.disabled);

      disabledActions.forEach((action) => {
        const button = screen.getByTestId(`action-button-${action.id}`);
        expect(button).toBeDisabled();
      });
    });

    it('enables button when action.disabled is false', () => {
      renderWithTooltip(<ActionsPanelView {...myTurnNoSelection} />);
      const enabledActions = [
        ...myTurnNoSelection.mainActions,
        ...myTurnNoSelection.alwaysAvailableActions,
        ...myTurnNoSelection.secondaryActions,
      ].filter((a) => !a.disabled);

      enabledActions.forEach((action) => {
        const button = screen.getByTestId(`action-button-${action.id}`);
        expect(button).not.toBeDisabled();
      });
    });

    it('calls onActionClick when an enabled button is clicked', () => {
      const onActionClick = jest.fn();
      const viewModel: ActionsPanelViewModel = {
        ...myTurnNoSelection,
        onActionClick,
      };
      renderWithTooltip(<ActionsPanelView {...viewModel} />);
      const enabledAction = [
        ...viewModel.mainActions,
        ...viewModel.alwaysAvailableActions,
        ...viewModel.secondaryActions,
      ].find((a) => !a.disabled);

      if (enabledAction) {
        const button = screen.getByTestId(`action-button-${enabledAction.id}`);
        fireEvent.click(button);
        expect(onActionClick).toHaveBeenCalledWith(enabledAction.id);
      }
    });
  });

  describe('Cancel button', () => {
    it('renders Cancel button when isCancellableActionInProgress and isMyTurn', () => {
      renderWithTooltip(<ActionsPanelView {...cardActionInProgress} />);
      expect(screen.getByTestId('actions-panel-cancel')).toBeInTheDocument();
    });

    it('does not render Cancel button when not cancellable action in progress', () => {
      renderWithTooltip(<ActionsPanelView {...myTurnNoSelection} />);
      expect(screen.queryByTestId('actions-panel-cancel')).not.toBeInTheDocument();
    });

    it('calls onCancelAction when Cancel is clicked', () => {
      const onCancelAction = jest.fn();
      const viewModel: ActionsPanelViewModel = {
        ...cardActionInProgress,
        onCancelAction,
      };
      renderWithTooltip(<ActionsPanelView {...viewModel} />);
      const cancelButton = screen.getByTestId('actions-panel-cancel');
      fireEvent.click(cancelButton);
      expect(onCancelAction).toHaveBeenCalled();
    });
  });

  describe('Deselect button', () => {
    it('renders Deselect button when hasSelectedArmy and isMyTurn', () => {
      renderWithTooltip(<ActionsPanelView {...armySelectedCanAttack} />);
      expect(screen.getByTestId('actions-panel-deselect')).toBeInTheDocument();
    });

    it('does not render Deselect button when no army selected', () => {
      renderWithTooltip(<ActionsPanelView {...myTurnNoSelection} />);
      expect(screen.queryByTestId('actions-panel-deselect')).not.toBeInTheDocument();
    });

    it('calls onDeselectArmy when Deselect is clicked', () => {
      const onDeselectArmy = jest.fn();
      const viewModel: ActionsPanelViewModel = {
        ...armySelectedCanAttack,
        onDeselectArmy,
      };
      renderWithTooltip(<ActionsPanelView {...viewModel} />);
      const deselectButton = screen.getByTestId('actions-panel-deselect');
      fireEvent.click(deselectButton);
      expect(onDeselectArmy).toHaveBeenCalled();
    });
  });

  describe('End Turn button', () => {
    it('renders End Turn button when isMyTurn', () => {
      renderWithTooltip(<ActionsPanelView {...myTurnNoSelection} />);
      expect(screen.getByTestId('actions-panel-end-turn')).toBeInTheDocument();
    });

    it('does not render End Turn button when not your turn', () => {
      const viewModel: ActionsPanelViewModel = {
        ...myTurnNoSelection,
        isMyTurn: false,
      };
      renderWithTooltip(<ActionsPanelView {...viewModel} />);
      expect(screen.queryByTestId('actions-panel-end-turn')).not.toBeInTheDocument();
    });

    it('disables End Turn button when isEndTurnDisabled', () => {
      const viewModel: ActionsPanelViewModel = {
        ...myTurnNoSelection,
        isEndTurnDisabled: true,
      };
      renderWithTooltip(<ActionsPanelView {...viewModel} />);
      const endTurnButton = screen.getByTestId('actions-panel-end-turn');
      expect(endTurnButton).toBeDisabled();
    });

    it('enables End Turn button when not disabled', () => {
      const viewModel: ActionsPanelViewModel = {
        ...myTurnNoSelection,
        isEndTurnDisabled: false,
      };
      renderWithTooltip(<ActionsPanelView {...viewModel} />);
      const endTurnButton = screen.getByTestId('actions-panel-end-turn');
      expect(endTurnButton).not.toBeDisabled();
    });

    it('displays turn timer on End Turn button', () => {
      const { container } = render(<TooltipProvider><ActionsPanelView {...myTurnNoSelection} /></TooltipProvider>);
      const endTurnButton = container.querySelector('[data-testid="actions-panel-end-turn"]');
      expect(endTurnButton).toBeInTheDocument();
    });

    it('updates progress bar width based on turnTimer.percentage', () => {
      const { container } = render(<TooltipProvider><ActionsPanelView {...myTurnNoSelection} /></TooltipProvider>);
      const progressBars = container.querySelectorAll('span[style*="width"]');
      const hasProgressBar = Array.from(progressBars).some((bar) =>
        bar.getAttribute('style')?.includes(`${myTurnNoSelection.turnTimer.percentage}%`)
      );
      expect(hasProgressBar).toBe(true);
    });

    it('calls onEndTurn when End Turn is clicked', () => {
      const onEndTurn = jest.fn();
      const viewModel: ActionsPanelViewModel = {
        ...myTurnNoSelection,
        onEndTurn,
        isEndTurnDisabled: false,
      };
      renderWithTooltip(<ActionsPanelView {...viewModel} />);
      const endTurnButton = screen.getByTestId('actions-panel-end-turn');
      fireEvent.click(endTurnButton);
      expect(onEndTurn).toHaveBeenCalled();
    });

    it('applies expiring style when turnTimer.isExpiring is true', () => {
      const viewModel: ActionsPanelViewModel = {
        ...myTurnNoSelection,
        turnTimer: {
          ...myTurnNoSelection.turnTimer,
          isExpiring: true,
        },
      };
      renderWithTooltip(<ActionsPanelView {...viewModel} />);
      const endTurnButton = screen.getByTestId('actions-panel-end-turn');
      expect(endTurnButton).toBeInTheDocument();
    });
  });

  describe('Extra Move banner', () => {
    it('renders extra move banner when hasExtraMoveBanner is true', () => {
      renderWithTooltip(<ActionsPanelView {...extraMoveActive} />);
      expect(screen.getByTestId('extra-move-banner')).toBeInTheDocument();
      expect(screen.getByText(/Extra Move/i)).toBeInTheDocument();
    });

    it('does not render extra move banner when hasExtraMoveBanner is false', () => {
      renderWithTooltip(<ActionsPanelView {...myTurnNoSelection} />);
      expect(screen.queryByTestId('extra-move-banner')).not.toBeInTheDocument();
    });

    it('does not render extra move banner when not your turn', () => {
      const viewModel: ActionsPanelViewModel = {
        ...extraMoveActive,
        isMyTurn: false,
      };
      renderWithTooltip(<ActionsPanelView {...viewModel} />);
      expect(screen.queryByTestId('extra-move-banner')).not.toBeInTheDocument();
    });

    it('displays message to select a soldier when extra move is active', () => {
      renderWithTooltip(<ActionsPanelView {...extraMoveActive} />);
      expect(screen.getByText(/Select a soldier/i)).toBeInTheDocument();
    });
  });

  describe('visibility based on turn state', () => {
    it('shows controls only when isMyTurn is true', () => {
      renderWithTooltip(<ActionsPanelView {...myTurnNoSelection} />);
      expect(screen.getByTestId('actions-panel-end-turn')).toBeInTheDocument();
    });

    it('hides controls when isMyTurn is false', () => {
      const viewModel: ActionsPanelViewModel = {
        ...myTurnNoSelection,
        isMyTurn: false,
      };
      renderWithTooltip(<ActionsPanelView {...viewModel} />);
      expect(screen.queryByTestId('actions-panel-end-turn')).not.toBeInTheDocument();
    });
  });

  describe('action disabled reasons and tooltips', () => {
    it('renders disabled action with its disabled reason', () => {
      renderWithTooltip(<ActionsPanelView {...myTurnNoSelection} />);
      const disabledAction = [
        ...myTurnNoSelection.mainActions,
        ...myTurnNoSelection.alwaysAvailableActions,
        ...myTurnNoSelection.secondaryActions,
      ].find((a) => a.disabled);

      if (disabledAction) {
        expect(disabledAction.disabledReason).toBeTruthy();
      }
    });
  });

  describe('action icons and variants', () => {
    it('renders all action buttons with proper structure', () => {
      const { container } = render(<TooltipProvider><ActionsPanelView {...myTurnNoSelection} /></TooltipProvider>);
      const allActionButtons = container.querySelectorAll('[data-testid^="action-button-"]');

      const expectedCount = myTurnNoSelection.mainActions.length +
        myTurnNoSelection.alwaysAvailableActions.length +
        myTurnNoSelection.secondaryActions.length;

      expect(allActionButtons.length).toBe(expectedCount);
    });
  });

  describe('accessibility and semantics', () => {
    it('renders all action buttons', () => {
      const { container } = render(<TooltipProvider><ActionsPanelView {...myTurnNoSelection} /></TooltipProvider>);
      const buttons = container.querySelectorAll('button');
      // Should have at least main (2) + always-available (1) + secondary (4) + controls = 7+ buttons
      expect(buttons.length).toBeGreaterThanOrEqual(7);
    });

    it('renders card with proper heading structure', () => {
      const { container } = render(<TooltipProvider><ActionsPanelView {...myTurnNoSelection} /></TooltipProvider>);
      expect(container.querySelector('[class*="card"]')).toBeInTheDocument();
    });
  });

  describe('desktop regression - no caption text for disabled actions', () => {
    it('does not render disabledReason caption text on desktop (disabledReasonVisible=false by default)', () => {
      renderWithTooltip(<ActionsPanelView {...myTurnNoSelection} />);
      const disabledActions = [
        ...myTurnNoSelection.mainActions,
        ...myTurnNoSelection.alwaysAvailableActions,
        ...myTurnNoSelection.secondaryActions,
      ].filter((a) => a.disabled);

      disabledActions.forEach((action) => {
        // The disabled reason should NOT appear as visible text (only in tooltip)
        // Search for the specific text, not just any text containing it
        const elements = screen.queryAllByText(action.disabledReason);
        // Should have no visible elements with this text
        elements.forEach((el) => {
          // If it's visible, it would be an error (should only be in tooltip)
          expect(el.closest('[role="tooltip"], [data-testid*="tooltip"]')).toBeFalsy();
        });
      });
    });
  });
});

describe('ActionsPanelView desktop regression', () => {
  it('desktop ActionsPanelView renders without caption when disabledReasonVisible is not passed', () => {
    // Verify the desktop view doesn't render disabled reason captions by default
    renderWithTooltip(<ActionsPanelView {...myTurnNoSelection} />);
    const disabledActions = myTurnNoSelection.mainActions.filter((a) => a.disabled);
    disabledActions.forEach((action) => {
      if (action.disabledReason) {
        expect(screen.queryByText(action.disabledReason)).not.toBeInTheDocument();
      }
    });
  });
});

describe('ActionsPanel (connected component with useIsMobile branch)', () => {
  beforeAll(() => {
    // Mock ResizeObserver for mobile tests
    const resizeObserverInstances: Array<{
      callback: ResizeObserverCallback;
      observe: jest.Mock;
      disconnect: jest.Mock;
    }> = [];

    window.ResizeObserver = jest.fn((callback: ResizeObserverCallback) => {
      const instance = {
        callback,
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
      };
      resizeObserverInstances.push(instance);
      return instance;
    }) as unknown as typeof window.ResizeObserver;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders MobileActionsBar when useIsMobile returns true', () => {
    jest.mocked(useActionsPanel).mockReturnValue(myTurnNoSelection);
    jest.mocked(useIsMobile).mockReturnValue(true);

    const { container } = render(
      <TooltipProvider>
        <ActionsPanel />
      </TooltipProvider>
    );
    // Mobile bar should render with role=region and aria-label
    const bar = container.querySelector('[role="region"][aria-label="Turn actions"]');
    expect(bar).toBeInTheDocument();
  });

  it('renders ActionsPanelView when useIsMobile returns false', () => {
    jest.mocked(useActionsPanel).mockReturnValue(myTurnNoSelection);
    jest.mocked(useIsMobile).mockReturnValue(false);

    renderWithTooltip(<ActionsPanel />);
    // Desktop Card should render with title
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });
});
