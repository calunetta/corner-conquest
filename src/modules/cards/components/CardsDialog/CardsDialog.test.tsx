import React from 'react';
import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { CardsDialog } from './CardsDialog';
import { CardName, GameAction } from '@/lib/types';
import {
  playerWithNoCards,
  playerWithSeveralCards,
  playerWhoUsedACardThisTurn,
} from './CardsDialog.fixtures';

describe('CardsDialog', () => {
  it('shows the empty state when the player has no special cards', () => {
    render(<CardsDialog player={playerWithNoCards} onClose={jest.fn()} onUseCard={jest.fn()} canUseCards={true} />);

    expect(screen.getByText('This player currently has no special cards.')).toBeInTheDocument();
  });

  it('tallies duplicate card names into one entry with a count badge', () => {
    render(
      <CardsDialog player={playerWithSeveralCards} onClose={jest.fn()} onUseCard={jest.fn()} canUseCards={true} />,
    );

    expect(screen.getAllByText(CardName.StealResource)).toHaveLength(1);
    expect(screen.getByText('x2')).toBeInTheDocument();
    expect(screen.getByText(CardName.Sabotage)).toBeInTheDocument();
    expect(screen.getByText(CardName.Overcome)).toBeInTheDocument();
  });

  it('shows a Use button only for usable cards, hidden for non-usable ones', () => {
    render(
      <CardsDialog player={playerWithSeveralCards} onClose={jest.fn()} onUseCard={jest.fn()} canUseCards={true} />,
    );

    // playerWithSeveralCards: StealResource (usable), Sabotage (usable), Overcome (not usable).
    expect(screen.getAllByRole('button', { name: /use/i })).toHaveLength(2);
  });

  it('disables the Use button when canUseCards is false', () => {
    render(
      <CardsDialog player={playerWithSeveralCards} onClose={jest.fn()} onUseCard={jest.fn()} canUseCards={false} />,
    );

    screen.getAllByRole('button', { name: /use/i }).forEach((button) => expect(button).toBeDisabled());
  });

  it('disables the Use button when the player already used a card this turn', () => {
    expect(playerWhoUsedACardThisTurn.actionsThisTurn).toContain(GameAction.UseCard);

    render(
      <CardsDialog
        player={playerWhoUsedACardThisTurn}
        onClose={jest.fn()}
        onUseCard={jest.fn()}
        canUseCards={true}
      />,
    );

    expect(screen.getByRole('button', { name: /use/i })).toBeDisabled();
  });

  it('calls onUseCard with the card name when Use is clicked', () => {
    const onUseCard = jest.fn();
    render(
      <CardsDialog player={playerWithSeveralCards} onClose={jest.fn()} onUseCard={onUseCard} canUseCards={true} />,
    );

    fireEvent.click(screen.getAllByRole('button', { name: /use/i })[0]);

    expect(onUseCard).toHaveBeenCalledWith(CardName.StealResource);
  });

  it('calls onClose when Close is clicked', () => {
    const onClose = jest.fn();
    render(<CardsDialog player={playerWithNoCards} onClose={onClose} onUseCard={jest.fn()} canUseCards={true} />);

    fireEvent.click(screen.getByRole('button', { name: /close/i }));

    expect(onClose).toHaveBeenCalled();
  });
});
