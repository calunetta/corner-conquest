/**
 * Shared test utilities for GameBoardContext tests.
 *
 * Jest mocks used by this kit (declare in each test file):
 *   jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }));
 *   jest.mock('@/lib/game-initializer', () => ({ startGame: jest.fn((state) => state) }));
 *   jest.mock('@/modules/game-rules', () => ({
 *     getPossibleMoves: jest.fn(() => []),
 *     handleGameAction: jest.fn(({ gameState }) => ({ state: gameState })),
 *     handlePlayerExit: jest.fn().mockResolvedValue(undefined),
 *   }));
 *   jest.mock('@/lib/turn-progression', () => ({ hasPlayerRemainingActions: jest.fn(() => true) }));
 */
import React, { useRef } from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { GameAction, IslandType, PlayerColor, type GameState, type Player, type Island } from '@/lib/types';
import { GameBoardProvider, useGameBoard, type GameBoardContextType } from '../../GameBoardContext';

const GRID_COLS = 5;

// Stable mockToast instance shared across tests (not re-created per render like in the old file)
export const mockToast = jest.fn();

export function buildPlayer(overrides: Partial<Player> & { id: number; playerId: string }): Player {
  return {
    name: `Player ${overrides.id}`,
    color: PlayerColor.Blue,
    isBot: false,
    armies: [],
    resources: { wheat: 0, iron: 0, gems: 0 },
    armyCount: 1,
    attackPower: 0,
    nextArmyCost: 6,
    victoryPoints: 0,
    specialCards: [],
    positions: [],
    hasExtraMove: false,
    actionsThisTurn: [],
    passiveAbilities: {},
    isSabotaged: false,
    reinforceActive: false,
    efficientActive: false,
    masterBuilderActive: false,
    revealedTiles: [],
    ...overrides,
  } as Player;
}

/**
 * Build a test game state with optional tile overrides.
 * Use withTile(gameState, x, y, patch) to override individual tiles.
 */
export function buildGameState(overrides: Partial<GameState> = {}): GameState {
  const players = overrides.players ?? [buildPlayer({ id: 0, playerId: 'p0' })];
  const map = Array.from({ length: GRID_COLS * GRID_COLS }, (_, i) => ({
    id: `${i % GRID_COLS}-${Math.floor(i / GRID_COLS)}`,
    x: i % GRID_COLS,
    y: Math.floor(i / GRID_COLS),
    type: IslandType.Empty,
    resources: [],
    occupants: [],
  }));

  return {
    id: 'game_test',
    name: 'Test Game',
    status: 'playing',
    players,
    map,
    baseTiles: [],
    currentPlayerIndex: 0,
    turn: 1,
    log: [],
    discardPile: [],
    specialCardsDeck: [],
    settings: { gridSize: { rows: GRID_COLS, cols: GRID_COLS }, victoryPointGoal: 30 },
    deathAnimations: [],
    winner: null,
    combatState: null,
    monsterCombatState: null,
    ...overrides,
  } as unknown as GameState;
}

/**
 * Override a tile in a game state. Returns a new GameState with the tile updated.
 */
export function withTile(
  gameState: GameState,
  x: number,
  y: number,
  patch: Partial<Island>
): GameState {
  const index = y * gameState.settings.gridSize.cols + x;
  const newMap = [...gameState.map];
  newMap[index] = { ...newMap[index], ...patch };
  return { ...gameState, map: newMap };
}

/**
 * Captures the latest useGameBoard() hook result so tests can assert on handlers and context values.
 */
const contextCapture = { current: null as GameBoardContextType | null };

function ContextSpy() {
  const context = useGameBoard();
  contextCapture.current = context;
  return null;
}

interface RenderProviderResult extends RenderResult {
  getContext: () => GameBoardContextType;
}

export function renderProvider(
  gameState: GameState,
  overrides: Partial<Parameters<typeof GameBoardProvider>[0]> = {}
): RenderProviderResult {
  contextCapture.current = null;

  const localPlayer = gameState.players[0];
  const result = render(
    <GameBoardProvider
      gameId="game_test"
      playerId={localPlayer.playerId}
      serverGameState={gameState}
      localPlayerFromServer={localPlayer}
      isMyTurn
      isHost
      setGameState={jest.fn().mockResolvedValue(undefined)}
      onExit={jest.fn()}
      {...overrides}
    >
      <ContextSpy />
    </GameBoardProvider>
  );

  return {
    ...result,
    getContext: () => {
      if (!contextCapture.current) {
        throw new Error('Context not captured; ensure provider rendered and spy mounted');
      }
      return contextCapture.current;
    },
  };
}
