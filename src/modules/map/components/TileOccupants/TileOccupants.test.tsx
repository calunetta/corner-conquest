import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TileOccupantsView } from './TileOccupants';
import { useTileOccupants } from './TileOccupants.hook';
import { TileBoatsView } from '../TileBoats/TileBoats';
import { toTileBoatsViewModel } from '../TileBoats/TileBoats.map';
import { renderHook } from '@testing-library/react';
import { ResourceType, IslandType, type Island, type Player } from '@/lib/types';

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    const { alt, ...imageProps } = props;
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...imageProps} alt={String(alt)} />;
  },
}));

// Mock useGameBoard
jest.mock('@/modules/game-board', () => ({
  useGameBoard: jest.fn(),
  useResourceGainEvents: jest.fn().mockReturnValue([]),
}));

import { useGameBoard } from '@/modules/game-board';

describe('TileOccupants Component', () => {
  const basePlayer = {
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
    revealedTiles: ['1-1'],
  };

  const baseGameState: Record<string, unknown> = {
    players: [basePlayer],
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

  beforeEach(() => {
    (useGameBoard as jest.Mock).mockReturnValue({
      gameState: baseGameState,
      localPlayer: basePlayer,
    });
  });

  it('renders soldier sprite for unpositioned army on tile', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [{ type: ResourceType.Food, amount: 1 }],
      occupants: [{ playerId: 0, armyId: 1 }],
      positionedBy: [],
    };

    const { result } = renderHook(() => useTileOccupants({ island }));
    render(<TileOccupantsView occupants={result.current.occupants} />);
    const armyImg = screen.getByAltText('blue army');
    expect(armyImg).toBeInTheDocument();
  });

  it('renders soldier sprite even when army is positioned on a resource', () => {
    const positionedPlayer = {
      ...basePlayer,
      positions: [{ armyId: 1, x: 1, y: 1, resource: ResourceType.Food }],
    };

    (useGameBoard as jest.Mock).mockReturnValue({
      gameState: {
        ...baseGameState,
        players: [positionedPlayer],
      },
      localPlayer: positionedPlayer,
    });

    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [{ type: ResourceType.Food, amount: 1 }],
      occupants: [{ playerId: 0, armyId: 1 }],
      positionedBy: [{ playerId: 0, resource: ResourceType.Food }],
    };

    const { result } = renderHook(() => useTileOccupants({ island }));
    render(<TileOccupantsView occupants={result.current.occupants} />);
    const armyImg = screen.getByAltText('blue army');
    expect(armyImg).toBeInTheDocument();
  });

  it('renders multiple armies on contested tiles', () => {
    const secondPlayer = {
      id: 1,
      playerId: 'p1',
      name: 'Player 2',
      color: 'red',
      armies: [{ id: 2, position: { x: 1, y: 1 }, hasActed: false }],
      resources: { gold: 0, wood: 0, food: 0 },
      specialCards: [],
      passiveAbilities: {},
      positions: [],
      victoryPoints: 0,
      attackPower: 0,
      actionsThisTurn: [],
      revealedTiles: ['1-1'],
    };

    const multiPlayerState = {
      ...baseGameState,
      players: [basePlayer, secondPlayer],
    };

    (useGameBoard as jest.Mock).mockReturnValue({
      gameState: multiPlayerState,
      localPlayer: basePlayer,
    });

    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [],
      occupants: [
        { playerId: 0, armyId: 1 },
        { playerId: 1, armyId: 2 },
      ],
      positionedBy: [],
    };

    const { result } = renderHook(() => useTileOccupants({ island }));
    render(<TileOccupantsView occupants={result.current.occupants} />);
    const armies = screen.getAllByAltText(/army/);
    expect(armies).toHaveLength(2);
  });

  it('returns empty array when no occupants on island', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [],
      occupants: [],
      positionedBy: [],
    };

    const { result } = renderHook(() => useTileOccupants({ island }));
    expect(result.current.occupants).toHaveLength(0);
  });

  describe('rider and boat composition', () => {
    // Anchor (corner + centering transform) of a positioned element, read from its inline style.
    const anchorOf = (element: HTMLElement) => ({
      top: element.style.top,
      bottom: element.style.bottom,
      left: element.style.left,
      right: element.style.right,
      transform: element.style.transform,
    });

    function renderBoatsAndRiders(armyCount: number) {
      const armies = Array.from({ length: armyCount }, (_, i) => ({
        id: i + 1,
        position: { x: 1, y: 1 },
        hasActed: false,
      }));
      const player = { ...basePlayer, armies } as unknown as Player;
      const island: Island = {
        id: '1-1',
        x: 1,
        y: 1,
        type: IslandType.Resource,
        resources: [],
        occupants: armies.map((army) => ({ playerId: 0, armyId: army.id })),
        positionedBy: [],
      };
      (useGameBoard as jest.Mock).mockReturnValue({
        gameState: { ...baseGameState, players: [player] },
        localPlayer: player,
      });

      const boats = toTileBoatsViewModel(island, [player], player, false, false);
      const { result } = renderHook(() => useTileOccupants({ island }));
      render(
        <>
          <TileBoatsView boats={boats} />
          <TileOccupantsView occupants={result.current.occupants} />
        </>,
      );
      const boatEntries = screen.getAllByTestId('docked-boat').map((hull) => hull.parentElement as HTMLElement);
      const riderSlots = screen
        .getAllByAltText('blue army')
        .map((img) => img.parentElement as HTMLElement);
      return { boatEntries, riderSlots };
    }

    // Literal rider anchors per corner, in boat order (br, tr, tl, bl). Each rider is inset 24%
    // from the two tile edges of its corner and has no transform, unlike its boat (centered on the corner).
    const RIDER_ANCHOR_BR = { top: '', bottom: '24%', left: '', right: '24%', transform: '' };
    const RIDER_ANCHOR_TR = { top: '24%', bottom: '', left: '', right: '24%', transform: '' };
    const RIDER_ANCHOR_TL = { top: '24%', bottom: '', left: '24%', right: '', transform: '' };
    const RIDER_ANCHOR_BL = { top: '', bottom: '24%', left: '24%', right: '', transform: '' };

    it('places a single rider beside its boat on land, not centered on the boat', () => {
      const { boatEntries, riderSlots } = renderBoatsAndRiders(1);

      expect(boatEntries[0]).toHaveStyle({ bottom: '0', right: '0', transform: 'translate(50%, 50%)' });
      expect(anchorOf(riderSlots[0])).toEqual(RIDER_ANCHOR_BR);
      expect(anchorOf(riderSlots[0])).not.toEqual(anchorOf(boatEntries[0]));
    });

    it('places each of four riders at its own corner offset, never sharing its boat anchor', () => {
      const { boatEntries, riderSlots } = renderBoatsAndRiders(4);

      expect(riderSlots).toHaveLength(4);
      expect(anchorOf(riderSlots[0])).toEqual(RIDER_ANCHOR_BR);
      expect(anchorOf(riderSlots[1])).toEqual(RIDER_ANCHOR_TR);
      expect(anchorOf(riderSlots[2])).toEqual(RIDER_ANCHOR_TL);
      expect(anchorOf(riderSlots[3])).toEqual(RIDER_ANCHOR_BL);
      riderSlots.forEach((slot, index) => {
        expect(anchorOf(slot)).not.toEqual(anchorOf(boatEntries[index]));
      });
    });

    it('wraps a fifth rider onto the first corner offset, not onto its boat anchor', () => {
      const { boatEntries, riderSlots } = renderBoatsAndRiders(5);

      expect(riderSlots).toHaveLength(5);
      expect(anchorOf(riderSlots[4])).toEqual(RIDER_ANCHOR_BR);
      expect(anchorOf(riderSlots[4])).toEqual(anchorOf(riderSlots[0]));
      expect(anchorOf(riderSlots[4])).not.toEqual(anchorOf(boatEntries[4]));
    });
  });
});
