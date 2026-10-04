import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MonsterSelectionDialog } from './MonsterSelectionDialog';
import { singleMonsterState, multipleMonstersState, notMyTurnState } from './MonsterSelectionDialog.fixtures';

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    const rest = { ...props };
    delete rest.unoptimized;
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    return <img {...rest} />;
  },
}));

describe('MonsterSelectionDialog view', () => {
  it('renders nothing when state is null', () => {
    const { container } = render(
      <MonsterSelectionDialog state={null} onSelectTarget={jest.fn()} onClose={jest.fn()} isMyTurn={true} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a button per monster with its name, level and power label', () => {
    render(<MonsterSelectionDialog state={multipleMonstersState} onSelectTarget={jest.fn()} onClose={jest.fn()} isMyTurn={true} />);

    expect(screen.getByText('Lancer (Lvl 1)')).toBeInTheDocument();
    expect(screen.getByText('Ogre (Lvl 3)')).toBeInTheDocument();
    expect(screen.getByText('Minotaur (Lvl 4)')).toBeInTheDocument();
    expect(screen.getByText('Power: 1 Dice')).toBeInTheDocument();
    expect(screen.getByText('Power: 3 Dice')).toBeInTheDocument();
    expect(screen.getByText('Power: 4 Dice')).toBeInTheDocument();
  });

  it('calls onSelectTarget with the monster name when it is the player\'s turn', () => {
    const onSelectTarget = jest.fn();
    render(<MonsterSelectionDialog state={singleMonsterState} onSelectTarget={onSelectTarget} onClose={jest.fn()} isMyTurn={true} />);

    fireEvent.click(screen.getByText('Lancer (Lvl 1)').closest('button') as HTMLButtonElement);
    expect(onSelectTarget).toHaveBeenCalledWith('Lancer');
  });

  it('disables every button, and clicking does nothing, when it is not the player\'s turn', () => {
    const onSelectTarget = jest.fn();
    render(<MonsterSelectionDialog state={notMyTurnState} onSelectTarget={onSelectTarget} onClose={jest.fn()} isMyTurn={false} />);

    const buttons = screen.getAllByRole('button').filter((button) => button.textContent !== 'Cancel');
    buttons.forEach((button) => expect(button).toBeDisabled());
    fireEvent.click(buttons[0]);
    expect(onSelectTarget).not.toHaveBeenCalled();
  });

  it('renders only the Cancel button when there are no monsters', () => {
    render(
      <MonsterSelectionDialog
        state={{ monsters: [], attackingArmyId: 0 }}
        onSelectTarget={jest.fn()}
        onClose={jest.fn()}
        isMyTurn={true}
      />,
    );
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = jest.fn();
    render(<MonsterSelectionDialog state={singleMonsterState} onSelectTarget={jest.fn()} onClose={onClose} isMyTurn={true} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
