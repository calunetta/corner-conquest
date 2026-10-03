import { cloneDeep } from 'lodash';
import { PlayerColor, GameAction, AbilityName, ResourceType, CardName, IslandType, MonsterName } from '@/lib/types';
import type { GameState } from '@/lib/types';
import { initializeGame, startGame, defaultGameSettings } from '@/modules/game-rules';
import { addPlayerToGame } from '@/modules/game-rules';
import { handleGameAction } from './game-rules.reducer';
import { handleCancelAction, handleDeployAction, handleUpgradeAction } from './player-actions.reducer';
import { handleEndTurn } from './player-turn.reducer';
import { handleMoveAction, getPossibleMoves } from './movement.reducer';
import { handleSelectResourceForPosition } from './resource-position.reducer';
import { handleBuyAbility, handleBuyCardAction, handleRollOnSpecialIsland } from './card-acquisition.reducer';
import { handleScoutAction, handleUseCard, handleUseProductiveCard } from './card-effects.reducer';
import { handleGainWealth, handleSabotagePlayer, handleStealResource } from './card-targeted-effects.reducer';
import { handleInitiateCombatAction } from './combat-initiate.reducer';
import { handleCombatRoll } from './combat-player-roll.reducer';
import { handleMonsterCombatRoll } from './combat-monster-roll.reducer';

function buildGame(): GameState {
  let game = initializeGame(
    'game_test',
    'Game Rules Dispatcher Test',
    2,
    { playerId: 'p1', name: 'Player 1', color: PlayerColor.Blue },
    0,
    false,
    defaultGameSettings,
  );
  const added = addPlayerToGame(game, { playerId: 'p2', name: 'Player 2' });
  game = added.newGameState!;
  game = startGame(game, 'Player 1');
  return game;
}

describe('handleGameAction', () => {
  let game: GameState;

  beforeEach(() => {
    game = buildGame();
  });

  it('dispatching Deploy matches calling handleDeployAction directly', () => {
    game.players[0].resources.food = 10;
    const expected = handleDeployAction(cloneDeep(game));

    const { state } = handleGameAction({ action: GameAction.Deploy, gameState: game });

    expect(state.players[0].armies.length).toBe(expected.players[0].armies.length);
    expect(state.players[0].resources.food).toBe(expected.players[0].resources.food);
    expect(state.players[0].actionsThisTurn).toEqual(expected.players[0].actionsThisTurn);
  });

  it('dispatching Move forwards x, y and army to handleMoveAction', () => {
    const army = game.players[0].armies[0];
    const moves = getPossibleMoves(game, army);
    const target = moves[0];
    const expected = handleMoveAction(cloneDeep(game), target.x, target.y, army);

    const { state } = handleGameAction({
      action: GameAction.Move,
      gameState: game,
      payload: { x: target.x, y: target.y, army },
    });

    expect(state.players[0].armies[0].position).toEqual(expected.players[0].armies[0].position);
    expect(state.players[0].armies[0].hasActed).toBe(expected.players[0].armies[0].hasActed);
  });

  it('dispatching Move forwards isTeleport, so a Teleport move reaches a non-adjacent tile', () => {
    const player = game.players[0];
    player.specialCards = [CardName.Teleport];
    const army = player.armies[0];
    const expected = handleMoveAction(cloneDeep(game), 4, 4, army, true);

    const { state } = handleGameAction({
      action: GameAction.Move,
      gameState: game,
      payload: { x: 4, y: 4, army, isTeleport: true },
    });

    expect(state.players[0].armies[0].position).toEqual({ x: 4, y: 4 }); // would be rejected without isTeleport
    expect(state).toEqual(expected);
  });

  it('dispatching SelectResourcePosition forwards resource and armyId to handleSelectResourceForPosition', () => {
    const army = game.players[0].armies[0];
    const expected = handleSelectResourceForPosition(cloneDeep(game), ResourceType.Gold, army.id);

    const { state } = handleGameAction({
      action: GameAction.SelectResourcePosition,
      gameState: game,
      payload: { resource: ResourceType.Gold, armyId: army.id },
    });

    expect(state.players[0].positions).toEqual(expected.players[0].positions);
  });

  it('dispatching BuyAbility forwards abilityName to handleBuyAbility', () => {
    game.players[0].resources.gold = 100;
    const expected = handleBuyAbility(cloneDeep(game), AbilityName.Explorer);

    const { state } = handleGameAction({
      action: GameAction.BuyAbility,
      gameState: game,
      payload: { abilityName: AbilityName.Explorer },
    });

    expect(state.players[0].passiveAbilities.explorer).toBe(expected.players[0].passiveAbilities.explorer);
    expect(state.players[0].resources.gold).toBe(expected.players[0].resources.gold);
  });

  it('clones gameState rather than mutating the caller-supplied object', () => {
    game.players[0].resources.food = 10;
    const foodBefore = game.players[0].resources.food;

    handleGameAction({ action: GameAction.Deploy, gameState: game });

    expect(game.players[0].resources.food).toBe(foodBefore);
    expect(game.players[0].armies).toHaveLength(1);
  });

  it('catches a handler error and returns the pre-clone original state instead of throwing', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    game.players[0].resources.food = 0; // Deploy will throw "Not enough food"

    const { state } = handleGameAction({ action: GameAction.Deploy, gameState: game });

    expect(state).toBe(game); // the exact pre-clone reference, not a half-mutated clone
    expect(state.players[0].armies).toHaveLength(1);
    expect(errorSpy).toHaveBeenCalledWith('Error handling action deploy:', expect.any(Error));
    errorSpy.mockRestore();
  });

  it('returns the original state unchanged for an action with no matching case (invalid input)', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { state } = handleGameAction({ action: 'not-a-real-action' as GameAction, gameState: game });
    expect(state).toBe(game);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });
});

