import { PlayerColor, ResourceType, GameStatus } from '@/lib/types';
import type { GameState, CombatState } from '@/lib/types';
import { initializeGame, startGame, defaultGameSettings } from '@/modules/game-rules';
import { addPlayerToGame } from '@/modules/game-rules';
import { handleCloseCombat } from './combat-player-resolve.reducer';

const COMBAT_TILE = { x: 2, y: 2 };

function buildGame(): GameState {
  let game = initializeGame(
    'game_test',
    'Combat Resolve Test',
    2,
    { playerId: 'p1', name: 'Attacker', color: PlayerColor.Blue },
    0,
    false,
    defaultGameSettings,
  );
  const added = addPlayerToGame(game, { playerId: 'p2', name: 'Defender' });
  game = added.newGameState!;
  game = startGame(game, 'Attacker');
  return game;
}

/** Places both combatants on the same tile and gives the loser a resource position there, mirroring a real battle. */
function placeCombatants(game: GameState, winnerId: number, loserId: number, attackerArmyId: number, defenderArmyId: number) {
  const winner = game.players.find((p) => p.id === winnerId)!;
  const loser = game.players.find((p) => p.id === loserId)!;
  const attacker = game.players.find((p) => p.id === game.combatState!.attackerId)!;
  const defender = game.players.find((p) => p.id === game.combatState!.defenderId)!;

  const attackingArmy = attacker.armies.find((a) => a.id === attackerArmyId)!;
  const defendingArmy = defender.armies.find((a) => a.id === defenderArmyId)!;
  attackingArmy.position = { ...COMBAT_TILE };
  defendingArmy.position = { ...COMBAT_TILE };

  const tile = game.map[COMBAT_TILE.y * game.settings.gridSize.cols + COMBAT_TILE.x];
  tile.occupants = [
    { playerId: attacker.id, armyId: attackingArmy.id },
    { playerId: defender.id, armyId: defendingArmy.id },
  ];
  tile.positionedBy = [{ playerId: loser.id, resource: ResourceType.Food }];
  loser.positions = [{ x: COMBAT_TILE.x, y: COMBAT_TILE.y, resource: ResourceType.Food, armyId: loserId === defender.id ? defendingArmy.id : attackingArmy.id }];

  return { winner, loser, tile };
}

describe('handleCloseCombat', () => {
  let game: GameState;

  beforeEach(() => {
    game = buildGame();
    const attacker = game.players[0];
    const defender = game.players[1];
    const combatState: CombatState = {
      attackerId: attacker.id,
      attackingArmyId: attacker.armies[0].id,
      defenderId: defender.id,
      defendingArmyId: defender.armies[0].id,
      attackerRolls: [5],
      defenderRolls: [2],
      winnerId: attacker.id,
      phase: 'results',
    };
    game.combatState = combatState;
  });

  it("returns combatState: null and makes no other change when phase isn't 'results'", () => {
    game.combatState!.phase = 'rolling';
    const attackerVpBefore = game.players[0].victoryPoints;

    const nextState = handleCloseCombat(game);

    expect(nextState.combatState).toBeNull();
    expect(nextState.players[0].victoryPoints).toBe(attackerVpBefore);
  });

  it('returns combatState: null when there is no combatState at all', () => {
    game.combatState = null;
    const nextState = handleCloseCombat(game);
    expect(nextState.combatState).toBeNull();
  });

  it('returns combatState: null when winnerId is null', () => {
    game.combatState!.winnerId = null;
    const nextState = handleCloseCombat(game);
    expect(nextState.combatState).toBeNull();
  });

  it('returns combatState: null when the attacking army cannot be found', () => {
    game.combatState!.attackingArmyId = 9999;
    const nextState = handleCloseCombat(game);
    expect(nextState.combatState).toBeNull();
  });

  it('winner gets +5 VP; loser (defender) army respawns at base with hasActed false; positionedBy entry cleared', () => {
    const defender = game.players[1];
    const { winner, loser, tile } = placeCombatants(game, game.players[0].id, defender.id, game.combatState!.attackingArmyId, game.combatState!.defendingArmyId);
    const winnerVpBefore = winner.victoryPoints;
    const baseTile = game.baseTiles.find((b) => b.owner === loser.id)!;
    const losingArmy = loser.armies.find((a) => a.id === game.combatState!.defendingArmyId)!;

    const nextState = handleCloseCombat(game);

    expect(winner.victoryPoints).toBe(winnerVpBefore + 5);
    expect(losingArmy.position).toEqual({ x: baseTile.x, y: baseTile.y });
    expect(losingArmy.hasActed).toBe(false);
    expect(loser.positions).toHaveLength(0);
    expect(tile.positionedBy).toEqual([]);
    expect(tile.occupants).not.toContainEqual({ playerId: loser.id, armyId: losingArmy.id });
    expect(nextState.combatState).toBeNull();
    expect(nextState.log).toContain(`${winner.name} defeated ${loser.name} in battle!`);
  });

  it('when the attacker loses, their own army (attackingArmyId) respawns at their base', () => {
    const attacker = game.players[0];
    const defender = game.players[1];
    game.combatState!.winnerId = defender.id;
    const { winner, loser } = placeCombatants(game, defender.id, attacker.id, game.combatState!.attackingArmyId, game.combatState!.defendingArmyId);
    const baseTile = game.baseTiles.find((b) => b.owner === attacker.id)!;
    const losingArmy = attacker.armies.find((a) => a.id === game.combatState!.attackingArmyId)!;

    handleCloseCombat(game);

    expect(winner.victoryPoints).toBeGreaterThan(0);
    expect(loser.id).toBe(attacker.id);
    expect(losingArmy.position).toEqual({ x: baseTile.x, y: baseTile.y });
    expect(losingArmy.hasActed).toBe(false);
  });

  it('attacker loses while positioned on the attacked tile: loser.positions and the tile\'s positionedBy no longer reference that army', () => {
    const attacker = game.players[0];
    const defender = game.players[1];
    game.combatState!.winnerId = defender.id;
    const { loser, tile } = placeCombatants(game, defender.id, attacker.id, game.combatState!.attackingArmyId, game.combatState!.defendingArmyId);
    const losingArmyId = game.combatState!.attackingArmyId;
    expect(loser.positions).toContainEqual(expect.objectContaining({ armyId: losingArmyId })); // sanity: positioned before combat resolves

    handleCloseCombat(game);

    expect(loser.positions.find((p) => p.armyId === losingArmyId)).toBeUndefined();
    expect(tile.positionedBy).toEqual([]);
  });

  it('sets state.winner and GameStatus.Finished when the victory point goal is reached', () => {
    const winner = game.players[0];
    const defender = game.players[1];
    winner.victoryPoints = game.settings.victoryPointGoal - 5;
    placeCombatants(game, winner.id, defender.id, game.combatState!.attackingArmyId, game.combatState!.defendingArmyId);

    const nextState = handleCloseCombat(game);

    expect(nextState.winner).toBe(winner);
    expect(nextState.status).toBe(GameStatus.Finished);
    expect(nextState.log.some((entry) => entry.includes('won the game'))).toBe(true);
  });
});
