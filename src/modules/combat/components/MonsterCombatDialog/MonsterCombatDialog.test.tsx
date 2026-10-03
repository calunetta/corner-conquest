'use client';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MonsterCombatDialog } from './MonsterCombatDialog';
import {
  attackScreenNoCards,
  attackScreenAllCards,
  resultsPlayerWins,
  resultsMonsterWins,
  spectatorWaiting,
} from './MonsterCombatDialog.fixtures';

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    const rest = { ...props };
    delete rest.unoptimized;
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    return <img {...rest} />;
  },
}));

// Mock ResizeObserver for Slider component
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
}

describe('MonsterCombatDialog View Tests', () => {
  describe('Attack screen - no tactical cards', () => {
    it('renders attack screen with correct title', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();
      const mockCancel = jest.fn();

      render(
        <MonsterCombatDialog
          gameState={attackScreenNoCards}
          onRoll={mockRoll}
          onClose={mockClose}
          onCancel={mockCancel}
          isMyTurn={true}
          localPlayerId={0}
        />
      );

      expect(screen.getByText(/Monster Encounter: Bear \(Lvl 2\)/i)).toBeInTheDocument();
    });

    it('displays attacker name and power label', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();
      const mockCancel = jest.fn();

      render(
        <MonsterCombatDialog
          gameState={attackScreenNoCards}
          onRoll={mockRoll}
          onClose={mockClose}
          onCancel={mockCancel}
          isMyTurn={true}
          localPlayerId={0}
        />
      );

      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText(/Power: 1 \(1 Die\)/i)).toBeInTheDocument();
    });

    it('displays monster name and power label', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();
      const mockCancel = jest.fn();

      render(
        <MonsterCombatDialog
          gameState={attackScreenNoCards}
          onRoll={mockRoll}
          onClose={mockClose}
          onCancel={mockCancel}
          isMyTurn={true}
          localPlayerId={0}
        />
      );

      expect(screen.getByText('Bear')).toBeInTheDocument();
      expect(screen.getByText(/Power: 2 \(2 Dice\)/i)).toBeInTheDocument();
    });

    it('hides tactical card block when no cards available', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();
      const mockCancel = jest.fn();

      render(
        <MonsterCombatDialog
          gameState={attackScreenNoCards}
          onRoll={mockRoll}
          onClose={mockClose}
          onCancel={mockCancel}
          isMyTurn={true}
          localPlayerId={0}
        />
      );

      expect(screen.queryByText(/Tactical Combat Card/i)).not.toBeInTheDocument();
    });

    it('enables Attack button when monster is present', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();
      const mockCancel = jest.fn();

      render(
        <MonsterCombatDialog
          gameState={attackScreenNoCards}
          onRoll={mockRoll}
          onClose={mockClose}
          onCancel={mockCancel}
          isMyTurn={true}
          localPlayerId={0}
        />
      );

      const attackButton = screen.getByRole('button', { name: /Attack Monster!/i });
      expect(attackButton).not.toBeDisabled();
    });

    it('calls onRoll when Attack button clicked with no card selected', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();
      const mockCancel = jest.fn();

      render(
        <MonsterCombatDialog
          gameState={attackScreenNoCards}
          onRoll={mockRoll}
          onClose={mockClose}
          onCancel={mockCancel}
          isMyTurn={true}
          localPlayerId={0}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /Attack Monster!/i }));

      expect(mockRoll).toHaveBeenCalledWith(
        expect.objectContaining({
          useDecideCard: false,
          decidedValue: 6,
          useOvercomeCard: false,
          useWarChief: false,
        })
      );
    });

    it('calls onClose when Cancel button clicked', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();
      const mockCancel = jest.fn();

      render(
        <MonsterCombatDialog
          gameState={attackScreenNoCards}
          onRoll={mockRoll}
          onClose={mockClose}
          onCancel={mockCancel}
          isMyTurn={true}
          localPlayerId={0}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

      expect(mockClose).toHaveBeenCalled();
      expect(mockCancel).not.toHaveBeenCalled();
    });
  });

  describe('Attack screen - all three tactical cards', () => {
    it('shows tactical card block with all three card options', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();
      const mockCancel = jest.fn();

      render(
        <MonsterCombatDialog
          gameState={attackScreenAllCards}
          onRoll={mockRoll}
          onClose={mockClose}
          onCancel={mockCancel}
          isMyTurn={true}
          localPlayerId={0}
        />
      );

      expect(screen.getByText(/Tactical Combat Card/i)).toBeInTheDocument();
      expect(screen.getByText(/Overcome/i)).toBeInTheDocument();
      expect(screen.getByText(/War Chief/i)).toBeInTheDocument();
      expect(screen.getByText(/Decide Dice Roll/i)).toBeInTheDocument();
    });

    it('selects overcome card and calls onRoll with overcome flag', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();
      const mockCancel = jest.fn();

      render(
        <MonsterCombatDialog
          gameState={attackScreenAllCards}
          onRoll={mockRoll}
          onClose={mockClose}
          onCancel={mockCancel}
          isMyTurn={true}
          localPlayerId={0}
        />
      );

      fireEvent.click(screen.getByRole('radio', { name: /Overcome/ }));
      fireEvent.click(screen.getByRole('button', { name: /Attack Monster!/i }));

      expect(mockRoll).toHaveBeenCalledWith(
        expect.objectContaining({
          useOvercomeCard: true,
          useWarChief: false,
          useDecideCard: false,
        })
      );
    });

    it('selects war chief card and calls onRoll with warchief flag', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();
      const mockCancel = jest.fn();

      render(
        <MonsterCombatDialog
          gameState={attackScreenAllCards}
          onRoll={mockRoll}
          onClose={mockClose}
          onCancel={mockCancel}
          isMyTurn={true}
          localPlayerId={0}
        />
      );

      fireEvent.click(screen.getByRole('radio', { name: /War Chief/ }));
      fireEvent.click(screen.getByRole('button', { name: /Attack Monster!/i }));

      expect(mockRoll).toHaveBeenCalledWith(
        expect.objectContaining({
          useOvercomeCard: false,
          useWarChief: true,
          useDecideCard: false,
        })
      );
    });

    it('selects decide card and calls onRoll with decide flag and decidedValue', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();
      const mockCancel = jest.fn();

      render(
        <MonsterCombatDialog
          gameState={attackScreenAllCards}
          onRoll={mockRoll}
          onClose={mockClose}
          onCancel={mockCancel}
          isMyTurn={true}
          localPlayerId={0}
        />
      );

      fireEvent.click(screen.getByRole('radio', { name: /Decide Dice Roll/ }));
      fireEvent.click(screen.getByRole('button', { name: /Attack Monster!/i }));

      expect(mockRoll).toHaveBeenCalledWith(
        expect.objectContaining({
          useOvercomeCard: false,
          useWarChief: false,
          useDecideCard: true,
          decidedValue: 6,
        })
      );
    });

    it('reveals slider when decide card is selected, starting at value 6', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();
      const mockCancel = jest.fn();

      render(
        <MonsterCombatDialog
          gameState={attackScreenAllCards}
          onRoll={mockRoll}
          onClose={mockClose}
          onCancel={mockCancel}
          isMyTurn={true}
          localPlayerId={0}
        />
      );

      fireEvent.click(screen.getByRole('radio', { name: /Decide Dice Roll/ }));

      expect(screen.getByText(/Chosen Value:/i)).toBeInTheDocument();
      expect(screen.getByText('6')).toBeInTheDocument();
    });

    it('hides slider when switching from decide card to overcome card', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();
      const mockCancel = jest.fn();

      render(
        <MonsterCombatDialog
          gameState={attackScreenAllCards}
          onRoll={mockRoll}
          onClose={mockClose}
          onCancel={mockCancel}
          isMyTurn={true}
          localPlayerId={0}
        />
      );

      fireEvent.click(screen.getByRole('radio', { name: /Decide Dice Roll/ }));
      expect(screen.getByText(/Chosen Value:/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('radio', { name: /Overcome/ }));
      expect(screen.queryByText(/Chosen Value:/i)).not.toBeInTheDocument();
    });
  });

  describe('Results screen - player wins', () => {
    it('renders results screen with battle outcome title', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();
      const mockCancel = jest.fn();

      render(
        <MonsterCombatDialog
          gameState={resultsPlayerWins}
          onRoll={mockRoll}
          onClose={mockClose}
          onCancel={mockCancel}
          isMyTurn={true}
          localPlayerId={0}
        />
      );

      expect(screen.getByText(/Battle Outcome/i)).toBeInTheDocument();
    });

    it('displays attacker and monster names', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();
      const mockCancel = jest.fn();

      render(
        <MonsterCombatDialog
          gameState={resultsPlayerWins}
          onRoll={mockRoll}
          onClose={mockClose}
          onCancel={mockCancel}
          isMyTurn={true}
          localPlayerId={0}
        />
      );

      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bear')).toBeInTheDocument();
    });

    it('displays both attacker and monster dice rolls and totals', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();
      const mockCancel = jest.fn();

      render(
        <MonsterCombatDialog
          gameState={resultsPlayerWins}
          onRoll={mockRoll}
          onClose={mockClose}
          onCancel={mockCancel}
          isMyTurn={true}
          localPlayerId={0}
        />
      );

      expect(screen.getByText(/Total: 12/i)).toBeInTheDocument();
      expect(screen.getByText(/Total: 5/i)).toBeInTheDocument();
    });

    it('shows victory outcome message when player wins', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();
      const mockCancel = jest.fn();

      render(
        <MonsterCombatDialog
          gameState={resultsPlayerWins}
          onRoll={mockRoll}
          onClose={mockClose}
          onCancel={mockCancel}
          isMyTurn={true}
          localPlayerId={0}
        />
      );

      expect(screen.getByText(/Alice Defeated the Monster!/i)).toBeInTheDocument();
    });

    it('calls onClose when Continue button clicked', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();
      const mockCancel = jest.fn();

      render(
        <MonsterCombatDialog
          gameState={resultsPlayerWins}
          onRoll={mockRoll}
          onClose={mockClose}
          onCancel={mockCancel}
          isMyTurn={true}
          localPlayerId={0}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe('Results screen - monster wins', () => {
    it('shows monster victory outcome message', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();
      const mockCancel = jest.fn();

      render(
        <MonsterCombatDialog
          gameState={resultsMonsterWins}
          onRoll={mockRoll}
          onClose={mockClose}
          onCancel={mockCancel}
          isMyTurn={true}
          localPlayerId={0}
        />
      );

      expect(screen.getByText(/The Monster prevailed!/i)).toBeInTheDocument();
    });

    it('displays attacker and monster dice rolls and totals when monster wins', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();
      const mockCancel = jest.fn();

      render(
        <MonsterCombatDialog
          gameState={resultsMonsterWins}
          onRoll={mockRoll}
          onClose={mockClose}
          onCancel={mockCancel}
          isMyTurn={true}
          localPlayerId={0}
        />
      );

      expect(screen.getByText(/Total: 5/i)).toBeInTheDocument();
      expect(screen.getByText(/Total: 12/i)).toBeInTheDocument();
    });

    it('calls onClose when Continue button clicked after monster win', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();
      const mockCancel = jest.fn();

      render(
        <MonsterCombatDialog
          gameState={resultsMonsterWins}
          onRoll={mockRoll}
          onClose={mockClose}
          onCancel={mockCancel}
          isMyTurn={true}
          localPlayerId={0}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe('Spectator screen', () => {
    it('renders spectator screen when non-attacker during rolling phase', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();
      const mockCancel = jest.fn();

      render(
        <MonsterCombatDialog
          gameState={spectatorWaiting}
          onRoll={mockRoll}
          onClose={mockClose}
          onCancel={mockCancel}
          isMyTurn={false}
          localPlayerId={1}
        />
      );

      expect(screen.getByText(/Waiting for combat resolution/i)).toBeInTheDocument();
    });

    it('displays attacker name on spectator screen', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();
      const mockCancel = jest.fn();

      render(
        <MonsterCombatDialog
          gameState={spectatorWaiting}
          onRoll={mockRoll}
          onClose={mockClose}
          onCancel={mockCancel}
          isMyTurn={false}
          localPlayerId={1}
        />
      );

      expect(screen.getByText(/Alice is preparing to fight/i)).toBeInTheDocument();
    });

    it('displays monster label with name and level on spectator screen', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();
      const mockCancel = jest.fn();

      render(
        <MonsterCombatDialog
          gameState={spectatorWaiting}
          onRoll={mockRoll}
          onClose={mockClose}
          onCancel={mockCancel}
          isMyTurn={false}
          localPlayerId={1}
        />
      );

      expect(screen.getByText(/Bear \(Lvl 2\)/i)).toBeInTheDocument();
    });

    it('has no interactive buttons on spectator screen', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();
      const mockCancel = jest.fn();

      render(
        <MonsterCombatDialog
          gameState={spectatorWaiting}
          onRoll={mockRoll}
          onClose={mockClose}
          onCancel={mockCancel}
          isMyTurn={false}
          localPlayerId={1}
        />
      );

      expect(screen.queryByRole('button', { name: /Attack Monster!/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Continue/i })).not.toBeInTheDocument();
    });
  });

  describe('No monsterCombatState', () => {
    it('renders nothing when there is no monsterCombatState', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();
      const mockCancel = jest.fn();

      const gameStateNoMonster = {
        ...attackScreenNoCards,
        monsterCombatState: null,
      };

      const { container } = render(
        <MonsterCombatDialog
          gameState={gameStateNoMonster}
          onRoll={mockRoll}
          onClose={mockClose}
          onCancel={mockCancel}
          isMyTurn={true}
          localPlayerId={0}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('isAttacker determination', () => {
    it('shows attack screen when localPlayerId matches attackerId', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();
      const mockCancel = jest.fn();

      render(
        <MonsterCombatDialog
          gameState={attackScreenNoCards}
          onRoll={mockRoll}
          onClose={mockClose}
          onCancel={mockCancel}
          isMyTurn={true}
          localPlayerId={0}
        />
      );

      expect(screen.getByRole('button', { name: /Attack Monster!/i })).toBeInTheDocument();
    });

    it('shows spectator screen when localPlayerId does not match attackerId', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();
      const mockCancel = jest.fn();

      render(
        <MonsterCombatDialog
          gameState={attackScreenNoCards}
          onRoll={mockRoll}
          onClose={mockClose}
          onCancel={mockCancel}
          isMyTurn={true}
          localPlayerId={1}
        />
      );

      expect(screen.getByText(/Waiting for combat resolution/i)).toBeInTheDocument();
    });

    it('falls back to isMyTurn when localPlayerId is undefined', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();
      const mockCancel = jest.fn();

      render(
        <MonsterCombatDialog
          gameState={attackScreenNoCards}
          onRoll={mockRoll}
          onClose={mockClose}
          onCancel={mockCancel}
          isMyTurn={true}
          localPlayerId={undefined}
        />
      );

      expect(screen.getByRole('button', { name: /Attack Monster!/i })).toBeInTheDocument();
    });

    it('shows spectator screen when isMyTurn is false and localPlayerId is undefined', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();
      const mockCancel = jest.fn();

      render(
        <MonsterCombatDialog
          gameState={attackScreenNoCards}
          onRoll={mockRoll}
          onClose={mockClose}
          onCancel={mockCancel}
          isMyTurn={false}
          localPlayerId={undefined}
        />
      );

      expect(screen.getByText(/Waiting for combat resolution/i)).toBeInTheDocument();
    });
  });

  describe('Results screen priority', () => {
    it('shows results screen even when isAttacker is true', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();
      const mockCancel = jest.fn();

      render(
        <MonsterCombatDialog
          gameState={resultsPlayerWins}
          onRoll={mockRoll}
          onClose={mockClose}
          onCancel={mockCancel}
          isMyTurn={true}
          localPlayerId={0}
        />
      );

      expect(screen.getByText(/Battle Outcome/i)).toBeInTheDocument();
    });

    it('shows results screen even when isAttacker is false (spectator sees results)', () => {
      const mockRoll = jest.fn();
      const mockClose = jest.fn();
      const mockCancel = jest.fn();

      render(
        <MonsterCombatDialog
          gameState={resultsPlayerWins}
          onRoll={mockRoll}
          onClose={mockClose}
          onCancel={mockCancel}
          isMyTurn={false}
          localPlayerId={1}
        />
      );

      expect(screen.getByText(/Battle Outcome/i)).toBeInTheDocument();
    });
  });
});
