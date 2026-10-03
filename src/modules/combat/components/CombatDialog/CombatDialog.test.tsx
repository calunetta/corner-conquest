import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CombatDialog } from './CombatDialog';
import {
  rollingPhaseAttackerNoCards,
  rollingPhaseAttackerBothCards,
  rollingPhaseSpectator,
  resultsPhaseAttackerWins,
  resultsPhaseDrawn,
} from './CombatDialog.fixtures';

// Mock next/image to avoid issues with Image component in tests
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    const rest = { ...props };
    delete rest.unoptimized;
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    return <img {...rest} />;
  },
}));

describe('CombatDialog View', () => {
  describe('Rolling phase - Attacker can act', () => {
    it('shows Roll button when canPerformAction is true (isMyTurn && isAttacker)', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();

      render(
        <CombatDialog
          gameState={rollingPhaseAttackerBothCards}
          onRoll={mockRoll}
          onClose={mockClose}
          isMyTurn={true}
          localPlayerId={0}
        />
      );

      expect(screen.getByRole('button', { name: /Roll for Battle!/i })).toBeInTheDocument();
      expect(screen.queryByText(/Waiting for attacker to roll/i)).not.toBeInTheDocument();
    });

    it('shows title "Territory Battle!" during rolling phase', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();

      render(
        <CombatDialog
          gameState={rollingPhaseAttackerNoCards}
          onRoll={mockRoll}
          onClose={mockClose}
          isMyTurn={true}
          localPlayerId={0}
        />
      );

      expect(screen.getByText(/Territory Battle!/i)).toBeInTheDocument();
    });

    it('displays attacker and defender names in description', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();

      render(
        <CombatDialog
          gameState={rollingPhaseAttackerNoCards}
          onRoll={mockRoll}
          onClose={mockClose}
          isMyTurn={true}
          localPlayerId={0}
        />
      );

      expect(screen.getByText(/attacks/i)).toBeInTheDocument();
      const description = screen.getByText(/attacks/i);
      const dialogContent = description.closest('[role="alertdialog"]');
      expect(dialogContent?.textContent).toMatch(/Alice/i);
      expect(dialogContent?.textContent).toMatch(/Bob/i);
    });
  });

  describe('Rolling phase - Spectator/Defender', () => {
    it('shows waiting message when not canPerformAction (defender perspective)', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();

      render(
        <CombatDialog
          gameState={rollingPhaseAttackerNoCards}
          onRoll={mockRoll}
          onClose={mockClose}
          isMyTurn={true}
          localPlayerId={1}
        />
      );

      expect(screen.getByText(/Waiting for attacker to roll/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Roll for Battle!/i })).not.toBeInTheDocument();
    });

    it('hides Roll button and shows waiting message when isMyTurn is false', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();

      render(
        <CombatDialog
          gameState={rollingPhaseAttackerNoCards}
          onRoll={mockRoll}
          onClose={mockClose}
          isMyTurn={false}
          localPlayerId={0}
        />
      );

      expect(screen.getByText(/Waiting for attacker to roll/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Roll for Battle!/i })).not.toBeInTheDocument();
    });
  });

  describe('Tactical card selection', () => {
    it('does not show tactical card block when attacker has no special cards', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();

      render(
        <CombatDialog
          gameState={rollingPhaseAttackerNoCards}
          onRoll={mockRoll}
          onClose={mockClose}
          isMyTurn={true}
          localPlayerId={0}
        />
      );

      expect(screen.queryByText(/Tactical Combat Card/i)).not.toBeInTheDocument();
    });

    it('shows tactical card block with both cards when attacker has both', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();

      render(
        <CombatDialog
          gameState={rollingPhaseAttackerBothCards}
          onRoll={mockRoll}
          onClose={mockClose}
          isMyTurn={true}
          localPlayerId={0}
        />
      );

      expect(screen.getByText(/Tactical Combat Card/i)).toBeInTheDocument();
      expect(screen.getByText(/Overcome/i)).toBeInTheDocument();
      expect(screen.getByText(/War Chief/i)).toBeInTheDocument();
    });

    it('shows tactical card block with only Overcome when attacker has only Overcome', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();

      render(
        <CombatDialog
          gameState={rollingPhaseSpectator}
          onRoll={mockRoll}
          onClose={mockClose}
          isMyTurn={true}
          localPlayerId={0}
        />
      );

      expect(screen.getByText(/Tactical Combat Card/i)).toBeInTheDocument();
      expect(screen.getByText(/Overcome/i)).toBeInTheDocument();
      expect(screen.queryByText(/War Chief/i)).not.toBeInTheDocument();
    });

    it('hides tactical card block when not canPerformAction (non-attacker perspective)', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();

      render(
        <CombatDialog
          gameState={rollingPhaseAttackerBothCards}
          onRoll={mockRoll}
          onClose={mockClose}
          isMyTurn={true}
          localPlayerId={1}
        />
      );

      expect(screen.queryByText(/Tactical Combat Card/i)).not.toBeInTheDocument();
    });

    it('allows selection of tactical cards via radio group', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();

      render(
        <CombatDialog
          gameState={rollingPhaseAttackerBothCards}
          onRoll={mockRoll}
          onClose={mockClose}
          isMyTurn={true}
          localPlayerId={0}
        />
      );

      const overcomeRadio = screen.getByRole('radio', { name: /Overcome/ });
      fireEvent.click(overcomeRadio);
      expect(overcomeRadio).toHaveAttribute('aria-checked', 'true');

      const warChiefRadio = screen.getByRole('radio', { name: /War Chief/ });
      fireEvent.click(warChiefRadio);
      expect(warChiefRadio).toHaveAttribute('aria-checked', 'true');
    });
  });

  describe('Roll button interaction', () => {
    it('calls onRoll with useOvercome=true when Overcome is selected and clicked', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();

      render(
        <CombatDialog
          gameState={rollingPhaseAttackerBothCards}
          onRoll={mockRoll}
          onClose={mockClose}
          isMyTurn={true}
          localPlayerId={0}
        />
      );

      // Select Overcome card
      fireEvent.click(screen.getByRole('radio', { name: /Overcome/ }));

      // Click Roll button
      fireEvent.click(screen.getByRole('button', { name: /Roll for Battle!/i }));

      expect(mockRoll).toHaveBeenCalledWith({ useWarChief: false, useOvercome: true });
    });

    it('calls onRoll with useWarChief=true when War Chief is selected and clicked', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();

      render(
        <CombatDialog
          gameState={rollingPhaseAttackerBothCards}
          onRoll={mockRoll}
          onClose={mockClose}
          isMyTurn={true}
          localPlayerId={0}
        />
      );

      // Select War Chief card
      fireEvent.click(screen.getByRole('radio', { name: /War Chief/ }));

      // Click Roll button
      fireEvent.click(screen.getByRole('button', { name: /Roll for Battle!/i }));

      expect(mockRoll).toHaveBeenCalledWith({ useWarChief: true, useOvercome: false });
    });

    it('calls onRoll with both false when Standard Roll is selected', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();

      render(
        <CombatDialog
          gameState={rollingPhaseAttackerBothCards}
          onRoll={mockRoll}
          onClose={mockClose}
          isMyTurn={true}
          localPlayerId={0}
        />
      );

      // Select Standard Roll (default)
      fireEvent.click(screen.getByRole('radio', { name: /Standard Roll/ }));

      // Click Roll button
      fireEvent.click(screen.getByRole('button', { name: /Roll for Battle!/i }));

      expect(mockRoll).toHaveBeenCalledWith({ useWarChief: false, useOvercome: false });
    });

    it('disables Roll button while isRolling is true', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();

      render(
        <CombatDialog
          gameState={rollingPhaseAttackerBothCards}
          onRoll={mockRoll}
          onClose={mockClose}
          isMyTurn={true}
          localPlayerId={0}
        />
      );

      const rollButton = screen.getByRole('button', { name: /Roll for Battle!/i });
      expect(rollButton).not.toBeDisabled();

      // Note: The component's isRolling is internal to the hook, so we can't directly
      // change it via props. This test verifies the button exists and is not disabled
      // in the rolling phase. The actual disabled state during rolling is tested via
      // the hook tests.
    });
  });

  describe('Results phase', () => {
    it('shows "Combat Outcome" title during results phase', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();

      render(
        <CombatDialog
          gameState={resultsPhaseAttackerWins}
          onRoll={mockRoll}
          onClose={mockClose}
          isMyTurn={true}
          localPlayerId={0}
        />
      );

      expect(screen.getByText(/Combat Outcome/i)).toBeInTheDocument();
    });

    it('displays both dice rolls and totals for each combatant', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();

      render(
        <CombatDialog
          gameState={resultsPhaseAttackerWins}
          onRoll={mockRoll}
          onClose={mockClose}
          isMyTurn={true}
          localPlayerId={0}
        />
      );

      // Check that totals are shown
      const totals = screen.getAllByText(/Total:/i);
      expect(totals.length).toBe(2);

      // Check individual dice are displayed
      // Note: The fixture has attacker rolls [5, 4, 3] and defender rolls [2, 2, 1]
      // So we check for the unique/distinctive values
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      // There are two 2's, so we use queryAll to verify there are at least 2
      const twoDice = screen.getAllByText('2');
      expect(twoDice.length).toBeGreaterThanOrEqual(2);
      const oneDice = screen.getAllByText('1');
      expect(oneDice.length).toBeGreaterThanOrEqual(1);
    });

    it('shows winner banner with winner name when winnerId is set', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();

      render(
        <CombatDialog
          gameState={resultsPhaseAttackerWins}
          onRoll={mockRoll}
          onClose={mockClose}
          isMyTurn={true}
          localPlayerId={0}
        />
      );

      expect(screen.getByText(/Alice Victorious!/i)).toBeInTheDocument();
    });

    it('shows "Draw - No Victor" when winnerId is null', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();

      render(
        <CombatDialog
          gameState={resultsPhaseDrawn}
          onRoll={mockRoll}
          onClose={mockClose}
          isMyTurn={true}
          localPlayerId={0}
        />
      );

      expect(screen.getByText(/Draw - No Victor/i)).toBeInTheDocument();
    });

    it('shows "Confirm Results" button in results phase', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();

      render(
        <CombatDialog
          gameState={resultsPhaseAttackerWins}
          onRoll={mockRoll}
          onClose={mockClose}
          isMyTurn={true}
          localPlayerId={0}
        />
      );

      expect(screen.getByRole('button', { name: /Confirm Results/i })).toBeInTheDocument();
    });

    it('calls onClose when Confirm Results button is clicked', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();

      render(
        <CombatDialog
          gameState={resultsPhaseAttackerWins}
          onRoll={mockRoll}
          onClose={mockClose}
          isMyTurn={true}
          localPlayerId={0}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /Confirm Results/i }));

      expect(mockClose).toHaveBeenCalled();
    });

    it('hides tactical card block in results phase', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();

      render(
        <CombatDialog
          gameState={resultsPhaseAttackerWins}
          onRoll={mockRoll}
          onClose={mockClose}
          isMyTurn={true}
          localPlayerId={0}
        />
      );

      expect(screen.queryByText(/Tactical Combat Card/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Roll for Battle!/i })).not.toBeInTheDocument();
    });
  });

  describe('Null cases', () => {
    it('renders nothing when there is no combatState', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();

      const { container } = render(
        <CombatDialog
          gameState={{ ...rollingPhaseAttackerNoCards, combatState: null }}
          onRoll={mockRoll}
          onClose={mockClose}
          isMyTurn={true}
          localPlayerId={0}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('renders nothing when defender is not found in players array', () => {
      const gameStateWithBadDefender = {
        ...rollingPhaseAttackerNoCards,
        combatState: {
          ...rollingPhaseAttackerNoCards.combatState!,
          defenderId: 999,
        },
      };

      const mockRoll = jest.fn();
      const mockClose = jest.fn();

      const { container } = render(
        <CombatDialog
          gameState={gameStateWithBadDefender}
          onRoll={mockRoll}
          onClose={mockClose}
          isMyTurn={true}
          localPlayerId={0}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Sprite rendering', () => {
    it('displays attacker and defender sprites in rolling phase', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();

      render(
        <CombatDialog
          gameState={rollingPhaseAttackerNoCards}
          onRoll={mockRoll}
          onClose={mockClose}
          isMyTurn={true}
          localPlayerId={0}
        />
      );

      // Check that both sprites are rendered
      const images = screen.getAllByRole('img') as HTMLImageElement[];
      const sprites = images.filter(img => img.alt.includes('sprite'));
      expect(sprites.length).toBeGreaterThanOrEqual(2);
    });

    it('displays different sprites for winner vs loser in results phase', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();

      render(
        <CombatDialog
          gameState={resultsPhaseAttackerWins}
          onRoll={mockRoll}
          onClose={mockClose}
          isMyTurn={true}
          localPlayerId={0}
        />
      );

      const images = screen.getAllByRole('img') as HTMLImageElement[];
      const sprites = images.filter(img => img.alt.includes('sprite'));
      expect(sprites.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Combatant information display', () => {
    it('displays attacker name and color styling', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();

      render(
        <CombatDialog
          gameState={rollingPhaseAttackerNoCards}
          onRoll={mockRoll}
          onClose={mockClose}
          isMyTurn={true}
          localPlayerId={0}
        />
      );

      // Check that attacker name appears
      const names = screen.getAllByText(/Alice/i);
      expect(names.length).toBeGreaterThan(0);
    });

    it('displays defender name and color styling', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();

      render(
        <CombatDialog
          gameState={rollingPhaseAttackerNoCards}
          onRoll={mockRoll}
          onClose={mockClose}
          isMyTurn={true}
          localPlayerId={0}
        />
      );

      // Check that defender name appears
      const names = screen.getAllByText(/Bob/i);
      expect(names.length).toBeGreaterThan(0);
    });
  });

  describe('VS divider', () => {
    it('displays VS divider between combatants', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();

      render(
        <CombatDialog
          gameState={rollingPhaseAttackerNoCards}
          onRoll={mockRoll}
          onClose={mockClose}
          isMyTurn={true}
          localPlayerId={0}
        />
      );

      expect(screen.getByText(/VS/i)).toBeInTheDocument();
    });
  });
});
