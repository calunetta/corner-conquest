import type { GameState, Island, Player } from '@/lib/types';
import { IslandType, ResourceType } from '@/lib/types';
import { applyCollectorAbility, applyDeferredReclaim, applyExplorerAbility } from './turn-start-passives.reducer';
import { toLogMessage } from './log-entry';

const COLS = 5;

function buildTile(x: number, y: number, overrides: Partial<Island> = {}): Island {
  return {
    id: `${x}-${y}`,
    x,
    y,
    type: IslandType.Empty,
    resources: [],
    occupants: [],
    ...overrides,
  };
}

function buildState(map: Island[], players: Player[] = []): GameState {
  return {
    map,
    settings: { gridSize: { rows: 2, cols: COLS } },
    log: [],
    currentPlayerIndex: 0,
    players,
  } as unknown as GameState;
}

function buildPlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 0,
    playerId: 'p0',
    name: 'Player 0',
    isBot: false,
    isVacant: false,
    reclaimRequested: false,
    armies: [],
    resources: { food: 0, wood: 0, gold: 0 },
    victoryPoints: 0,
    passiveAbilities: {},
    ...overrides,
  } as Player;
}

describe('applyDeferredReclaim', () => {
  it("hands a vacant, reclaim-requested seat back to the human and logs it", () => {
    const outgoing = buildPlayer({ isVacant: true, reclaimRequested: true, isBot: true });
    const state = buildState([], [outgoing]);
    state.currentPlayerIndex = 0;

    applyDeferredReclaim(state);

    expect(state.players[0]).toMatchObject({ isBot: false, isVacant: false, reclaimRequested: false });
    expect(state.log.map(toLogMessage)).toContain('Player 0 has reclaimed their seat.');
  });

  it('is a no-op when the seat is not vacant (boundary)', () => {
    const outgoing = buildPlayer({ isVacant: false, reclaimRequested: true, isBot: true });
    const state = buildState([], [outgoing]);

    applyDeferredReclaim(state);

    expect(state.players[0].isBot).toBe(true);
    expect(state.log).toHaveLength(0);
  });

  it('is a no-op when no reclaim was requested (boundary)', () => {
    const outgoing = buildPlayer({ isVacant: true, reclaimRequested: false, isBot: true });
    const state = buildState([], [outgoing]);

    applyDeferredReclaim(state);

    expect(state.players[0].isBot).toBe(true);
    expect(state.log).toHaveLength(0);
  });
});

describe('applyExplorerAbility', () => {
  it('is a no-op when the player does not have the Explorer passive (invalid input: ability off)', () => {
    const tile = buildTile(1, 1, { type: IslandType.Resource });
    const player = buildPlayer({ armies: [{ id: 0, position: { x: 1, y: 1 }, hasActed: false }] });
    const state = buildState([buildTile(0, 0), tile]);

    applyExplorerAbility(state, player);

    expect(player.victoryPoints).toBe(0);
    expect(state.log).toHaveLength(0);
  });

  it('grants 1 VP per distinct non-Base island one of the armies occupies', () => {
    const tileA = buildTile(1, 1, { type: IslandType.Resource });
    const tileB = buildTile(2, 1, { type: IslandType.Special });
    const map = Array.from({ length: COLS * 2 }, (_, i) => buildTile(i % COLS, Math.floor(i / COLS)));
    map[1 * COLS + 1] = tileA;
    map[1 * COLS + 2] = tileB;
    const player = buildPlayer({
      passiveAbilities: { explorer: true },
      armies: [
        { id: 0, position: { x: 1, y: 1 }, hasActed: false },
        { id: 1, position: { x: 2, y: 1 }, hasActed: false },
      ],
    });
    const state = buildState(map);

    applyExplorerAbility(state, player);

    expect(player.victoryPoints).toBe(2);
    expect(state.log.map(toLogMessage)).toContain("Player 0's Explorer ability generated 2 VP.");
  });

  it('does not grant VP for an army standing on a Base tile (boundary)', () => {
    const map = Array.from({ length: COLS * 2 }, (_, i) => buildTile(i % COLS, Math.floor(i / COLS)));
    map[0] = buildTile(0, 0, { type: IslandType.Base });
    const player = buildPlayer({
      passiveAbilities: { explorer: true },
      armies: [{ id: 0, position: { x: 0, y: 0 }, hasActed: false }],
    });
    const state = buildState(map);

    applyExplorerAbility(state, player);

    expect(player.victoryPoints).toBe(0);
    expect(state.log).toHaveLength(0);
  });

  it('counts a single island once even when two armies occupy it (boundary: same island twice)', () => {
    const map = Array.from({ length: COLS * 2 }, (_, i) => buildTile(i % COLS, Math.floor(i / COLS)));
    map[1 * COLS + 1] = buildTile(1, 1, { type: IslandType.Resource });
    const player = buildPlayer({
      passiveAbilities: { explorer: true },
      armies: [
        { id: 0, position: { x: 1, y: 1 }, hasActed: false },
        { id: 1, position: { x: 1, y: 1 }, hasActed: false },
      ],
    });
    const state = buildState(map);

    applyExplorerAbility(state, player);

    expect(player.victoryPoints).toBe(1);
  });
});

