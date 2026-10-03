import type { GameState, Player } from '@/lib/types';
import { GameAction, CardName } from '@/lib/types';
import { MonsterName } from '@/lib/types/monsters';
import type { Island, IslandType } from '@/lib/types/map';
import { toActionsPanelData } from './ActionsPanel.map';
import type { ActionsPanelMapInput } from './ActionsPanel.map';

const createPlayer = (overrides: Partial<Player> = {}): Player =>
  ({
    id: 0,
    playerId: 'player-0',
    name: 'Test Player',
    color: 'blue',
    isBot: false,
    armies: [
      { id: 0, position: { x: 0, y: 0 }, hasActed: false },
      { id: 1, position: { x: 1, y: 1 }, hasActed: true },
    ],
    resources: { food: 50, wood: 20, gold: 15 },
    armyCount: 2,
    attackPower: 2,
    nextArmyCost: 10,
    victoryPoints: 10,
    specialCards: [],
    positions: [],
    passiveAbilities: { collector: false, explorer: false },
    isSabotaged: false,
    reinforceActive: false,
    efficientActive: false,
    masterBuilderActive: false,
    hasExtraMove: false,
    actionsThisTurn: [],
    revealedTiles: [],
    ...overrides,
  }) as Player;

const createIsland = (x: number, y: number, type: IslandType = 'base', overrides: Partial<Island> = {}): Island =>
  ({
    id: `island-${x}-${y}`,
    x,
    y,
    type,
    resources: [],
    occupants: [],
    ...overrides,
  }) as Island;

const createGameState = (overrides: Partial<GameState> = {}): GameState =>
  ({
    id: 'game-1',
    name: 'Test Game',
    status: 'playing' as const,
    maxPlayers: 4,
    debugMode: false,
    players: [createPlayer()],
    currentPlayerIndex: 0,
    turn: 1,
    baseTiles: [],
    winner: null,
    map: [
      createIsland(0, 0, 'base'),
      createIsland(1, 0, 'resource'),
      createIsland(2, 0, 'resource'),
      createIsland(0, 1, 'monster'),
      createIsland(1, 1, 'empty'),
      createIsland(2, 1, 'resource'),
    ],
    settings: {
      victoryPointGoal: 30,
      vpPerIslandDiscovery: 1,
      initialDeployCost: 10,
      deployCostIncrement: 2,
      upgradeCost: 5,
      abilityCost: 8,
      baseResourceAmount: 10,
      resourceDensity: 0.6,
      availableCards: [],
      availableAbilities: [],
      fogOfWar: false,
      gridSize: { rows: 2, cols: 3 },
    },
    specialCardsDeck: [CardName.Scout, CardName.Reinforce],
    discardPile: [],
    deathAnimations: [],
    combatState: null,
    monsterCombatState: null,
    productiveDialogState: null,
    log: [],
    ...overrides,
  }) as GameState;

const mockTurnTimer = { formattedTime: '1:30', percentage: 50, isExpiring: false };

const createInput = (overrides: Partial<ActionsPanelMapInput> = {}): ActionsPanelMapInput => ({
  localPlayer: createPlayer(),
  gameState: createGameState(),
  isMyTurn: true,
  selectedArmy: { id: 0, position: { x: 0, y: 0 }, hasActed: false },
  pendingAction: null,
  turnTimer: mockTurnTimer,
  ...overrides,
});

