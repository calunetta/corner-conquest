/**
 * Characterization tests: capture GameBoardProvider's current observable behavior so a future
 * split of this file (see docs/ai/tasks/2026-10-02-gameboardcontext-migration/) can be checked
 * against them without modification. These describe behavior as it exists today, not as it ought
 * to be — do not "fix" a surprising assertion here without first confirming it against the
 * running app.
 */
import { act, render, screen } from '@testing-library/react';
import { GameAction, IslandType, PlayerColor, type GameState, type Player } from '@/lib/types';
import { GameBoardProvider, useGameBoard } from '../GameBoardContext';

jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: jest.fn() }) }));
jest.mock('@/modules/game-rules', () => ({
  startGame: jest.fn((state) => state),
  getPossibleMoves: jest.fn(() => []),
  handleGameAction: jest.fn(({ gameState }) => ({ state: gameState })),
  handlePlayerExit: jest.fn().mockResolvedValue(undefined),
}));

const GRID_COLS = 5;

function buildPlayer(overrides: Partial<Player> & { id: number; playerId: string }): Player {
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

function buildGameState(overrides: Partial<GameState> = {}): GameState {
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

/** Exposes the hook's values as text so tests can assert on them without reaching into internals. */
function Probe() {
  const { uiState, handleTileClick, onLocalAction } = useGameBoard();
  return (
    <div>
      <span data-testid="selected-army">{String(uiState.selectedArmyId)}</span>
      <span data-testid="dialogs-army-selection">{uiState.dialogs.armySelection ? 'open' : 'closed'}</span>
      <button onClick={() => handleTileClick(1, 0)}>click-1-0</button>
      <button onClick={() => handleTileClick(2, 0)}>click-2-0</button>
      <button onClick={() => onLocalAction(GameAction.local_DeselectArmy)}>deselect</button>
    </div>
  );
}

function renderProvider(gameState: GameState, overrides: Partial<Parameters<typeof GameBoardProvider>[0]> = {}) {
  const localPlayer = gameState.players[0];
  return render(
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
      <Probe />
    </GameBoardProvider>,
  );
}

describe('GameBoardProvider: army selection via handleTileClick', () => {
  it('selects a single army on a tile with no prior selection', async () => {
    const army = { id: 7, position: { x: 1, y: 0 }, hasActed: false };
    const player = buildPlayer({ id: 0, playerId: 'p0', armies: [army] });
    const gameState = buildGameState({ players: [player] });
    renderProvider(gameState);

    await act(async () => screen.getByText('click-1-0').click());

    expect(screen.getByTestId('selected-army').textContent).toBe('7');
  });

  it('deselects the same army on a second click of its tile (toggle)', async () => {
    const army = { id: 7, position: { x: 1, y: 0 }, hasActed: false };
    const player = buildPlayer({ id: 0, playerId: 'p0', armies: [army] });
    const gameState = buildGameState({ players: [player] });
    renderProvider(gameState);

    await act(async () => screen.getByText('click-1-0').click());
    await act(async () => screen.getByText('click-1-0').click());

    expect(screen.getByTestId('selected-army').textContent).toBe('null');
  });

  it('opens the army-selection dialog, instead of auto-selecting, when a tile has more than one friendly army', async () => {
    const armies = [
      { id: 1, position: { x: 1, y: 0 }, hasActed: false },
      { id: 2, position: { x: 1, y: 0 }, hasActed: false },
    ];
    const player = buildPlayer({ id: 0, playerId: 'p0', armies });
    const gameState = buildGameState({ players: [player] });
    renderProvider(gameState);

    await act(async () => screen.getByText('click-1-0').click());

    expect(screen.getByTestId('dialogs-army-selection').textContent).toBe('open');
    expect(screen.getByTestId('selected-army').textContent).toBe('null');
  });

  it('clicking an empty, non-move tile deselects the current army', async () => {
    const army = { id: 7, position: { x: 1, y: 0 }, hasActed: false };
    const player = buildPlayer({ id: 0, playerId: 'p0', armies: [army] });
    const gameState = buildGameState({ players: [player] });
    renderProvider(gameState);

    await act(async () => screen.getByText('click-1-0').click()); // select
    await act(async () => screen.getByText('click-2-0').click()); // empty tile, not a possible move

    expect(screen.getByTestId('selected-army').textContent).toBe('null');
  });
});

describe('GameBoardProvider: onLocalAction', () => {
  it('local_DeselectArmy clears the current selection', async () => {
    const army = { id: 7, position: { x: 1, y: 0 }, hasActed: false };
    const player = buildPlayer({ id: 0, playerId: 'p0', armies: [army] });
    const gameState = buildGameState({ players: [player] });
    renderProvider(gameState);

    await act(async () => screen.getByText('click-1-0').click());
    await act(async () => screen.getByText('deselect').click());

    expect(screen.getByTestId('selected-army').textContent).toBe('null');
  });
});

describe('GameBoardProvider: turn-end UI reset', () => {
  it('resets the selected army when isMyTurn becomes false', async () => {
    const army = { id: 7, position: { x: 1, y: 0 }, hasActed: false };
    const player = buildPlayer({ id: 0, playerId: 'p0', armies: [army] });
    const gameState = buildGameState({ players: [player] });
    const { rerender } = renderProvider(gameState);

    await act(async () => screen.getByText('click-1-0').click());
    expect(screen.getByTestId('selected-army').textContent).toBe('7');

    rerender(
      <GameBoardProvider
        gameId="game_test"
        playerId={player.playerId}
        serverGameState={gameState}
        localPlayerFromServer={player}
        isMyTurn={false}
        isHost
        setGameState={jest.fn().mockResolvedValue(undefined)}
        onExit={jest.fn()}
      >
        <Probe />
      </GameBoardProvider>,
    );

    expect(screen.getByTestId('selected-army').textContent).toBe('null');
  });
});
