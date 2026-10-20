'use client';

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { useGameBoard } from '@/features/game/context/GameBoardContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { ActionsPanelViewModel } from './ActionsPanel.types';
import {
  myTurnNoSelection,
  armySelectedCanAttack,
  cardActionInProgress,
  extraMoveActive,
  notMyTurn,
} from './ActionsPanel.fixtures';
import { MobileActionsBar } from './MobileActionsBar';
import { styles } from './MobileActionsBar.styles';

jest.mock('@/features/game/context/GameBoardContext', () => ({ useGameBoard: jest.fn() }));

// Mock ResizeObserver for all tests in this file
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

const renderWithTooltip = (component: React.ReactElement) => {
  return render(<TooltipProvider>{component}</TooltipProvider>);
};

describe('MobileActionsBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resizeObserverInstances.length = 0;
  });

  describe('Row 1 conditional elements', () => {
    it('renders Row 1 with Cancel button when isCancellableActionInProgress', () => {
      renderWithTooltip(<MobileActionsBar {...cardActionInProgress} />);
      expect(screen.getByTestId('actions-panel-cancel')).toBeInTheDocument();
    });

    it('does not render Cancel button in myTurnNoSelection', () => {
      renderWithTooltip(<MobileActionsBar {...myTurnNoSelection} />);
      expect(screen.queryByTestId('actions-panel-cancel')).not.toBeInTheDocument();
    });

    it('renders Row 1 with Deselect button when hasSelectedArmy', () => {
      renderWithTooltip(<MobileActionsBar {...armySelectedCanAttack} />);
      expect(screen.getByTestId('actions-panel-deselect')).toBeInTheDocument();
    });

    it('does not render Deselect button in myTurnNoSelection', () => {
      renderWithTooltip(<MobileActionsBar {...myTurnNoSelection} />);
      expect(screen.queryByTestId('actions-panel-deselect')).not.toBeInTheDocument();
    });

    it('renders extra-move banner when hasExtraMoveBanner', () => {
      renderWithTooltip(<MobileActionsBar {...extraMoveActive} />);
      expect(screen.getByTestId('extra-move-banner')).toBeInTheDocument();
      expect(screen.getByText(/Extra Move active/)).toBeInTheDocument();
    });

    it('does not render extra-move banner in myTurnNoSelection', () => {
      renderWithTooltip(<MobileActionsBar {...myTurnNoSelection} />);
      expect(screen.queryByTestId('extra-move-banner')).not.toBeInTheDocument();
    });
  });

  describe('Row 2 grid and column count', () => {
    it('renders Row 2 with 4 columns when isMyTurn (includes End Turn)', () => {
      const { container } = render(
        <TooltipProvider>
          <MobileActionsBar {...myTurnNoSelection} />
        </TooltipProvider>
      );
      const row2 = container.querySelector('.grid-cols-4');
      expect(row2).toBeInTheDocument();
    });

    it('renders Row 2 with 3 columns when not isMyTurn (no End Turn)', () => {
      const { container } = render(
        <TooltipProvider>
          <MobileActionsBar {...notMyTurn} />
        </TooltipProvider>
      );
      const row2 = container.querySelector('.grid-cols-3');
      expect(row2).toBeInTheDocument();
    });

    it('renders End Turn button when isMyTurn', () => {
      renderWithTooltip(<MobileActionsBar {...myTurnNoSelection} />);
      expect(screen.getByTestId('actions-panel-end-turn')).toBeInTheDocument();
    });

    it('does not render End Turn button when not isMyTurn', () => {
      renderWithTooltip(<MobileActionsBar {...notMyTurn} />);
      expect(screen.queryByTestId('actions-panel-end-turn')).not.toBeInTheDocument();
    });
  });

  describe('disabled reason captions (visible text)', () => {
    it('renders disabledReason as visible text for disabled actions in cardActionInProgress', () => {
      renderWithTooltip(<MobileActionsBar {...cardActionInProgress} />);
      // All actions with the shared disabledReason should appear
      const disabledReasonText = 'Complete or cancel the current card action first.';
      const matches = screen.getAllByText(disabledReasonText);
      // Bar shows exactly: Position, Attack, Deploy (3 buttons in Row 2)
      expect(matches.length).toBe(3);
    });

    it('renders disabledReason for disabled Deploy button in cardActionInProgress', () => {
      renderWithTooltip(<MobileActionsBar {...cardActionInProgress} />);
      const disabledReasonText = 'Complete or cancel the current card action first.';
      // Exact count: Position, Attack, Deploy
      expect(screen.getAllByText(disabledReasonText)).toHaveLength(3);
    });

    it('renders position disabledReason in armySelectedCanAttack state', () => {
      renderWithTooltip(<MobileActionsBar {...armySelectedCanAttack} />);
      const positionAction = armySelectedCanAttack.mainActions[0];
      // Position should show its specific reason
      expect(screen.getByText(positionAction.disabledReason)).toBeInTheDocument();
    });

    it('does not render disabledReason for enabled actions', () => {
      renderWithTooltip(<MobileActionsBar {...myTurnNoSelection} />);
      const enabledActions = [
        ...myTurnNoSelection.mainActions,
        ...myTurnNoSelection.alwaysAvailableActions,
      ].filter((a) => !a.disabled);
      enabledActions.forEach((action) => {
        // Disabled reason should not appear as visible text (only in tooltip)
        if (action.disabledReason) {
          expect(screen.queryByText(action.disabledReason)).not.toBeInTheDocument();
        }
      });
    });

    it('shows "It\'s not your turn." for all actions when isMyTurn is false', () => {
      renderWithTooltip(<MobileActionsBar {...notMyTurn} />);
      const disabledReasonText = "It's not your turn.";
      // Appears for Position, Attack, Deploy
      const matches = screen.getAllByText(disabledReasonText);
      expect(matches).toHaveLength(3);
    });
  });

  describe('More Actions button and sheet interaction', () => {
    it('renders More Actions button', () => {
      renderWithTooltip(<MobileActionsBar {...myTurnNoSelection} />);
      expect(screen.getByTestId('actions-panel-more-actions')).toBeInTheDocument();
    });

    it('opens sheet when More Actions is clicked', () => {
      renderWithTooltip(<MobileActionsBar {...myTurnNoSelection} />);
      const moreActionsButton = screen.getByTestId('actions-panel-more-actions');
      fireEvent.click(moreActionsButton);
      // Sheet should be visible (contains the "Actions" title)
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('shows sheet content with secondary actions when opened', () => {
      renderWithTooltip(<MobileActionsBar {...myTurnNoSelection} />);
      const moreActionsButton = screen.getByTestId('actions-panel-more-actions');
      fireEvent.click(moreActionsButton);
      // Secondary actions should be visible
      myTurnNoSelection.secondaryActions.forEach((action) => {
        expect(screen.getByText(action.label)).toBeInTheDocument();
      });
    });

    it('shows deck count in sheet', () => {
      renderWithTooltip(<MobileActionsBar {...myTurnNoSelection} />);
      const moreActionsButton = screen.getByTestId('actions-panel-more-actions');
      fireEvent.click(moreActionsButton);
      expect(screen.getByText(`Cards left in deck: ${myTurnNoSelection.deckCount}`)).toBeInTheDocument();
    });
  });

  describe('tapping a sheet action', () => {
    const cardsAction = myTurnNoSelection.secondaryActions[2];

    it('forwards the action id to onActionClick and closes the actions sheet', async () => {
      const onActionClick = jest.fn();
      renderWithTooltip(<MobileActionsBar {...myTurnNoSelection} onActionClick={onActionClick} />);
      fireEvent.click(screen.getByTestId('actions-panel-more-actions'));
      expect(screen.getByRole('dialog', { name: 'Actions' })).toBeInTheDocument();

      fireEvent.click(screen.getByTestId(`action-button-${cardsAction.id}`));

      expect(onActionClick).toHaveBeenCalledTimes(1);
      expect(onActionClick).toHaveBeenCalledWith(cardsAction.id);
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Actions' })).not.toBeInTheDocument());
    });

    it('clicking a main action leaves the actions sheet closed and still forwards the click', () => {
      const onActionClick = jest.fn();
      renderWithTooltip(<MobileActionsBar {...myTurnNoSelection} onActionClick={onActionClick} />);
      const mainAction = [...myTurnNoSelection.mainActions, ...myTurnNoSelection.alwaysAvailableActions].find(
        (a) => !a.disabled,
      );
      if (!mainAction) throw new Error('fixture has no enabled main action');

      fireEvent.click(screen.getByTestId(`action-button-${mainAction.id}`));

      expect(onActionClick).toHaveBeenCalledWith(mainAction.id);
      expect(screen.queryByRole('dialog', { name: 'Actions' })).not.toBeInTheDocument();
    });
  });

  describe('End Turn button rendering and styling', () => {
    it('renders End Turn with full label and timer', () => {
      renderWithTooltip(<MobileActionsBar {...myTurnNoSelection} />);
      const endTurnButton = screen.getByTestId('actions-panel-end-turn');
      expect(endTurnButton).toBeInTheDocument();
      expect(screen.getByText(/End Turn/)).toBeInTheDocument();
      expect(screen.getByText(new RegExp(myTurnNoSelection.turnTimer.formattedTime))).toBeInTheDocument();
    });

    it('renders End Turn button with endTurnButtonMobile styling (h-16, not desktop h-7)', () => {
      renderWithTooltip(<MobileActionsBar {...myTurnNoSelection} />);
      const endTurnButton = screen.getByTestId('actions-panel-end-turn');
      // endTurnButtonMobile should contain h-16 (from buttonVariant(isMain: true))
      expect(endTurnButton.className).toContain('h-16');
    });

    it('renders End Turn with progress bar width based on turnTimer.percentage', () => {
      const { container } = render(
        <TooltipProvider>
          <MobileActionsBar {...myTurnNoSelection} />
        </TooltipProvider>
      );
      const progressBar = container.querySelector(
        `span[style*="${myTurnNoSelection.turnTimer.percentage}%"]`
      );
      expect(progressBar).toBeInTheDocument();
    });

    it('applies expiring style when turnTimer.isExpiring', () => {
      const expiringModel: ActionsPanelViewModel = {
        ...myTurnNoSelection,
        turnTimer: { ...myTurnNoSelection.turnTimer, isExpiring: true },
      };
      renderWithTooltip(<MobileActionsBar {...expiringModel} />);
      const endTurnButton = screen.getByTestId('actions-panel-end-turn');
      expect(endTurnButton.className).toContain('ring-1');
    });

    it('disables End Turn button when isEndTurnDisabled', () => {
      const disabledModel: ActionsPanelViewModel = {
        ...myTurnNoSelection,
        isEndTurnDisabled: true,
      };
      renderWithTooltip(<MobileActionsBar {...disabledModel} />);
      const endTurnButton = screen.getByTestId('actions-panel-end-turn');
      expect(endTurnButton).toBeDisabled();
    });

    it('full End Turn label is not clipped at extraMoveActive state', () => {
      renderWithTooltip(<MobileActionsBar {...extraMoveActive} />);
      // Should have both "End Turn" and the timer visible
      expect(screen.getByText(/End Turn/)).toBeInTheDocument();
      // Check that the timer text with parentheses is visible (e.g. "(0:45)")
      const endTurnButton = screen.getByTestId('actions-panel-end-turn');
      expect(endTurnButton.textContent).toMatch(/\(\d+:\d+\)/);
    });
  });

  describe('Actions in main grid call onActionClick', () => {
    it('calls onActionClick when a main action button is clicked', () => {
      const onActionClick = jest.fn();
      const viewModel: ActionsPanelViewModel = {
        ...myTurnNoSelection,
        onActionClick,
      };
      renderWithTooltip(<MobileActionsBar {...viewModel} />);
      const enabledAction = [
        ...viewModel.mainActions,
        ...viewModel.alwaysAvailableActions,
      ].find((a) => !a.disabled);
      if (enabledAction) {
        const button = screen.getByTestId(`action-button-${enabledAction.id}`);
        fireEvent.click(button);
        expect(onActionClick).toHaveBeenCalledWith(enabledAction.id);
      }
    });
  });

  describe('Cancel and Deselect button handlers', () => {
    it('calls onCancelAction when Cancel is clicked', () => {
      const onCancelAction = jest.fn();
      const viewModel: ActionsPanelViewModel = {
        ...cardActionInProgress,
        onCancelAction,
      };
      renderWithTooltip(<MobileActionsBar {...viewModel} />);
      const cancelButton = screen.getByTestId('actions-panel-cancel');
      fireEvent.click(cancelButton);
      expect(onCancelAction).toHaveBeenCalled();
    });

    it('calls onDeselectArmy when Deselect is clicked', () => {
      const onDeselectArmy = jest.fn();
      const viewModel: ActionsPanelViewModel = {
        ...armySelectedCanAttack,
        onDeselectArmy,
      };
      renderWithTooltip(<MobileActionsBar {...viewModel} />);
      const deselectButton = screen.getByTestId('actions-panel-deselect');
      fireEvent.click(deselectButton);
      expect(onDeselectArmy).toHaveBeenCalled();
    });

    it('calls onEndTurn when End Turn is clicked', () => {
      const onEndTurn = jest.fn();
      const viewModel: ActionsPanelViewModel = {
        ...myTurnNoSelection,
        onEndTurn,
      };
      renderWithTooltip(<MobileActionsBar {...viewModel} />);
      const endTurnButton = screen.getByTestId('actions-panel-end-turn');
      fireEvent.click(endTurnButton);
      expect(onEndTurn).toHaveBeenCalled();
    });
  });

  describe('Log button and Event Log sheet', () => {
    beforeEach(() => {
      jest.mocked(useGameBoard).mockReturnValue({
        gameState: { log: [], players: [] },
      } as unknown as ReturnType<typeof useGameBoard>);
    });

    it.each([
      ['my turn with no selection', myTurnNoSelection],
      ['not my turn', notMyTurn],
      ['a card action in progress', cardActionInProgress],
      ['an army selected', armySelectedCanAttack],
      ['an extra move active', extraMoveActive],
    ])('shows the Log button next to More Actions when %s', (_label, viewModel) => {
      renderWithTooltip(<MobileActionsBar {...viewModel} />);

      const logButton = screen.getByRole('button', { name: 'Open event log' });
      const moreActionsButton = screen.getByTestId('actions-panel-more-actions');
      expect(logButton).toBeVisible();
      expect(logButton.parentElement).toBe(moreActionsButton.parentElement);
    });

    it('does not show the Event Log sheet until Log is clicked', () => {
      renderWithTooltip(<MobileActionsBar {...myTurnNoSelection} />);

      expect(screen.queryByRole('dialog', { name: 'Event Log' })).not.toBeInTheDocument();
    });

    it('opens the Event Log sheet when Log is clicked', () => {
      renderWithTooltip(<MobileActionsBar {...myTurnNoSelection} />);

      fireEvent.click(screen.getByRole('button', { name: 'Open event log' }));

      const dialog = screen.getByRole('dialog', { name: 'Event Log' });
      expect(within(dialog).getByRole('switch', { name: 'Show routine activity' })).toBeInTheDocument();
    });

    it('clicking Log while More Actions is open closes the actions sheet and opens the log', async () => {
      renderWithTooltip(<MobileActionsBar {...myTurnNoSelection} />);
      fireEvent.click(screen.getByTestId('actions-panel-more-actions'));
      expect(screen.getByRole('dialog', { name: 'Actions' })).toBeInTheDocument();

      // Radix hides the rest of the page while a modal is open, so the Log button is addressed by test id.
      fireEvent.click(screen.getByTestId('actions-panel-log'));

      expect(screen.getByRole('dialog', { name: 'Event Log' })).toBeInTheDocument();
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Actions' })).not.toBeInTheDocument());
    });

    it('clicking More Actions while the Event Log is open closes the log and opens the actions sheet', async () => {
      renderWithTooltip(<MobileActionsBar {...myTurnNoSelection} />);
      fireEvent.click(screen.getByTestId('actions-panel-log'));
      expect(screen.getByRole('dialog', { name: 'Event Log' })).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('actions-panel-more-actions'));

      expect(screen.getByRole('dialog', { name: 'Actions' })).toBeInTheDocument();
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Event Log' })).not.toBeInTheDocument());
    });
  });

  describe('accessibility', () => {
    it('renders bar with role=region and aria-label', () => {
      renderWithTooltip(<MobileActionsBar {...myTurnNoSelection} />);
      const bar = screen.getByRole('region', { name: 'Turn actions' });
      expect(bar).toBeInTheDocument();
    });

    it('has spacer div in DOM (even if height is 0)', () => {
      const { container } = render(
        <TooltipProvider>
          <MobileActionsBar {...myTurnNoSelection} />
        </TooltipProvider>
      );
      // The spacer should be rendered with the spacer class
      const spacer = container.querySelector(`.${styles.spacer}`);
      expect(spacer).toBeInTheDocument();
    });
  });
});
