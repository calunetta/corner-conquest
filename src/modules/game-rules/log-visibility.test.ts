import type { GameState, Island, Player, StructuredLogEntry } from '@/lib/types';
import { IslandType } from '@/lib/types';
import { canViewerReadLogEntry } from './log-visibility';

const TILE_REVEALED_BY_ADA = 'tile-ada';
const TILE_UNREVEALED = 'tile-hidden';
const BASE_TILE = 'base-bo';

const ada = {
  playerId: 'p-ada',
  revealedTiles: [TILE_REVEALED_BY_ADA],
} as Player;
const bo = { playerId: 'p-bo', revealedTiles: [BASE_TILE] } as Player;

const map = [
  { id: TILE_REVEALED_BY_ADA, type: IslandType.Resource },
  { id: TILE_UNREVEALED, type: IslandType.Resource },
  { id: BASE_TILE, type: IslandType.Base },
] as Island[];

function buildState(overrides: Partial<GameState> = {}): GameState {
  return {
    debugMode: false,
    settings: { fogOfWar: true },
    map,
    players: [ada, bo],
    ...overrides,
  } as unknown as GameState;
}

function entryWith(visibility: StructuredLogEntry['visibility']): StructuredLogEntry {
  return {
    kind: 'structured',
    turn: 1,
    category: 'economy',
    message: 'secret',
    playerId: 'p-bo',
    visibility,
    redactedMessage: 'redacted',
  };
}

describe('canViewerReadLogEntry', () => {
  it('lets everyone read an entry with no visibility (public)', () => {
    const entry = {
      kind: 'structured',
      turn: 1,
      category: 'turn',
      message: 'x',
    } as StructuredLogEntry;

    expect(canViewerReadLogEntry(buildState(), ada, entry)).toBe(true);
    expect(canViewerReadLogEntry(buildState(), null, entry)).toBe(true);
  });

  describe('owner scope', () => {
    it('shows the entry only to its player', () => {
      const entry = entryWith({ scope: 'owner' });

      expect(canViewerReadLogEntry(buildState(), bo, entry)).toBe(true);
      expect(canViewerReadLogEntry(buildState(), ada, entry)).toBe(false);
      expect(canViewerReadLogEntry(buildState(), null, entry)).toBe(false);
    });
  });

  describe('tiles scope with fog of war on', () => {
    it('shows the entry to a viewer who revealed one of the tiles', () => {
      const entry = entryWith({
        scope: 'tiles',
        tileIds: [TILE_REVEALED_BY_ADA],
      });

      expect(canViewerReadLogEntry(buildState(), ada, entry)).toBe(true);
    });

    it('hides the entry from a viewer who has not revealed the tile', () => {
      const entry = entryWith({ scope: 'tiles', tileIds: [TILE_UNREVEALED] });

      expect(canViewerReadLogEntry(buildState(), ada, entry)).toBe(false);
    });

    it('does not share one player reveal with another under fog of war', () => {
      const entry = {
        ...entryWith({ scope: 'tiles', tileIds: [TILE_REVEALED_BY_ADA] }),
        playerId: 'p-ada',
      };

      expect(canViewerReadLogEntry(buildState(), bo, entry)).toBe(false);
    });

    it('shows the entry when any of several tiles is visible', () => {
      const entry = entryWith({
        scope: 'tiles',
        tileIds: [TILE_UNREVEALED, TILE_REVEALED_BY_ADA],
      });

      expect(canViewerReadLogEntry(buildState(), ada, entry)).toBe(true);
    });

    it('always shows the owner, even when the tile is hidden from them', () => {
      const entry = entryWith({ scope: 'tiles', tileIds: [TILE_UNREVEALED] });

      expect(canViewerReadLogEntry(buildState(), bo, entry)).toBe(true);
    });

    it('treats a Base tile as visible to everyone', () => {
      const entry = entryWith({ scope: 'tiles', tileIds: [BASE_TILE] });

      expect(canViewerReadLogEntry(buildState(), ada, entry)).toBe(true);
    });

    it('hides the entry from a spectator with no player', () => {
      const entry = entryWith({
        scope: 'tiles',
        tileIds: [TILE_REVEALED_BY_ADA],
      });

      expect(canViewerReadLogEntry(buildState(), null, entry)).toBe(false);
    });
  });

  describe('tiles scope with fog of war off', () => {
    it('shows a tile to everyone once any player has revealed it', () => {
      const entry = entryWith({
        scope: 'tiles',
        tileIds: [TILE_REVEALED_BY_ADA],
      });
      const state = buildState({
        settings: { fogOfWar: false } as GameState['settings'],
      });

      expect(canViewerReadLogEntry(state, bo, entry)).toBe(true);
    });

    it('still hides a tile no player has revealed', () => {
      const entry = entryWith({ scope: 'tiles', tileIds: [TILE_UNREVEALED] });
      const state = buildState({
        settings: { fogOfWar: false } as GameState['settings'],
      });

      expect(canViewerReadLogEntry(state, ada, entry)).toBe(false);
    });
  });

  it('shows every tile in debug mode', () => {
    const entry = entryWith({ scope: 'tiles', tileIds: [TILE_UNREVEALED] });

    expect(canViewerReadLogEntry(buildState({ debugMode: true }), null, entry)).toBe(true);
  });
});