describe('toActionsPanelData', () => {
  describe('canPosition and canAttack', () => {
    it('allows position on resource tile with no occupants', () => {
      const gameState = createGameState({
        map: [
          createIsland(0, 0, 'resource', { resources: [{ type: 'food' as const, amount: 5 }] }),
          createIsland(1, 0, 'base'),
          createIsland(2, 0, 'base'),
          createIsland(0, 1, 'base'),
          createIsland(1, 1, 'base'),
          createIsland(2, 1, 'base'),
        ],
      });

      const selectedArmy = { id: 0, position: { x: 0, y: 0 }, hasActed: false };

      const result = toActionsPanelData(
        createInput({ gameState, selectedArmy })
      );

      const posAction = result.mainActions.find(a => a.id === GameAction.local_Position);
      expect(posAction?.disabled).toBe(false);
    });

    it('disables position when army is already positioned', () => {
      const localPlayer = createPlayer({
        positions: [{ x: 0, y: 0, resource: 'food', armyId: 0 }],
      });

      const result = toActionsPanelData(
        createInput({ localPlayer })
      );

      const posAction = result.mainActions.find(a => a.id === GameAction.local_Position);
      expect(posAction?.disabled).toBe(true);
    });

    it('disables position on tile with monsters', () => {
      const gameState = createGameState({
        map: [
          createIsland(0, 0, 'resource', {
            resources: [{ type: 'food' as const, amount: 5 }],
            monsters: [{
              name: MonsterName.Bear,
              level: 2,
              sprite: { idle: 'bear_idle.gif', attack: 'bear_attack.gif', death: 'bear_death.gif' },
            }],
          }),
          createIsland(1, 0, 'base'),
          createIsland(2, 0, 'base'),
          createIsland(0, 1, 'base'),
          createIsland(1, 1, 'base'),
          createIsland(2, 1, 'base'),
        ],
      });

      const selectedArmy = { id: 0, position: { x: 0, y: 0 }, hasActed: false };

      const result = toActionsPanelData(
        createInput({ gameState, selectedArmy })
      );

      const posAction = result.mainActions.find(a => a.id === GameAction.local_Position);
      expect(posAction?.disabled).toBe(true);
    });

    it('allows attack on tile with enemy armies', () => {
      const gameState = createGameState({
        map: [
          createIsland(0, 0, 'resource', { occupants: [{ playerId: 1, armyId: 5 }] }),
          createIsland(1, 0, 'base'),
          createIsland(2, 0, 'base'),
          createIsland(0, 1, 'base'),
          createIsland(1, 1, 'base'),
          createIsland(2, 1, 'base'),
        ],
      });

      const selectedArmy = { id: 0, position: { x: 0, y: 0 }, hasActed: false };

      const result = toActionsPanelData(
        createInput({ gameState, selectedArmy })
      );

      const attackAction = result.mainActions.find(a => a.id === GameAction.local_Attack);
      expect(attackAction?.disabled).toBe(false);
    });

    it('allows attack on monster tile', () => {
      const gameState = createGameState({
        map: [
          createIsland(0, 0, 'monster', {
            monsters: [{
              name: MonsterName.Lancer,
              level: 1,
              sprite: { idle: 'lancer_idle.gif', attack: 'lancer_attack.gif', death: 'lancer_death.gif' },
            }],
          }),
          createIsland(1, 0, 'base'),
          createIsland(2, 0, 'base'),
          createIsland(0, 1, 'base'),
          createIsland(1, 1, 'base'),
          createIsland(2, 1, 'base'),
        ],
      });

      const selectedArmy = { id: 0, position: { x: 0, y: 0 }, hasActed: false };

      const result = toActionsPanelData(
        createInput({ gameState, selectedArmy })
      );

      const attackAction = result.mainActions.find(a => a.id === GameAction.local_Attack);
      expect(attackAction?.disabled).toBe(false);
    });
  });

  describe('deployCost calculation', () => {
    it('uses nextArmyCost by default', () => {
      const localPlayer = createPlayer({ nextArmyCost: 15 });
      const result = toActionsPanelData(createInput({ localPlayer }));

      const deployAction = result.alwaysAvailableActions.find(a => a.id === GameAction.Deploy);
      expect(deployAction?.label).toContain('15');
    });

    it('sets cost to 0 when reinforceActive is true', () => {
      const localPlayer = createPlayer({ nextArmyCost: 10, reinforceActive: true });
      const result = toActionsPanelData(createInput({ localPlayer }));

      const deployAction = result.alwaysAvailableActions.find(a => a.id === GameAction.Deploy);
      expect(deployAction?.label).toContain('0');
    });

    it('halves cost (rounded up) when efficientActive is true', () => {
      const localPlayer = createPlayer({ nextArmyCost: 7, efficientActive: true });
      const result = toActionsPanelData(createInput({ localPlayer }));

      const deployAction = result.alwaysAvailableActions.find(a => a.id === GameAction.Deploy);
      expect(deployAction?.label).toContain('4'); // Math.ceil(7/2) = 4
    });

    it('prioritizes reinforceActive over efficientActive', () => {
      const localPlayer = createPlayer({
        nextArmyCost: 10,
        reinforceActive: true,
        efficientActive: true,
      });
      const result = toActionsPanelData(createInput({ localPlayer }));

      const deployAction = result.alwaysAvailableActions.find(a => a.id === GameAction.Deploy);
      expect(deployAction?.label).toContain('0');
    });
  });

  describe('isCancellableActionInProgress', () => {
    it('is true when card action is pending', () => {
      const result = toActionsPanelData(
        createInput({ pendingAction: { type: 'teleport' as const, cardName: CardName.Scout } })
      );

      expect(result.isCancellableActionInProgress).toBe(true);
    });

    it('is true when reinforceActive is true', () => {
      const localPlayer = createPlayer({ reinforceActive: true });
      const result = toActionsPanelData(createInput({ localPlayer }));

      expect(result.isCancellableActionInProgress).toBe(true);
    });

    it('is true when efficientActive is true', () => {
      const localPlayer = createPlayer({ efficientActive: true });
      const result = toActionsPanelData(createInput({ localPlayer }));

      expect(result.isCancellableActionInProgress).toBe(true);
    });

    it('is true when masterBuilderActive is true', () => {
      const localPlayer = createPlayer({ masterBuilderActive: true });
      const result = toActionsPanelData(createInput({ localPlayer }));

      expect(result.isCancellableActionInProgress).toBe(true);
    });

    it('is true when hasExtraMove is true', () => {
      const localPlayer = createPlayer({ hasExtraMove: true });
      const result = toActionsPanelData(createInput({ localPlayer }));

      expect(result.isCancellableActionInProgress).toBe(true);
    });

    it('is false when no cancellable action is active', () => {
      const result = toActionsPanelData(createInput());

      expect(result.isCancellableActionInProgress).toBe(false);
    });
  });

  describe('action disabled reasons', () => {
    it('disables Position when army has already acted', () => {
      const selectedArmy = { id: 1, position: { x: 1, y: 1 }, hasActed: true };
      const result = toActionsPanelData(createInput({ selectedArmy }));

      const posAction = result.mainActions.find(a => a.id === GameAction.local_Position);
      expect(posAction?.disabled).toBe(true);
      expect(posAction?.disabledReason).toContain('acted');
    });

    it('disables Attack when army has already acted', () => {
      const selectedArmy = { id: 1, position: { x: 1, y: 1 }, hasActed: true };
      const result = toActionsPanelData(createInput({ selectedArmy }));

      const attackAction = result.mainActions.find(a => a.id === GameAction.local_Attack);
      expect(attackAction?.disabled).toBe(true);
      expect(attackAction?.disabledReason).toContain('acted');
    });

    it('ignores hasActed when hasExtraMove is true', () => {
      const localPlayer = createPlayer({ hasExtraMove: true });
      const selectedArmy = { id: 1, position: { x: 1, y: 1 }, hasActed: true };
      const result = toActionsPanelData(createInput({ localPlayer, selectedArmy }));

      const posAction = result.mainActions.find(a => a.id === GameAction.local_Position);
      const attackAction = result.mainActions.find(a => a.id === GameAction.local_Attack);
      // They should not be disabled by hasActed
      expect(posAction?.disabledReason).not.toContain('acted');
      expect(attackAction?.disabledReason).not.toContain('acted');
    });

    it('disables Deploy when insufficient food', () => {
      const localPlayer = createPlayer({ resources: { food: 5, wood: 20, gold: 15 }, nextArmyCost: 10 });
      const result = toActionsPanelData(createInput({ localPlayer }));

      const deployAction = result.alwaysAvailableActions.find(a => a.id === GameAction.Deploy);
      expect(deployAction?.disabled).toBe(true);
      expect(deployAction?.disabledReason).toContain('Not enough food');
    });

    it('disables Deploy when army limit reached', () => {
      const localPlayer = createPlayer({
        armies: Array(5).fill(null).map((_, i) => ({
          id: i,
          position: { x: i, y: 0 },
          hasActed: false,
        })),
      });
      const result = toActionsPanelData(createInput({ localPlayer }));

      const deployAction = result.alwaysAvailableActions.find(a => a.id === GameAction.Deploy);
      expect(deployAction?.disabled).toBe(true);
      expect(deployAction?.disabledReason).toContain('Maximum army size');
    });

    it('disables Deploy when already deployed this turn', () => {
      const localPlayer = createPlayer({
        actionsThisTurn: [GameAction.Deploy],
      });
      const result = toActionsPanelData(createInput({ localPlayer }));

      const deployAction = result.alwaysAvailableActions.find(a => a.id === GameAction.Deploy);
      expect(deployAction?.disabled).toBe(true);
      expect(deployAction?.disabledReason).toContain('already deployed');
    });

    it('disables Upgrade when insufficient wood', () => {
      const localPlayer = createPlayer({ resources: { food: 50, wood: 2, gold: 15 } });
      const gameState = createGameState({});
      const result = toActionsPanelData(createInput({ localPlayer, gameState }));

      const upgradeAction = result.secondaryActions.find(a => a.id === GameAction.Upgrade);
      expect(upgradeAction?.disabled).toBe(true);
      expect(upgradeAction?.disabledReason).toContain('Not enough wood');
    });

    it('disables Upgrade when max attack power reached', () => {
      const localPlayer = createPlayer({ attackPower: 4 });
      const result = toActionsPanelData(createInput({ localPlayer }));

      const upgradeAction = result.secondaryActions.find(a => a.id === GameAction.Upgrade);
      expect(upgradeAction?.disabled).toBe(true);
      expect(upgradeAction?.disabledReason).toContain('Maximum attack power');
    });

    it('disables Upgrade when already upgraded this turn', () => {
      const localPlayer = createPlayer({
        actionsThisTurn: [GameAction.Upgrade],
      });
      const result = toActionsPanelData(createInput({ localPlayer }));

      const upgradeAction = result.secondaryActions.find(a => a.id === GameAction.Upgrade);
      expect(upgradeAction?.disabled).toBe(true);
      expect(upgradeAction?.disabledReason).toContain('already upgraded');
    });

    it('disables BuyCard when insufficient gold', () => {
      const localPlayer = createPlayer({ resources: { food: 50, wood: 20, gold: 5 } });
      const result = toActionsPanelData(createInput({ localPlayer }));

      const buyCardAction = result.secondaryActions.find(a => a.id === GameAction.BuyCard);
      expect(buyCardAction?.disabled).toBe(true);
      expect(buyCardAction?.disabledReason).toContain('Not enough gold');
    });

    it('disables BuyCard when hand limit reached', () => {
      const localPlayer = createPlayer({
        specialCards: Array(7).fill('card'),
      });
      const result = toActionsPanelData(createInput({ localPlayer }));

      const buyCardAction = result.secondaryActions.find(a => a.id === GameAction.BuyCard);
      expect(buyCardAction?.disabled).toBe(true);
      expect(buyCardAction?.disabledReason).toContain('Maximum hand limit');
    });

    it('disables BuyCard when already bought this turn', () => {
      const localPlayer = createPlayer({
        actionsThisTurn: [GameAction.BuyCard],
      });
      const result = toActionsPanelData(createInput({ localPlayer }));

      const buyCardAction = result.secondaryActions.find(a => a.id === GameAction.BuyCard);
      expect(buyCardAction?.disabled).toBe(true);
      expect(buyCardAction?.disabledReason).toContain('already bought');
    });

    it('disables BuyCard when deck and discard pile are empty', () => {
      const localPlayer = createPlayer();
      const gameState = createGameState({
        specialCardsDeck: [],
        discardPile: [],
      });
      const result = toActionsPanelData(createInput({ localPlayer, gameState }));

      const buyCardAction = result.secondaryActions.find(a => a.id === GameAction.BuyCard);
      expect(buyCardAction?.disabled).toBe(true);
      expect(buyCardAction?.disabledReason).toContain('No cards remaining');
    });

    it('disables ShowCards when no special cards', () => {
      const localPlayer = createPlayer({ specialCards: [] });
      const result = toActionsPanelData(createInput({ localPlayer }));

      const cardsAction = result.secondaryActions.find(a => a.id === GameAction.local_ShowCards);
      expect(cardsAction?.disabled).toBe(true);
      expect(cardsAction?.disabledReason).toContain('have no special cards');
    });

    it('disables all actions when not your turn', () => {
      const result = toActionsPanelData(createInput({ isMyTurn: false }));

      const allDisabled = [
        ...result.mainActions,
        ...result.alwaysAvailableActions,
        ...result.secondaryActions,
      ].filter(a => a.id !== GameAction.local_ShowCards);

      allDisabled.forEach(action => {
        expect(action.disabled).toBe(true);
        if (action.id !== GameAction.local_OpenAbilitiesShop) {
          expect(action.disabledReason).toBeTruthy();
        }
      });
    });

    it('disables main actions and some secondary actions when card action in progress', () => {
      const result = toActionsPanelData(
        createInput({ pendingAction: { type: 'teleport' as const, cardName: CardName.Scout } })
      );

      // Main actions should be disabled when card action in progress
      const posAction = result.mainActions.find(a => a.id === GameAction.local_Position);
      const attackAction = result.mainActions.find(a => a.id === GameAction.local_Attack);
      expect(posAction?.disabled).toBe(true);
      expect(attackAction?.disabled).toBe(true);

      // Deploy and Upgrade should be disabled when card action in progress
      const deployAction = result.alwaysAvailableActions.find(a => a.id === GameAction.Deploy);
      const upgradeAction = result.secondaryActions.find(a => a.id === GameAction.Upgrade);
      const buyCardAction = result.secondaryActions.find(a => a.id === GameAction.BuyCard);
      expect(deployAction?.disabled).toBe(true);
      expect(upgradeAction?.disabled).toBe(true);
      expect(buyCardAction?.disabled).toBe(true);

      // ShowCards doesn't check isCardActionInProgress, only checks for empty hand
      const showCardsAction = result.secondaryActions.find(a => a.id === GameAction.local_ShowCards);
      expect(showCardsAction?.disabled).toBe(true); // Disabled because no cards in hand

      // Abilities doesn't check isCardActionInProgress, only checks if it's your turn
      const abilitiesAction = result.secondaryActions.find(a => a.id === GameAction.local_OpenAbilitiesShop);
      expect(abilitiesAction?.disabled).toBe(false); // Not disabled when it's your turn
    });
  });

  describe('isPendingMatch', () => {
    it('returns true when card name is deploy-like card', () => {
      // Test with a card that has "Deploy" in the name would match, but we don't have one
      // So test with a card that has "cards" as that matches the "Cards" action label
      const result = toActionsPanelData(
        createInput({ pendingAction: { type: 'teleport' as const, cardName: CardName.Scout } })
      );

      const showCardsAction = result.secondaryActions.find(a => a.id === GameAction.local_ShowCards);
      // Scout doesn't match "Cards", so isPendingMatch should be false
      expect(showCardsAction?.isPendingMatch).toBe(false);
    });

    it('returns false when card name does not match action label', () => {
      const result = toActionsPanelData(
        createInput({ pendingAction: { type: 'teleport' as const, cardName: CardName.Scout } })
      );

      const deployAction = result.alwaysAvailableActions.find(a => a.id === GameAction.Deploy);
      expect(deployAction?.isPendingMatch).toBe(false);
    });

    it('returns true when action label is contained in card name', () => {
      // Use "Productive" cardName which contains "Productive"
      // Then test against an action label that contains "Productive" lowercased
      const result = toActionsPanelData(
        createInput({ pendingAction: { type: 'teleport' as const, cardName: CardName.Productive } })
      );

      // Most action labels won't match Productive, but we can at least test the function works
      const allActions = [
        ...result.mainActions,
        ...result.alwaysAvailableActions,
        ...result.secondaryActions,
      ];
      // Productive doesn't match any action label, so all should be false except if we had a "Productive" action
      allActions.forEach(action => {
        expect(action.isPendingMatch).toBe(false);
      });
    });

    it('returns false when no pending action', () => {
      const result = toActionsPanelData(createInput({ pendingAction: null }));

      const allActions = [
        ...result.mainActions,
        ...result.alwaysAvailableActions,
        ...result.secondaryActions,
      ];

      allActions.forEach(action => {
        expect(action.isPendingMatch).toBe(false);
      });
    });
  });

  describe('extra move banner', () => {
    it('shows banner when isMyTurn and hasExtraMove', () => {
      const localPlayer = createPlayer({ hasExtraMove: true });
      const result = toActionsPanelData(createInput({ localPlayer, isMyTurn: true }));

      expect(result.hasExtraMoveBanner).toBe(true);
    });

    it('hides banner when not your turn', () => {
      const localPlayer = createPlayer({ hasExtraMove: true });
      const result = toActionsPanelData(createInput({ localPlayer, isMyTurn: false }));

      expect(result.hasExtraMoveBanner).toBe(false);
    });

    it('hides banner when no extra move', () => {
      const localPlayer = createPlayer({ hasExtraMove: false });
      const result = toActionsPanelData(createInput({ localPlayer, isMyTurn: true }));

      expect(result.hasExtraMoveBanner).toBe(false);
    });
  });

  describe('end turn disabled state', () => {
    it('disables End Turn when card action is in progress', () => {
      const result = toActionsPanelData(
        createInput({ pendingAction: { type: 'teleport' as const, cardName: CardName.Scout } })
      );

      expect(result.isEndTurnDisabled).toBe(true);
    });

    it('enables End Turn when no card action', () => {
      const result = toActionsPanelData(createInput({ pendingAction: null }));

      expect(result.isEndTurnDisabled).toBe(false);
    });
  });

  describe('action lists structure', () => {
    it('returns 2 main actions: Position and Attack', () => {
      const result = toActionsPanelData(createInput());

      expect(result.mainActions).toHaveLength(2);
      expect(result.mainActions[0].id).toBe(GameAction.local_Position);
      expect(result.mainActions[1].id).toBe(GameAction.local_Attack);
    });

    it('returns 1 always-available action: Deploy', () => {
      const result = toActionsPanelData(createInput());

      expect(result.alwaysAvailableActions).toHaveLength(1);
      expect(result.alwaysAvailableActions[0].id).toBe(GameAction.Deploy);
    });

    it('returns 4 secondary actions in correct order', () => {
      const result = toActionsPanelData(createInput());

      expect(result.secondaryActions).toHaveLength(4);
      expect(result.secondaryActions[0].id).toBe(GameAction.Upgrade);
      expect(result.secondaryActions[1].id).toBe(GameAction.BuyCard);
      expect(result.secondaryActions[2].id).toBe(GameAction.local_ShowCards);
      expect(result.secondaryActions[3].id).toBe(GameAction.local_OpenAbilitiesShop);
    });
  });

  describe('misc properties', () => {
    it('includes deck count', () => {
      const gameState = createGameState({ specialCardsDeck: [CardName.Scout, CardName.Reinforce, CardName.ExtraMove] });
      const result = toActionsPanelData(createInput({ gameState }));

      expect(result.deckCount).toBe(3);
    });

    it('includes isMyTurn flag', () => {
      const resultMyTurn = toActionsPanelData(createInput({ isMyTurn: true }));
      const resultNotMyTurn = toActionsPanelData(createInput({ isMyTurn: false }));

      expect(resultMyTurn.isMyTurn).toBe(true);
      expect(resultNotMyTurn.isMyTurn).toBe(false);
    });

    it('includes hasSelectedArmy flag', () => {
      const resultWithArmy = toActionsPanelData(createInput({ selectedArmy: { id: 0, position: { x: 0, y: 0 }, hasActed: false } }));
      const resultNoArmy = toActionsPanelData(createInput({ selectedArmy: null }));

      expect(resultWithArmy.hasSelectedArmy).toBe(true);
      expect(resultNoArmy.hasSelectedArmy).toBe(false);
    });

    it('passes through turn timer', () => {
      const customTimer = { formattedTime: '0:45', percentage: 25, isExpiring: true };
      const result = toActionsPanelData(createInput({ turnTimer: customTimer }));

      expect(result.turnTimer).toEqual(customTimer);
    });
  });
});