describe('applyCollectorAbility', () => {
  it('is a no-op when the player does not have the Collector passive (invalid input: ability off)', () => {
    const map = Array.from({ length: COLS * 2 }, (_, i) => buildTile(i % COLS, Math.floor(i / COLS)));
    map[1 * COLS + 1] = buildTile(1, 1, { type: IslandType.Resource, resources: [{ type: ResourceType.Wood, amount: 3 }] });
    const player = buildPlayer({ armies: [{ id: 0, position: { x: 1, y: 1 }, hasActed: false }] });
    const state = buildState(map);

    applyCollectorAbility(state, player);

    expect(player.resources.wood).toBe(0);
    expect(state.log).toHaveLength(0);
  });

  it('grants a flat 1 of each resource type per distinct occupied Resource island', () => {
    const map = Array.from({ length: COLS * 2 }, (_, i) => buildTile(i % COLS, Math.floor(i / COLS)));
    map[1 * COLS + 1] = buildTile(1, 1, {
      type: IslandType.Resource,
      resources: [
        { type: ResourceType.Wood, amount: 5 },
        { type: ResourceType.Gold, amount: 5 },
      ],
    });
    const player = buildPlayer({
      passiveAbilities: { collector: true },
      armies: [{ id: 0, position: { x: 1, y: 1 }, hasActed: false }],
    });
    const state = buildState(map);

    applyCollectorAbility(state, player);

    expect(player.resources.wood).toBe(1); // flat +1, not the tile's `amount`
    expect(player.resources.gold).toBe(1);
    expect(state.log.map(toLogMessage)).toContain("Player 0's Collector ability gathered 1 wood, 1 gold.");
  });

  it('does not grant resources for a Base tile, even if it has resources (boundary)', () => {
    const map = Array.from({ length: COLS * 2 }, (_, i) => buildTile(i % COLS, Math.floor(i / COLS)));
    map[0] = buildTile(0, 0, { type: IslandType.Base, resources: [{ type: ResourceType.Food, amount: 1 }] });
    const player = buildPlayer({
      passiveAbilities: { collector: true },
      armies: [{ id: 0, position: { x: 0, y: 0 }, hasActed: false }],
    });
    const state = buildState(map);

    applyCollectorAbility(state, player);

    expect(player.resources.food).toBe(0);
    expect(state.log).toHaveLength(0);
  });

  it('counts a single island once even when two armies occupy it (boundary: same island twice)', () => {
    const map = Array.from({ length: COLS * 2 }, (_, i) => buildTile(i % COLS, Math.floor(i / COLS)));
    map[1 * COLS + 1] = buildTile(1, 1, { type: IslandType.Resource, resources: [{ type: ResourceType.Food, amount: 1 }] });
    const player = buildPlayer({
      passiveAbilities: { collector: true },
      armies: [
        { id: 0, position: { x: 1, y: 1 }, hasActed: false },
        { id: 1, position: { x: 1, y: 1 }, hasActed: false },
      ],
    });
    const state = buildState(map);

    applyCollectorAbility(state, player);

    expect(player.resources.food).toBe(1);
  });

  it('is a no-op when no army occupies a Resource island with resources (empty input)', () => {
    const map = Array.from({ length: COLS * 2 }, (_, i) => buildTile(i % COLS, Math.floor(i / COLS)));
    const player = buildPlayer({ passiveAbilities: { collector: true }, armies: [] });
    const state = buildState(map);

    applyCollectorAbility(state, player);

    expect(player.resources).toEqual({ food: 0, wood: 0, gold: 0 });
    expect(state.log).toHaveLength(0);
  });
});
