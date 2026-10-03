import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SabotageDialog } from './SabotageDialog';
import { sabotageTargets } from './SabotageDialog.fixtures';

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    const rest = { ...props };
    delete rest.unoptimized;
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    return <img {...rest} />;
  },
}));

describe('SabotageDialog', () => {
  it('renders a button per target with their name and idle sprite', () => {
    render(<SabotageDialog players={sabotageTargets} onSabotage={jest.fn()} onClose={jest.fn()} />);

    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.getByText('Bo')).toBeInTheDocument();
    expect(screen.getByText('Cy')).toBeInTheDocument();

    expect(screen.getByRole('img', { name: 'Ada' })).toHaveAttribute('src', '/sprites/blue.gif');
    expect(screen.getByRole('img', { name: 'Bo' })).toHaveAttribute('src', '/sprites/red.gif');
  });

  it('calls onSabotage with the clicked target id', () => {
    const onSabotage = jest.fn();

    render(<SabotageDialog players={sabotageTargets} onSabotage={onSabotage} onClose={jest.fn()} />);

    fireEvent.click(screen.getByText('Bo'));

    expect(onSabotage).toHaveBeenCalledWith(1);
    expect(onSabotage).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = jest.fn();

    render(<SabotageDialog players={sabotageTargets} onSabotage={jest.fn()} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders only the Cancel button when there are no targets', () => {
    render(<SabotageDialog players={[]} onSabotage={jest.fn()} onClose={jest.fn()} />);

    expect(screen.getByText('Sabotage Opponent')).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });
});
