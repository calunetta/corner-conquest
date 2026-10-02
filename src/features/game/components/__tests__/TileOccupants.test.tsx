import React from 'react';
import { render, screen } from '@testing-library/react';
import { TileOccupants } from '../TileOccupants';
import { GameBoardProvider } from '../../context/GameBoardContext';
import { ResourceType, IslandType, type GameState, type Island } from '@/lib/types';

jest.mock('../../context/GameBoardContext', () => {
  const actual = jest.requireActual('../../context/GameBoardContext');
  return {
    ...actual,
    useGameBoard: jest.fn(),
  };
});

const { useGameBoard } = require('../../context/GameBoardContext');

describe('TileOccupants', () => {
  const baseGameState: any = {
    players: [
      {
        id: 0,
        playerId: 'p0',
        name: 'Player 1',
        color: 'blue',
        armies: [{ id: 1, position: { x: 1, y: 1 }, hasActed: false }],
        resources: { gold: 0, wood: 0, food: 0 },
        specialCards: [],
        passiveAbilities: {},
        positions: [],
        victoryPoints: 0,
        attackPower: 0,
        actionsThisTurn: [],
        revealedTiles: ['1,1'],
      },
    ],
    deathAnimations: [],
    debugMode: false,
    settings: {
      fogOfWar: false,
      victoryPointGoal: 10,
      upgradeCost: 5,
      abilityCost: 3,
      baseResourceAmount: 1,
      availableAbilities: [],
    },
  };

  it('renders soldier sprite for unpositioned army on tile', () => {
    useGameBoard.mockReturnValue({
      gameState: baseGameState,
      localPlayer: baseGameState.players![0],
    });

    const island: Island = {
      id: '1,1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [{ type: ResourceType.Food, amount: 1 }],
      occupants: [{ playerId: 0, armyId: 1 }],
      positionedBy: [],
    };

    render(<TileOccupants island={island} />);
    const armyImg = screen.getByAltText('blue army');
    expect(armyImg).toBeInTheDocument();
  });

  it('renders soldier sprite even when army is positioned on a resource', () => {
    const positionedPlayer = {
      ...baseGameState.players![0],
      positions: [{ armyId: 1, x: 1, y: 1, resource: ResourceType.Food }],
    };

    useGameBoard.mockReturnValue({
      gameState: {
        ...baseGameState,
        players: [positionedPlayer],
      },
      localPlayer: positionedPlayer,
    });

    const island: Island = {
      id: '1,1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [{ type: ResourceType.Food, amount: 1 }],
      occupants: [{ playerId: 0, armyId: 1 }],
      positionedBy: [{ playerId: 0, resource: ResourceType.Food }],
    };

    render(<TileOccupants island={island} />);
    const armyImg = screen.getByAltText('blue army');
    expect(armyImg).toBeInTheDocument();
  });
});
