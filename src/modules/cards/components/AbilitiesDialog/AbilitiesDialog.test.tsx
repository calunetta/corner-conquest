import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AbilitiesDialog } from './AbilitiesDialog';
import { AbilityName } from '@/lib/types';
import {
  gameStateWithAffordableAbilities,
  playerWhoCanAffordAbilities,
  playerWithExplorerAndNoGold,
} from './AbilitiesDialog.fixtures';

const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }));

describe('AbilitiesDialog', () => {
  beforeEach(() => {
    mockToast.mockClear();
  });

  it('shows the Active badge, not a Buy button, for an ability the player already owns', () => {
    render(
      <AbilitiesDialog
        player={playerWithExplorerAndNoGold}
        onClose={jest.fn()}
        onBuyAbility={jest.fn()}
        gameState={gameStateWithAffordableAbilities}
        isMyTurn={true}
      />,
    );

    expect(screen.getByText('Active')).toBeInTheDocument();
    // Only Collector (not owned) shows a Buy button; Explorer (owned) shows none.
    expect(screen.getAllByRole('button', { name: /buy \(10 gold\)/i })).toHaveLength(1);
  });

  it('hides the Buy button entirely when it is not the player\'s turn, even without the ability', () => {
    render(
      <AbilitiesDialog
        player={playerWhoCanAffordAbilities}
        onClose={jest.fn()}
        onBuyAbility={jest.fn()}
        gameState={gameStateWithAffordableAbilities}
        isMyTurn={false}
      />,
    );

    expect(screen.queryByRole('button', { name: /buy/i })).not.toBeInTheDocument();
  });

  it('disables the Buy button when the player cannot afford the cost', () => {
    render(
      <AbilitiesDialog
        player={playerWithExplorerAndNoGold}
        onClose={jest.fn()}
        onBuyAbility={jest.fn()}
        gameState={gameStateWithAffordableAbilities}
        isMyTurn={true}
      />,
    );

    expect(screen.getByRole('button', { name: /buy \(10 gold\)/i })).toBeDisabled();
  });

  it('enables the Buy button and calls onBuyAbility, showing a success toast', () => {
    const onBuyAbility = jest.fn();
    render(
      <AbilitiesDialog
        player={playerWhoCanAffordAbilities}
        onClose={jest.fn()}
        onBuyAbility={onBuyAbility}
        gameState={gameStateWithAffordableAbilities}
        isMyTurn={true}
      />,
    );

    const buyButtons = screen.getAllByRole('button', { name: /buy \(10 gold\)/i });
    expect(buyButtons[0]).not.toBeDisabled();
    fireEvent.click(buyButtons[0]);

    expect(onBuyAbility).toHaveBeenCalledWith(AbilityName.Explorer);
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Purchase Successful!' }));
  });

  it('shows a destructive toast with the thrown message when onBuyAbility throws', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const onBuyAbility = jest.fn(() => {
      throw new Error('Not enough gold');
    });
    render(
      <AbilitiesDialog
        player={playerWhoCanAffordAbilities}
        onClose={jest.fn()}
        onBuyAbility={onBuyAbility}
        gameState={gameStateWithAffordableAbilities}
        isMyTurn={true}
      />,
    );

    fireEvent.click(screen.getAllByRole('button', { name: /buy \(10 gold\)/i })[0]);

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Purchase Failed',
        description: 'Not enough gold',
        variant: 'destructive',
      }),
    );
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('calls onClose when Close is clicked', () => {
    const onClose = jest.fn();
    render(
      <AbilitiesDialog
        player={playerWhoCanAffordAbilities}
        onClose={onClose}
        onBuyAbility={jest.fn()}
        gameState={gameStateWithAffordableAbilities}
        isMyTurn={true}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /close/i }));

    expect(onClose).toHaveBeenCalled();
  });

  it('only renders abilities listed in gameState.settings.availableAbilities', () => {
    const restrictedGameState = {
      ...gameStateWithAffordableAbilities,
      settings: {
        ...gameStateWithAffordableAbilities.settings,
        availableAbilities: [AbilityName.Explorer],
      },
    };

    render(
      <AbilitiesDialog
        player={playerWhoCanAffordAbilities}
        onClose={jest.fn()}
        onBuyAbility={jest.fn()}
        gameState={restrictedGameState}
        isMyTurn={true}
      />,
    );

    expect(screen.getByText('Explorer')).toBeInTheDocument();
    expect(screen.queryByText('Collector')).not.toBeInTheDocument();
  });
});
