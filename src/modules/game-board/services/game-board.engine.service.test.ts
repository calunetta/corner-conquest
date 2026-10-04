jest.mock('@/lib/firebase', () => ({
  db: {},
  doc: jest.fn(() => ({})),
  onSnapshot: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
}));

import { onSnapshot, setDoc, updateDoc, doc, db } from '@/lib/firebase';
// Imported after the mock so the service picks up the mocked `@/lib/firebase` module.
import { subscribeToGameState, saveGameState, clearDeathAnimations } from './game-board.engine.service';
import type { GameState, DeathAnimation } from '@/lib/types';

const mockOnSnapshot = onSnapshot as jest.Mock;
const mockSetDoc = setDoc as jest.Mock;
const mockUpdateDoc = updateDoc as jest.Mock;
const mockDoc = doc as jest.Mock;

const createGameState = (overrides?: Partial<GameState>): GameState => ({
  id: 'game_test',
  name: 'Test Game',
  status: 'playing' as const,
  maxPlayers: 2,
  debugMode: false,
  settings: {
    victoryPointGoal: 10,
    vpPerIslandDiscovery: 1,
    initialDeployCost: 2,
    deployCostIncrement: 1,
    upgradeCost: 3,
    abilityCost: 10,
    baseResourceAmount: 50,
    resourceDensity: 0.5,
    availableCards: [],
    availableAbilities: [],
    fogOfWar: false,
    gridSize: { rows: 10, cols: 10 },
  },
  currentPlayerIndex: 0,
  players: [],
  map: [],
  baseTiles: [],
  deathAnimations: [],
  turn: 1,
  log: [],
  winner: null,
  specialCardsDeck: [],
  discardPile: [],
  combatState: null,
  monsterCombatState: null,
  productiveDialogState: null,
  ...overrides,
});

describe('game-board.engine.service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('subscribeToGameState', () => {
    it('calls onSnapshot with the correct game document reference', () => {
      const gameId = 'game_abc123';
      mockOnSnapshot.mockReturnValue(() => {});

      subscribeToGameState(gameId, {
        onData: jest.fn(),
        onMissing: jest.fn(),
        onError: jest.fn(),
      });

      expect(mockDoc).toHaveBeenCalledWith(db, 'games', gameId);
      expect(mockOnSnapshot).toHaveBeenCalled();
    });

    it('calls onData with the game state when the document exists', () => {
      const onData = jest.fn();
      const gameState = createGameState();

      mockOnSnapshot.mockImplementation((ref: unknown, onNext: (snap: unknown) => void) => {
        onNext({
          exists: () => true,
          data: () => gameState,
        });
        return jest.fn(); // Return an unsubscribe function
      });

      subscribeToGameState('game_123', {
        onData,
        onMissing: jest.fn(),
        onError: jest.fn(),
      });

      expect(onData).toHaveBeenCalledWith(gameState);
    });

    it('calls onMissing when the document does not exist', () => {
      const onMissing = jest.fn();

      mockOnSnapshot.mockImplementation((ref: unknown, onNext: (snap: unknown) => void) => {
        onNext({
          exists: () => false,
          data: () => undefined,
        });
        return jest.fn();
      });

      subscribeToGameState('game_123', {
        onData: jest.fn(),
        onMissing,
        onError: jest.fn(),
      });

      expect(onMissing).toHaveBeenCalled();
    });

    it('calls onError when an error occurs', () => {
      const onError = jest.fn();
      const error = new Error('Firestore error');

      mockOnSnapshot.mockImplementation(
        (ref: unknown, onNext: (snap: unknown) => void, onErr: (error: Error) => void) => {
          onErr(error);
          return jest.fn();
        }
      );

      subscribeToGameState('game_123', {
        onData: jest.fn(),
        onMissing: jest.fn(),
        onError,
      });

      expect(onError).toHaveBeenCalledWith(error);
    });

    it('returns an unsubscribe function', () => {
      const unsubscribe = jest.fn();
      mockOnSnapshot.mockReturnValue(unsubscribe);

      const result = subscribeToGameState('game_123', {
        onData: jest.fn(),
        onMissing: jest.fn(),
        onError: jest.fn(),
      });

      expect(result).toBe(unsubscribe);
    });
  });

  describe('saveGameState', () => {
    it('calls setDoc with the game document and state', async () => {
      mockSetDoc.mockResolvedValue(undefined);
      const gameState = createGameState();

      await saveGameState('game_123', gameState);

      expect(mockDoc).toHaveBeenCalledWith(db, 'games', 'game_123');
      expect(mockSetDoc).toHaveBeenCalledWith({}, gameState);
    });

    it('resolves without throwing when setDoc succeeds', async () => {
      mockSetDoc.mockResolvedValue(undefined);
      const gameState = createGameState();

      await expect(saveGameState('game_123', gameState)).resolves.not.toThrow();
    });

    it('propagates errors from setDoc', async () => {
      const error = new Error('Network error');
      mockSetDoc.mockRejectedValue(error);
      const gameState = createGameState();

      await expect(saveGameState('game_123', gameState)).rejects.toThrow('Network error');
    });

    it('writes the exact game state object', async () => {
      mockSetDoc.mockResolvedValue(undefined);
      const gameState = createGameState({
        currentPlayerIndex: 3,
        turn: 5,
        status: 'finished',
      });

      await saveGameState('game_abc', gameState);

      expect(mockSetDoc).toHaveBeenCalledWith({}, gameState);
    });
  });

  describe('clearDeathAnimations', () => {
    it('calls updateDoc with the remaining death animations', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);
      const remaining: DeathAnimation[] = [{ id: 'anim_1', x: 5, y: 5, sprite: 'death', createdAt: Date.now() }];

      await clearDeathAnimations('game_123', remaining);

      expect(mockDoc).toHaveBeenCalledWith(db, 'games', 'game_123');
      expect(mockUpdateDoc).toHaveBeenCalledWith({}, { deathAnimations: remaining });
    });

    it('clears all death animations when the array is empty', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);

      await clearDeathAnimations('game_123', []);

      expect(mockUpdateDoc).toHaveBeenCalledWith({}, { deathAnimations: [] });
    });

    it('resolves without throwing when updateDoc succeeds', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);

      await expect(clearDeathAnimations('game_123', [])).resolves.not.toThrow();
    });

    it('propagates errors from updateDoc', async () => {
      const error = new Error('Permission denied');
      mockUpdateDoc.mockRejectedValue(error);

      await expect(clearDeathAnimations('game_123', [])).rejects.toThrow('Permission denied');
    });

    it('preserves the death animation id and createdAt', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);
      const remaining: DeathAnimation[] = [
        { id: 'anim_1', x: 1, y: 1, sprite: 'death', createdAt: 1000 },
        { id: 'anim_2', x: 2, y: 2, sprite: 'death', createdAt: 2000 },
      ];

      await clearDeathAnimations('game_xyz', remaining);

      expect(mockUpdateDoc).toHaveBeenCalledWith({}, { deathAnimations: remaining });
    });
  });
});
