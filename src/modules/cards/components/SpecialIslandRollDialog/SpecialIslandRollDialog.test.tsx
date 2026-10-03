import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SpecialIslandRollDialog } from './SpecialIslandRollDialog';
import { CardName } from '@/lib/types';
import { notRolledState, rolledWithCardState, rolledWithoutCardState } from './SpecialIslandRollDialog.fixtures';

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    const rest = { ...props };
    delete rest.unoptimized;
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    return <img {...rest} />;
  },
}));

describe('SpecialIslandRollDialog', () => {
  it('renders null when state is null', () => {
    const { container } = render(<SpecialIslandRollDialog state={null} onRoll={jest.fn()} onClose={jest.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the Roll button and not the Close button before rolling', () => {
    render(<SpecialIslandRollDialog state={notRolledState} onRoll={jest.fn()} onClose={jest.fn()} />);

    expect(screen.getByRole('button', { name: /roll for treasure/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^close$/i })).not.toBeInTheDocument();
  });

  it('calls onRoll when the Roll button is clicked', () => {
    const onRoll = jest.fn();
    render(<SpecialIslandRollDialog state={notRolledState} onRoll={onRoll} onClose={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /roll for treasure/i }));

    expect(onRoll).toHaveBeenCalled();
  });

  it('shows the card name, description and "Treasure Unlocked" banner when a card was drawn', () => {
    render(<SpecialIslandRollDialog state={rolledWithCardState} onRoll={jest.fn()} onClose={jest.fn()} />);

    expect(screen.getByText('Treasure Unlocked!')).toBeInTheDocument();
    expect(screen.getByText(CardName.Wealthy)).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('"Gain 5 resources of your choice."')).toBeInTheDocument();
  });

  it('shows the "No Treasure" banner when no card was drawn after rolling', () => {
    render(<SpecialIslandRollDialog state={rolledWithoutCardState} onRoll={jest.fn()} onClose={jest.fn()} />);

    expect(screen.getByText('No Treasure This Time')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows the Close button, not the Roll button, once rolled', () => {
    render(<SpecialIslandRollDialog state={rolledWithoutCardState} onRoll={jest.fn()} onClose={jest.fn()} />);

    expect(screen.getByRole('button', { name: /^close$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /roll for treasure/i })).not.toBeInTheDocument();
  });

  it('calls onClose when Close is clicked', () => {
    const onClose = jest.fn();
    render(<SpecialIslandRollDialog state={rolledWithoutCardState} onRoll={jest.fn()} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /^close$/i }));

    expect(onClose).toHaveBeenCalled();
  });
});