describe('handleGameAction routing table', () => {
  type Row = {
    name: string;
    action: GameAction;
    payload: unknown;
    setup: (g: GameState) => void;
    direct: (s: GameState) => GameState;
    changesState: boolean;
  };

  const placeMonsterAndInitiate = (g: GameState) => {
    const army = g.players[0].armies[0];
    const tile = g.map[army.position.y * g.settings.gridSize.cols + army.position.x];
    tile.type = IslandType.Monster;
    tile.monsters = [{ name: MonsterName.Bear, level: 2, sprite: { idle: '', attack: '', death: '' } }];
    handleInitiateCombatAction(g, { attackingArmyId: army.id, target: { type: 'monster', monsterName: MonsterName.Bear } });
  };
  const initiatePvp = (g: GameState) => {
    handleInitiateCombatAction(g, {
      attackingArmyId: g.players[0].armies[0].id,
      target: { type: 'player', defenderId: g.players[1].id, defendingArmyId: g.players[1].armies[0].id },
    });
  };
  const bear = { name: MonsterName.Bear, level: 2, sprite: { idle: '', attack: '', death: '' } };

  const rows: Row[] = [
    {
      name: 'CombatRoll with a boolean payload (legacy useWarChief form)',
      action: GameAction.CombatRoll,
      payload: true,
      setup: (g) => {
        initiatePvp(g);
        g.players[0].specialCards = [CardName.WarChief];
      },
      direct: (s) => handleCombatRoll(s, true),
      changesState: true,
    },
    {
      name: 'CombatRoll with an object payload (useOvercome)',
      action: GameAction.CombatRoll,
      payload: { useOvercome: true },
      setup: (g) => {
        initiatePvp(g);
        g.players[0].specialCards = [CardName.Overcome];
      },
      direct: (s) => handleCombatRoll(s, { useOvercome: true }),
      changesState: true,
    },
    {
      name: 'InitiateCombat against a player',
      action: GameAction.InitiateCombat,
      payload: { attackingArmyId: 0, target: { type: 'player', defenderId: 1, defendingArmyId: 0 } },
      setup: () => {},
      direct: (s) =>
        handleInitiateCombatAction(s, { attackingArmyId: 0, target: { type: 'player', defenderId: 1, defendingArmyId: 0 } }),
      changesState: true,
    },
    {
      name: 'MonsterCombatRoll',
      action: GameAction.MonsterCombatRoll,
      payload: { monster: bear, useDecideCard: false, decidedValue: 0, useOvercomeCard: false, useWarChief: false },
      setup: placeMonsterAndInitiate,
      direct: (s) =>
        handleMonsterCombatRoll(s, { monster: bear, useDecideCard: false, decidedValue: 0, useOvercomeCard: false, useWarChief: false }),
      changesState: true,
    },
    {
      name: 'UseProductiveCard (selectedResource read off the payload object)',
      action: GameAction.UseProductiveCard,
      payload: { selectedResource: ResourceType.Food },
      setup: (g) => {
        g.players[0].specialCards = [CardName.Productive];
        g.players[0].positions = [{ x: 0, y: 0, resource: ResourceType.Food, armyId: 0 }];
      },
      direct: (s) => handleUseProductiveCard(s, ResourceType.Food),
      changesState: true,
    },
    {
      name: 'SabotagePlayer',
      action: GameAction.SabotagePlayer,
      payload: { targetPlayerId: 1 },
      setup: (g) => {
        g.players[0].specialCards = [CardName.Sabotage];
      },
      direct: (s) => handleSabotagePlayer(s, 1),
      changesState: true,
    },
    {
      name: 'GainWealth',
      action: GameAction.GainWealth,
      payload: { resource: ResourceType.Wood },
      setup: (g) => {
        g.players[0].specialCards = [CardName.Wealthy];
      },
      direct: (s) => handleGainWealth(s, ResourceType.Wood),
      changesState: true,
    },
    {
      name: 'StealResource',
      action: GameAction.StealResource,
      payload: { targetPlayerId: 1, resource: ResourceType.Wood },
      setup: (g) => {
        g.players[0].specialCards = [CardName.StealResource];
        g.players[1].resources.wood = 10;
      },
      direct: (s) => handleStealResource(s, { targetPlayerId: 1, resource: ResourceType.Wood }),
      changesState: true,
    },
    {
      name: 'Scout (x and y read off the payload object)',
      action: GameAction.Scout,
      payload: { x: 3, y: 3 },
      setup: () => {},
      direct: (s) => handleScoutAction(s, 3, 3),
      changesState: true,
    },
    {
      name: 'UseCard',
      action: GameAction.UseCard,
      payload: { cardName: CardName.ExtraMove },
      setup: (g) => {
        g.players[0].specialCards = [CardName.ExtraMove];
      },
      direct: (s) => handleUseCard(s, { cardName: CardName.ExtraMove }),
      changesState: true,
    },
    {
      name: 'RollOnSpecialIsland with a forced roll',
      action: GameAction.RollOnSpecialIsland,
      payload: { roll: 3 },
      setup: () => {},
      direct: (s) => handleRollOnSpecialIsland(s, { roll: 3 }),
      changesState: true,
    },
    {
      name: 'CancelAction with an undefined payload (reducer must tolerate it, state unchanged)',
      action: GameAction.CancelAction,
      payload: undefined,
      setup: () => {},
      direct: (s) => handleCancelAction(s, undefined),
      changesState: false,
    },
    {
      name: 'CancelAction with a card payload',
      action: GameAction.CancelAction,
      payload: { cardName: CardName.Reinforce },
      setup: (g) => {
        g.players[0].reinforceActive = true;
        g.discardPile = [CardName.Reinforce];
      },
      direct: (s) => handleCancelAction(s, { cardName: CardName.Reinforce }),
      changesState: true,
    },
    {
      name: 'BuyCard',
      action: GameAction.BuyCard,
      payload: undefined,
      setup: (g) => {
        g.players[0].resources.gold = 20;
      },
      direct: (s) => handleBuyCardAction(s),
      changesState: true,
    },
    {
      name: 'Upgrade',
      action: GameAction.Upgrade,
      payload: undefined,
      setup: (g) => {
        g.players[0].resources.wood = 20;
      },
      direct: (s) => handleUpgradeAction(s),
      changesState: true,
    },
    {
      name: 'EndTurn',
      action: GameAction.EndTurn,
      payload: undefined,
      setup: () => {},
      direct: (s) => handleEndTurn(s),
      changesState: true,
    },
  ];

  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Fixed dice and shuffles so the dispatcher and the direct call draw identical "random" values.
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each(rows)('$name routes to its handler with the right payload shape', (row) => {
    const game = buildGame();
    row.setup(game);
    const before = cloneDeep(game);
    // The direct handler throws on a bad setup, so a row can never pass by silently hitting the error path.
    const expected = row.direct(cloneDeep(game));

    const { state } = handleGameAction({ action: row.action, gameState: game, payload: row.payload });

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(state).toEqual(expected);
    if (row.changesState) expect(state).not.toEqual(before);
    else expect(state).toEqual(before);
  });
});
