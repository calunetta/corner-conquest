import { renderHook, act } from '@testing-library/react';
import { useSessionHandlers } from './game-board.session.hook';
import { saveGameState } from './services/game-board.engine.service';
import { GameStatus } from '@/lib/types';
import type { GameState, Player } from '@/lib/types';
import type { SessionHandlersArgs } from './game-board.hook.types';

jest.mock('./services/game-board.engine.service', () => ({
  saveGameState: jest.fn(),
}));

const mockSaveGameState = saveGameState as jest.Mock;

const createPlayer = (overrides?: Partial<Player>): Player =>
  ({
    id: 0,
    playerId: 'player_1',
    name: 'Host',
    color: 'blue',
    isBot: false,
    isVacant: false,
    lastSeenAt: null,
    reclaimRequested: false,
    ...overrides,
  }) as Player;

const hostPlayer = createPlayer();
const guestPlayer = createPlayer({ id: 1, playerId: 'player_2', name: 'Guest', color: 'red' });

// Only the fields handleStartGame/startGame read matter here.
const createGameState = (overrides?: Partial<GameState>): GameState =>
  ({
    id: 'game_1',
    status: GameStatus.Waiting,
    currentPlayerIndex: 0,
    turn: 0,
    players: [hostPlayer, guestPlayer],
    log: [],
    ...overrides,
  }) as unknown as GameState;

const defaultProps = (overrides?: Partial<SessionHandlersArgs>): SessionHandlersArgs => ({
  gameId: 'game_1',
  serverGameState: createGameState(),
  localPlayerFromServer: hostPlayer,
  localPlayerName: hostPlayer.name,
  isHost: true,
  dispatch: jest.fn(),
  setGameState: jest.fn(),
  onExit: jest.fn(),
  toast: jest.fn(),
  ...overrides,
});

describe('useSessionHandlers: handleStartGame', () => {
  beforeEach(() => {
    mockSaveGameState.mockReset().mockResolvedValue(undefined);
  });

  it('saves the started state directly, without advancing past the host\'s own first turn', async () => {
    const { result } = renderHook(() => useSessionHandlers(defaultProps()));

    await act(async () => {
      await result.current.handleStartGame();
    });

    expect(mockSaveGameState).toHaveBeenCalledTimes(1);
    const [gameId, savedState] = mockSaveGameState.mock.calls[0];
    expect(gameId).toBe('game_1');
    expect(savedState.status).toBe(GameStatus.Playing);
    expect(savedState.turn).toBe(1);
    // The bug this guards against: routing the save through the EndTurn action would advance
    // this to 1 (the guest), skipping the host's first turn entirely.
    expect(savedState.currentPlayerIndex).toBe(0);
  });

  it('does nothing when the caller is not the host', async () => {
    const { result } = renderHook(() => useSessionHandlers(defaultProps({ isHost: false })));

    await act(async () => {
      await result.current.handleStartGame();
    });

    expect(mockSaveGameState).not.toHaveBeenCalled();
  });
});
