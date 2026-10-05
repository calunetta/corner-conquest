import type { GameState, GameSettings, PlayerColor, Island } from '@/lib/types';
import { IslandType, ResourceType, GameStatus, MAP_COLS, MAP_ROWS } from '@/lib/types';
import { SPECIAL_CARDS } from './card-data';
import { PLAYER_COLORS } from './player-data';
import { createPlayer } from './player-factory';
import { generateIslandTerrain } from './map-generation';
import { pushLogEntry } from './log-entry';
import { defaultGameSettings } from './game-settings';

export { defaultGameSettings };

function createEmptyIsland(x: number, y: number): Island {
  return {
    id: `${x}-${y}`,
    x,
    y,
    type: IslandType.Empty,
    occupants: [],
    resources: [],
    positionedBy: [],
    monsters: [],
  };
}

export function initializeGame(
  gameId: string,
  gameName: string,
  maxPlayers: number,
  creator: { playerId: string; name: string; color: PlayerColor },
  numBots: number,
  debugMode: boolean = false,
  settings: GameSettings = defaultGameSettings,
): GameState {
  // Create initial map with all tiles as Empty type
  const map2D: Island[][] = Array.from({ length: MAP_ROWS }, (_, y) =>
    Array.from({ length: MAP_COLS }, (_, x) => createEmptyIsland(x, y)),
  );

  const players = [];
  const baseTiles = [];

  const basePositions = [
    { x: 0, y: 0 },
    { x: MAP_COLS - 1, y: MAP_ROWS - 1 },
    { x: 0, y: MAP_ROWS - 1 },
    { x: MAP_COLS - 1, y: 0 },
  ];

  const creatorSeatIndex = 0;
  const creatorPos = basePositions[creatorSeatIndex];

  const creatorPlayer = createPlayer(creatorSeatIndex, creator.playerId, creator.name, creator.color, false, creatorPos, settings, debugMode);
  players.push(creatorPlayer);

  // Update creator's base tile
  const creatorTile = map2D[creatorPos.y][creatorPos.x];
  creatorTile.type = IslandType.Base;
  creatorTile.owner = creatorSeatIndex;
  creatorTile.occupants = [{ playerId: creatorSeatIndex, armyId: creatorPlayer.armies[0].id }];
  creatorTile.resources = [
    { type: ResourceType.Food, amount: settings.baseResourceAmount },
    { type: ResourceType.Wood, amount: settings.baseResourceAmount },
    { type: ResourceType.Gold, amount: settings.baseResourceAmount },
  ];
  baseTiles.push({ owner: creatorSeatIndex, x: creatorPos.x, y: creatorPos.y });

  const usedColors = [creator.color];

  // Add bots to the game
  if (maxPlayers === 1 && numBots > 0) {
    for (let i = 0; i < numBots; i++) {
      const botSeatIndex = players.length;
      const botPos = basePositions[botSeatIndex];
      const availableColors = PLAYER_COLORS.filter((c) => !usedColors.includes(c));
      const botColor = availableColors[0];
      usedColors.push(botColor);

      const botPlayer = createPlayer(botSeatIndex, `bot_${i + 1}`, `Bot ${i + 1}`, botColor, true, botPos, settings, debugMode);
      players.push(botPlayer);

      // Update bot's base tile
      const botTile = map2D[botPos.y][botPos.x];
      botTile.type = IslandType.Base;
      botTile.owner = botSeatIndex;
      botTile.occupants = [{ playerId: botSeatIndex, armyId: botPlayer.armies[0].id }];
      botTile.resources = [
        { type: ResourceType.Food, amount: settings.baseResourceAmount },
        { type: ResourceType.Wood, amount: settings.baseResourceAmount },
        { type: ResourceType.Gold, amount: settings.baseResourceAmount },
      ];
      baseTiles.push({ owner: botSeatIndex, x: botPos.x, y: botPos.y });
    }
  }

  // Generate terrain for remaining tiles
  generateIslandTerrain(map2D, settings);

  // Prepare the card deck
  const initialDeck = SPECIAL_CARDS.filter((card) => settings.availableCards.includes(card));
  for (let i = initialDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [initialDeck[i], initialDeck[j]] = [initialDeck[j], initialDeck[i]];
  }

  // Flatten the 2D map to 1D for the game state
  const map = map2D.flat();

  // Create and return the game state
  const gameState: GameState = {
    id: gameId,
    name: gameName,
    status: GameStatus.Waiting,
    maxPlayers: maxPlayers === 1 ? numBots + 1 : maxPlayers,
    debugMode,
    settings,
    map,
    baseTiles,
    players,
    currentPlayerIndex: 0,
    turn: 0,
    log: [`Game '${gameName}' created by ${creator.name}! Waiting for players...`],
    winner: null,
    specialCardsDeck: initialDeck,
    discardPile: [],
    deathAnimations: [],
    combatState: null,
    monsterCombatState: null,
    productiveDialogState: null,
  };

  return gameState;
}

export function startGame(gameState: GameState, starterName: string): GameState {
  const newState = { ...gameState };
  newState.status = GameStatus.Playing;
  newState.turn = 1;
  pushLogEntry(newState, { category: 'system', message: `${starterName} started the game.` });
  pushLogEntry(newState, {
    category: 'turn',
    message: `It's now ${newState.players[0].name}'s turn.`,
    isPassive: true,
  });

  return newState;
}
