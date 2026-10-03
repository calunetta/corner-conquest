import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { WealthyDialog } from '../WealthyDialog';
import { StealResourceDialog } from '../StealResourceDialog';
import { ResourceType } from '@/lib/types';

describe('Resource Dialogs Display & Sprites', () => {
  it('WealthyDialog renders Food, Wood, Gold with correct sprites', () => {
    const mockSelect = jest.fn();
    const mockClose = jest.fn();

    render(<WealthyDialog onSelectResource={mockSelect} onClose={mockClose} />);

    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Wood')).toBeInTheDocument();
    expect(screen.getByText('Gold')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('wealthy-resource-wood'));
    expect(mockSelect).toHaveBeenCalledWith(ResourceType.Wood);
  });

  it('StealResourceDialog renders opponent selection and resource stealing with proper names', () => {
    const mockSteal = jest.fn();
    const mockClose = jest.fn();

    const players: any[] = [
      {
        id: 1,
        playerId: 'p1',
        name: 'Opponent 1',
        color: 'red',
        armies: [],
        resources: { gold: 5, wood: 2, food: 3 },
        specialCards: [],
        passiveAbilities: {},
        positions: [],
        victoryPoints: 2,
        attackPower: 1,
        actionsThisTurn: [],
        revealedTiles: [],
      },
    ];

    render(<StealResourceDialog players={players} onSteal={mockSteal} onClose={mockClose} />);

    // Select opponent
    fireEvent.click(screen.getByTestId('steal-target-player-1'));

    // Verify resources display
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Wood')).toBeInTheDocument();
    expect(screen.getByText('Gold')).toBeInTheDocument();

    // Click Gold
    fireEvent.click(screen.getByTestId('steal-resource-gold'));
    expect(screen.getByText('Steal 2 Gold')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Steal 2 Gold'));
    expect(mockSteal).toHaveBeenCalledWith(1, ResourceType.Gold);
  });
});
