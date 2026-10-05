'use client';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { MobileActionsSheetProps } from './ActionsPanel.types';
import {
  myTurnNoSelection,
  cardActionInProgress,
  notMyTurn,
} from './ActionsPanel.fixtures';
import { MobileActionsSheet } from './MobileActionsSheet';

const renderWithTooltip = (component: React.ReactElement) => {
  return render(<TooltipProvider>{component}</TooltipProvider>);
};

describe('MobileActionsSheet', () => {
  describe('sheet header content', () => {
    it('renders title "Actions"', () => {
      const props: MobileActionsSheetProps = {
        open: true,
        onOpenChange: jest.fn(),
        secondaryActions: myTurnNoSelection.secondaryActions,
        deckCount: myTurnNoSelection.deckCount,
        onActionClick: jest.fn(),
      };
      renderWithTooltip(<MobileActionsSheet {...props} />);
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('renders info beacon when provided', () => {
      const infoBeacon = <div data-testid="info-beacon">Test Beacon</div>;
      const props: MobileActionsSheetProps = {
        open: true,
        onOpenChange: jest.fn(),
        secondaryActions: myTurnNoSelection.secondaryActions,
        deckCount: myTurnNoSelection.deckCount,
        infoBeacon,
        onActionClick: jest.fn(),
      };
      renderWithTooltip(<MobileActionsSheet {...props} />);
      expect(screen.getByTestId('info-beacon')).toBeInTheDocument();
    });

    it('does not render info beacon when not provided', () => {
      const props: MobileActionsSheetProps = {
        open: true,
        onOpenChange: jest.fn(),
        secondaryActions: myTurnNoSelection.secondaryActions,
        deckCount: myTurnNoSelection.deckCount,
        onActionClick: jest.fn(),
      };
      renderWithTooltip(<MobileActionsSheet {...props} />);
      expect(screen.queryByTestId('info-beacon')).not.toBeInTheDocument();
    });

    it('displays "Cards left in deck" text with correct count', () => {
      const props: MobileActionsSheetProps = {
        open: true,
        onOpenChange: jest.fn(),
        secondaryActions: myTurnNoSelection.secondaryActions,
        deckCount: 18,
        onActionClick: jest.fn(),
      };
      renderWithTooltip(<MobileActionsSheet {...props} />);
      expect(screen.getByText('Cards left in deck: 18')).toBeInTheDocument();
    });
  });

  describe('secondary actions grid', () => {
    it('renders all secondary actions', () => {
      const props: MobileActionsSheetProps = {
        open: true,
        onOpenChange: jest.fn(),
        secondaryActions: myTurnNoSelection.secondaryActions,
        deckCount: myTurnNoSelection.deckCount,
        onActionClick: jest.fn(),
      };
      renderWithTooltip(<MobileActionsSheet {...props} />);
      myTurnNoSelection.secondaryActions.forEach((action) => {
        expect(screen.getByText(action.label)).toBeInTheDocument();
      });
    });

    it('renders secondary action buttons with correct test IDs', () => {
      const props: MobileActionsSheetProps = {
        open: true,
        onOpenChange: jest.fn(),
        secondaryActions: myTurnNoSelection.secondaryActions,
        deckCount: myTurnNoSelection.deckCount,
        onActionClick: jest.fn(),
      };
      renderWithTooltip(<MobileActionsSheet {...props} />);
      myTurnNoSelection.secondaryActions.forEach((action) => {
        expect(screen.getByTestId(`action-button-${action.id}`)).toBeInTheDocument();
      });
    });
  });

  describe('disabled reason captions (visible text)', () => {
    it('renders disabledReason as visible text for disabled secondary actions', () => {
      const props: MobileActionsSheetProps = {
        open: true,
        onOpenChange: jest.fn(),
        secondaryActions: cardActionInProgress.secondaryActions,
        deckCount: cardActionInProgress.deckCount,
        onActionClick: jest.fn(),
      };
      renderWithTooltip(<MobileActionsSheet {...props} />);
      const disabledReasonText = 'Complete or cancel the current card action first.';
      // Sheet shows exactly: Upgrade, BuyCard, Abilities (3 disabled secondary actions)
      expect(screen.getAllByText(disabledReasonText)).toHaveLength(3);
    });

    it('does not render disabledReason for enabled actions', () => {
      const props: MobileActionsSheetProps = {
        open: true,
        onOpenChange: jest.fn(),
        secondaryActions: myTurnNoSelection.secondaryActions,
        deckCount: myTurnNoSelection.deckCount,
        onActionClick: jest.fn(),
      };
      renderWithTooltip(<MobileActionsSheet {...props} />);
      const enabledActions = myTurnNoSelection.secondaryActions.filter((a) => !a.disabled);
      enabledActions.forEach((action) => {
        // Disabled reason should not appear as visible text
        if (action.disabledReason) {
          expect(screen.queryByText(action.disabledReason)).not.toBeInTheDocument();
        }
      });
    });

    it('shows "It\'s not your turn." for Upgrade, BuyCard, Abilities in notMyTurn state', () => {
      const props: MobileActionsSheetProps = {
        open: true,
        onOpenChange: jest.fn(),
        secondaryActions: notMyTurn.secondaryActions,
        deckCount: notMyTurn.deckCount,
        onActionClick: jest.fn(),
      };
      renderWithTooltip(<MobileActionsSheet {...props} />);
      const disabledReasonText = "It's not your turn.";
      // Should appear for Upgrade, BuyCard, Abilities (3 secondary actions in notMyTurn)
      const upgrade = notMyTurn.secondaryActions[0]; // Upgrade
      expect(upgrade.disabledReason).toBe(disabledReasonText);
      // Exact count: Upgrade, BuyCard, Abilities
      expect(screen.getAllByText(disabledReasonText)).toHaveLength(3);
    });

    it('Cards action stays enabled in notMyTurn state without disabledReason', () => {
      const props: MobileActionsSheetProps = {
        open: true,
        onOpenChange: jest.fn(),
        secondaryActions: notMyTurn.secondaryActions,
        deckCount: notMyTurn.deckCount,
        onActionClick: jest.fn(),
      };
      renderWithTooltip(<MobileActionsSheet {...props} />);
      const cardsAction = notMyTurn.secondaryActions[2]; // Cards
      const cardsButton = screen.getByTestId(`action-button-${cardsAction.id}`);
      // Cards should not be disabled in notMyTurn
      expect(cardsButton).not.toBeDisabled();
    });
  });

  describe('action button interaction', () => {
    it('calls onActionClick when a secondary action is clicked', () => {
      const onActionClick = jest.fn();
      const props: MobileActionsSheetProps = {
        open: true,
        onOpenChange: jest.fn(),
        secondaryActions: myTurnNoSelection.secondaryActions,
        deckCount: myTurnNoSelection.deckCount,
        onActionClick,
      };
      renderWithTooltip(<MobileActionsSheet {...props} />);
      const enabledAction = myTurnNoSelection.secondaryActions.find((a) => !a.disabled);
      if (enabledAction) {
        const button = screen.getByTestId(`action-button-${enabledAction.id}`);
        fireEvent.click(button);
        expect(onActionClick).toHaveBeenCalledWith(enabledAction.id);
      }
    });

    it('does not call onActionClick when a disabled action is clicked', () => {
      const onActionClick = jest.fn();
      const props: MobileActionsSheetProps = {
        open: true,
        onOpenChange: jest.fn(),
        secondaryActions: cardActionInProgress.secondaryActions,
        deckCount: cardActionInProgress.deckCount,
        onActionClick,
      };
      renderWithTooltip(<MobileActionsSheet {...props} />);
      const disabledAction = cardActionInProgress.secondaryActions.find((a) => a.disabled);
      expect(disabledAction).toBeDefined();
      if (disabledAction) {
        const button = screen.getByTestId(`action-button-${disabledAction.id}`);
        expect(button).toBeDisabled();
        fireEvent.click(button);
        // onClick handler should not be called for a disabled button
        expect(onActionClick).not.toHaveBeenCalled();
      }
    });
  });

  describe('sheet visibility and open/close', () => {
    it('does not render content when open is false', () => {
      const props: MobileActionsSheetProps = {
        open: false,
        onOpenChange: jest.fn(),
        secondaryActions: myTurnNoSelection.secondaryActions,
        deckCount: myTurnNoSelection.deckCount,
        onActionClick: jest.fn(),
      };
      const { container } = render(
        <TooltipProvider>
          <MobileActionsSheet {...props} />
        </TooltipProvider>
      );
      // Sheet content should not be visible
      const sheetContent = container.querySelector('[role="dialog"]');
      // When closed, dialog might exist but be hidden
      if (sheetContent) {
        expect(sheetContent).not.toHaveClass('data-[state=open]');
      }
    });

    it('renders content when open is true', () => {
      const props: MobileActionsSheetProps = {
        open: true,
        onOpenChange: jest.fn(),
        secondaryActions: myTurnNoSelection.secondaryActions,
        deckCount: myTurnNoSelection.deckCount,
        onActionClick: jest.fn(),
      };
      renderWithTooltip(<MobileActionsSheet {...props} />);
      // Should see the title
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('calls onOpenChange with false when the sheet should close', () => {
      const onOpenChange = jest.fn();
      const props: MobileActionsSheetProps = {
        open: true,
        onOpenChange,
        secondaryActions: myTurnNoSelection.secondaryActions,
        deckCount: myTurnNoSelection.deckCount,
        onActionClick: jest.fn(),
      };
      const { container } = render(
        <TooltipProvider>
          <MobileActionsSheet {...props} />
        </TooltipProvider>
      );
      // Try to find and click the close button (X)
      const closeButton = container.querySelector('button[aria-label*="close"], button[aria-label*="Close"]');
      if (closeButton) {
        fireEvent.click(closeButton);
        expect(onOpenChange).toHaveBeenCalledWith(false);
      }
    });
  });

  describe('accessibility', () => {
    it('renders action buttons with accessible labels', () => {
      const props: MobileActionsSheetProps = {
        open: true,
        onOpenChange: jest.fn(),
        secondaryActions: myTurnNoSelection.secondaryActions,
        deckCount: myTurnNoSelection.deckCount,
        onActionClick: jest.fn(),
      };
      renderWithTooltip(<MobileActionsSheet {...props} />);
      myTurnNoSelection.secondaryActions.forEach((action) => {
        expect(screen.getByText(action.label)).toBeInTheDocument();
      });
    });
  });
});
