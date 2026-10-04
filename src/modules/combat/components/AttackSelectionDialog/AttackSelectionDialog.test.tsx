import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AttackSelectionDialog } from './AttackSelectionDialog';
import { allReadyState, mixedStatusState, notMyTurnState } from './AttackSelectionDialog.fixtures';

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    const rest = { ...props };
    delete rest.unoptimized;
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    return <img {...rest} />;
  },
}));

describe('AttackSelectionDialog view', () => {
  it('renders nothing when state is null', () => {
    const { container } = render(
      <AttackSelectionDialog state={null} onSelectTarget={jest.fn()} onClose={jest.fn()} isMyTurn={true} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('names the defending player and renders one button per enemy army', () => {
    render(<AttackSelectionDialog state={allReadyState} onSelectTarget={jest.fn()} onClose={jest.fn()} isMyTurn={true} />);

    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Enemy Squad 1')).toBeInTheDocument();
    expect(screen.getByText('Enemy Squad 2')).toBeInTheDocument();
    expect(screen.getByText('Enemy Squad 3')).toBeInTheDocument();
  });

  it('labels an acted, a positioned and a ready enemy squad correctly', () => {
    render(<AttackSelectionDialog state={mixedStatusState} onSelectTarget={jest.fn()} onClose={jest.fn()} isMyTurn={true} />);

    expect(screen.getByText('Acted')).toBeInTheDocument();
    expect(screen.getByText('Positioned')).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  it('enables every button, including an acted squad, when it is the player\'s turn', () => {
    const onSelectTarget = jest.fn();
    render(
      <AttackSelectionDialog state={mixedStatusState} onSelectTarget={onSelectTarget} onClose={jest.fn()} isMyTurn={true} />,
    );

    const actedButton = screen.getByText('Enemy Squad 1').closest('button') as HTMLButtonElement;
    expect(actedButton).toBeEnabled();
    fireEvent.click(actedButton);
    expect(onSelectTarget).toHaveBeenCalledWith(0);
  });

  it('disables every button, with no per-army exception, when it is not the player\'s turn', () => {
    const onSelectTarget = jest.fn();
    render(<AttackSelectionDialog state={notMyTurnState} onSelectTarget={onSelectTarget} onClose={jest.fn()} isMyTurn={false} />);

    const buttons = screen.getAllByRole('button', { name: /Enemy Squad/ });
    buttons.forEach((button) => expect(button).toBeDisabled());
    fireEvent.click(buttons[0]);
    expect(onSelectTarget).not.toHaveBeenCalled();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = jest.fn();
    render(<AttackSelectionDialog state={allReadyState} onSelectTarget={jest.fn()} onClose={onClose} isMyTurn={true} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
