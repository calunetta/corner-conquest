import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductiveCardDialog } from '../ProductiveCardDialog';
import { WealthyDialog } from '../WealthyDialog';
import { StealResourceDialog } from '../StealResourceDialog';
import { ResourceType, type ProductiveCardDialogState } from '@/lib/types';

describe('Resource Dialogs Display & Sprites', () => {
  it('ProductiveCardDialog renders animated sprites and displays Food, Wood, Gold', () => {
    const mockConfirm = jest.fn();
    const state: ProductiveCardDialogState = {
      isOpen: true,
      options: [
        { resource: ResourceType.Food, amount: 2 },
        { resource: ResourceType.Wood, amount: 1 },
        { resource: ResourceType.Gold, amount: 3 },
      ],
    };

    render(<ProductiveCardDialog state={state} onConfirm={mockConfirm} />);

    // Verify Food, Wood, Gold names are present
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Wood')).toBeInTheDocument();
    expect(screen.getByText('Gold')).toBeInTheDocument();

    // Verify animated sprite images
    const foodImgs = screen.getAllByAltText('Food');
    expect(foodImgs.some(img => img.getAttribute('src') === '/sprites/sheep.gif')).toBe(true);

    const woodImgs = screen.getAllByAltText('Wood');
    expect(woodImgs.some(img => img.getAttribute('src') === '/sprites/tree.gif')).toBe(true);

    const goldImgs = screen.getAllByAltText('Gold');
    expect(goldImgs.some(img => img.getAttribute('src') === '/sprites/gold.gif')).toBe(true);

    // Select Food option
    fireEvent.click(screen.getByTestId('productive-option-food'));
    expect(screen.getByText('Double Food Harvest')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Double Food Harvest'));
    expect(mockConfirm).toHaveBeenCalledWith(ResourceType.Food);
  });

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
