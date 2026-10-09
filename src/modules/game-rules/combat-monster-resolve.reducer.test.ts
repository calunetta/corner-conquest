import { PlayerColor, IslandType, MonsterName, GameStatus, ResourceType } from '@/lib/types';
import type { GameState, Monster, MonsterCombatState } from '@/lib/types';
import { initializeGame, startGame, defaultGameSettings } from '@/modules/game-rules';
import { handleCloseMonsterCombat } from './combat-monster-resolve.reducer';
import { handleInitiateCombatAction } from './combat-initiate.reducer';
import { toLogMessage } from './log-entry';

function buildGame(): GameState {
  return startGame(
    initializeGame(
      'game_test',
      'Monster Resolve Test',
      1,
      { playerId: 'p1', name: 'Attacker', color: PlayerColor.Blue },
      0,
      false,
      defaultGameSettings,
    ),
    'Attacker',
  );
}

function monster(level: number): Monster {
  return { name: MonsterName.Bear, level, sprite: { idle: '', attack: '', death: 'death.gif' } };
}

/**
 * Moves the attacker's army off their base tile onto a monster tile and records a
 * monsterCombatState in the 'results' phase. Moving off base first matters: it lets the
 * "loser respawns at base" test actually exercise the respawn logic instead of trivially
 * passing because the army never left its base tile.
 */
function setUpMonsterCombat(game: GameState, level: number, winnerId: number | null): { tile: GameState['map'][number]; m: Monster } {
  const attacker = game.players[0];
  const army = attacker.armies[0];
  army.position = { x: 2, y: 3 };
  const tile = game.map[army.position.y * game.settings.gridSize.cols + army.position.x];
  tile.type = IslandType.Monster;
  const m = monster(level);
  tile.monsters = [m];

  const state: MonsterCombatState = {
    attackerId: attacker.id,
    attackerPosition: { ...army.position },
    monster: m,
    attackerRolls: [5],
    monsterRolls: [2],
    winnerId,
    phase: 'results',
  };
  game.monsterCombatState = state;
  return { tile, m };
}

describe('handleCloseMonsterCombat', () => {
  let game: GameState;

  beforeEach(() => {
    game = buildGame();
  });

  it('returns monsterCombatState: null when there is no monsterCombatState at all', () => {
    game.monsterCombatState = null;
    const nextState = handleCloseMonsterCombat(game);
    expect(nextState.monsterCombatState).toBeNull();
  });

  it("returns monsterCombatState: null and makes no other change when phase isn't 'results'", () => {
    setUpMonsterCombat(game, 2, game.players[0].id);
    game.monsterCombatState!.phase = 'rolling';
    const vpBefore = game.players[0].victoryPoints;

    const nextState = handleCloseMonsterCombat(game);

    expect(nextState.monsterCombatState).toBeNull();
    expect(nextState.players[0].victoryPoints).toBe(vpBefore);
  });

  it.each([
    [0, 0],
    [1, 2],
    [2, 5],
    [3, 7],
    [4, 10],
  ])('winner gets the level-indexed VP: level %i -> %i VP', (level, expectedVp) => {
    const attacker = game.players[0];
    setUpMonsterCombat(game, level, attacker.id);
    const vpBefore = attacker.victoryPoints;

    handleCloseMonsterCombat(game);

    expect(attacker.victoryPoints).toBe(vpBefore + expectedVp);
  });

  it('clears the defeated monster and turns the island into a 1-resource-spot Resource tile', () => {
    const attacker = game.players[0];
    const { tile } = setUpMonsterCombat(game, 2, attacker.id);

    jest
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0.9) // numResourceTypes check: >= 0.4 -> 1 type
      .mockReturnValueOnce(0.9); // resource index pick

    handleCloseMonsterCombat(game);

    expect(tile.type).toBe(IslandType.Resource);
    expect(tile.monsters).toEqual([]);
    expect(tile.resources).toHaveLength(1);
    expect(Object.values(ResourceType)).toContain(tile.resources[0].type);

    jest.spyOn(Math, 'random').mockRestore();
  });

  it('can reveal 2 resource spots on the cleared island', () => {
    const attacker = game.players[0];
    const { tile } = setUpMonsterCombat(game, 2, attacker.id);

    jest
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0.1) // numResourceTypes check: < 0.4 -> 2 types
      .mockReturnValueOnce(0) // resource index pick, i = 0
      .mockReturnValueOnce(0.1) // amount coin flip, i = 0
      .mockReturnValueOnce(0.99) // resource index pick, i = 1
      .mockReturnValueOnce(0.9); // amount coin flip, i = 1

    handleCloseMonsterCombat(game);

    expect(tile.type).toBe(IslandType.Resource);
    expect(tile.resources).toHaveLength(2);

    jest.spyOn(Math, 'random').mockRestore();
  });

  it('loser respawns at base with hasActed true when the monster wins', () => {
    const attacker = game.players[0];
    setUpMonsterCombat(game, 2, null);
    const baseTile = game.baseTiles.find((b) => b.owner === attacker.id)!;
    const army = attacker.armies[0];
    army.hasActed = true; // the monster attack roll already marked this army as acted

    const nextState = handleCloseMonsterCombat(game);

    expect(army.position).toEqual({ x: baseTile.x, y: baseTile.y });
    expect(army.hasActed).toBe(true);
    expect(nextState.deathAnimations).toHaveLength(1);
    expect(nextState.log.some((entry) => toLogMessage(entry).includes('was defeated by'))).toBe(true);
  });

  it('a monster-defeated army cannot attack another monster that turn without an Extra Move', () => {
    const attacker = game.players[0];
    setUpMonsterCombat(game, 2, null);
    const army = attacker.armies[0];
    army.hasActed = true;
    handleCloseMonsterCombat(game);

    expect(() =>
      handleInitiateCombatAction(game, {
        attackingArmyId: army.id,
        target: { type: 'monster', monsterName: MonsterName.Bear },
      }),
    ).toThrow('This army has already acted this turn.');
  });

  it('sets state.winner and GameStatus.Finished when the victory point goal is reached', () => {
    const attacker = game.players[0];
    attacker.victoryPoints = game.settings.victoryPointGoal - 2;
    setUpMonsterCombat(game, 1, attacker.id); // level 1 -> 2 VP, exactly reaches the goal

    const nextState = handleCloseMonsterCombat(game);

    expect(nextState.winner).toBe(attacker);
    expect(nextState.status).toBe(GameStatus.Finished);
    expect(nextState.log.some((entry) => toLogMessage(entry).includes('won the game'))).toBe(true);
  });
});
