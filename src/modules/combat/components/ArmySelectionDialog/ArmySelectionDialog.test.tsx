import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ArmySelectionDialog } from './ArmySelectionDialog';
import {
  allReadyState,
  allReadyPlayer,
  mixedStatusState,
  mixedStatusPlayer,
  oneSelectedState,
  oneSelectedPlayer,
  oneSelectedArmyId,
  notMyTurnState,
  notMyTurnPlayer,
} from './ArmySelectionDialog.fixtures';

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    const rest = { ...props };
    delete rest.unoptimized;
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    return <img {...rest} />;
  },
}));

describe('ArmySelectionDialog view', () => {
  it('renders nothing when state is null', () => {
    const { container } = render(
      <ArmySelectionDialog state={null} player={allReadyPlayer} onSelectArmy={jest.fn()} onClose={jest.fn()} isMyTurn={true} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the tile coordinates and one button per army', () => {
    render(
      <ArmySelectionDialog
        state={allReadyState}
        player={allReadyPlayer}
        onSelectArmy={jest.fn()}
        onClose={jest.fn()}
        isMyTurn={true}
      />,
    );

    expect(screen.getByText('Select Army Squad (2, 3)')).toBeInTheDocument();
    expect(screen.getByText('Squad 1')).toBeInTheDocument();
    expect(screen.getByText('Squad 2')).toBeInTheDocument();
    expect(screen.getByText('Squad 3')).toBeInTheDocument();
  });

  it('labels an acted, a positioned and a ready squad correctly', () => {
    render(
      <ArmySelectionDialog
        state={mixedStatusState}
        player={mixedStatusPlayer}
        onSelectArmy={jest.fn()}
        onClose={jest.fn()}
        isMyTurn={true}
      />,
    );

    expect(screen.getByText('Acted')).toBeInTheDocument();
    expect(screen.getByText('Positioned')).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  it('disables the acted squad (no extra move) and does not call onSelectArmy when clicked', () => {
    const onSelectArmy = jest.fn();
    render(
      <ArmySelectionDialog
        state={mixedStatusState}
        player={mixedStatusPlayer}
        onSelectArmy={onSelectArmy}
        onClose={jest.fn()}
        isMyTurn={true}
      />,
    );

    const actedButton = screen.getByText('Squad 1').closest('button') as HTMLButtonElement;
    expect(actedButton).toBeDisabled();
    fireEvent.click(actedButton);
    expect(onSelectArmy).not.toHaveBeenCalled();
  });

  it('calls onSelectArmy with the army id when a ready squad is clicked', () => {
    const onSelectArmy = jest.fn();
    render(
      <ArmySelectionDialog
        state={mixedStatusState}
        player={mixedStatusPlayer}
        onSelectArmy={onSelectArmy}
        onClose={jest.fn()}
        isMyTurn={true}
      />,
    );

    const readyButton = screen.getByText('Squad 3').closest('button') as HTMLButtonElement;
    expect(readyButton).toBeEnabled();
    fireEvent.click(readyButton);
    expect(onSelectArmy).toHaveBeenCalledWith(2);
  });

  it('disables every button when it is not the player\'s turn', () => {
    render(
      <ArmySelectionDialog
        state={notMyTurnState}
        player={notMyTurnPlayer}
        onSelectArmy={jest.fn()}
        onClose={jest.fn()}
        isMyTurn={false}
      />,
    );
    screen.getAllByRole('button', { name: /Squad/ }).forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it('shows an ACTIVE badge only on the currently selected army', () => {
    render(
      <ArmySelectionDialog
        state={oneSelectedState}
        player={oneSelectedPlayer}
        onSelectArmy={jest.fn()}
        onClose={jest.fn()}
        isMyTurn={true}
        selectedArmyId={oneSelectedArmyId}
      />,
    );
    expect(screen.getAllByText('ACTIVE')).toHaveLength(1);
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = jest.fn();
    render(
      <ArmySelectionDialog
        state={allReadyState}
        player={allReadyPlayer}
        onSelectArmy={jest.fn()}
        onClose={onClose}
        isMyTurn={true}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
