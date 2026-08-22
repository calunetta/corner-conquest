
import type { GameState, Island, Player, IslandResource, Monster, GameSettings, BaseTileInfo } from './types';
import { CardName, HAND_LIMIT } from './types';
import { BASE_CARDS } from './card-data';
import { PLAYER_COLORS } from './player-data';
import { IslandType, ResourceType, PlayerColor, MonsterName, GameStatus, AbilityName, MAP_COLS, MAP_ROWS } from './types';

export const defaultGameSettings: GameSettings = {
    victoryPointGoal: 30,
    vpPerIslandDiscovery: 1,
    initialDeployCost: 6,
    deployCostIncrement: 2,
    upgradeCost: 6,
    abilityCost: 15,
    baseResourceAmount: 1,
    resourceDensity: 0.6, // 60% chance for a tile to be resource vs monster
    availableCards: [...BASE_CARDS],
    availableAbilities: [AbilityName.Explorer, AbilityName.Collector],
    fogOfWar: true,
    gridSize: { rows: MAP_ROWS, cols: MAP_COLS },
};

const MONSTER_DATA: Record<number, { name: MonsterName, sprite: { idle: string, attack: string, death: string } }> = {
    1: { name: MonsterName.Lancer, sprite: { idle: '/sprites/lancer_idle.gif', attack: '/sprites/lancer_attack.gif', death: '/sprites/death.gif' } },
    2: { name: MonsterName.Bear, sprite: { idle: '/sprites/bear_idle.gif', attack: '/sprites/bear_attack.gif', death: '/sprites/death.gif' } },
    3: { name: MonsterName.Ogre, sprite: { idle: '/sprites/ogre_idle.gif', attack: '/sprites/ogre_attack.gif', death: '/sprites/death.gif' } },
    4: { name: MonsterName.Minotaur, sprite: { idle: '/sprites/minotaur_idle.gif', attack: '/sprites/minotaur_attack.gif', death: '/sprites/death.gif' } },
};

function generateMonsters(x: number, y: number): Monster[] {
    const monsters: Monster[] = [];
    const center = { x: Math.floor(MAP_COLS / 2), y: Math.floor(MAP_ROWS / 2) };
    const distance = Math.abs(x - center.x) + Math.abs(y - center.y);

    let possibleLevels: number[] = [];
    if (distance <= 1) { // Center
        possibleLevels = [3, 4];
    } else if (distance <= 3) { // Mid-ring
        possibleLevels = [1, 2, 3];
    } else { // Outer ring
        possibleLevels = [1, 2];
    }

    const hasBigMonster = possibleLevels.includes(3) || possibleLevels.includes(4) ? Math.random() < 0.3 : false;

    if (hasBigMonster) {
        const bigMonsterLevel = possibleLevels.includes(4) && Math.random() < 0.25 ? 4 : 3;
        const bigMonsterData = MONSTER_DATA[bigMonsterLevel];
        monsters.push({
            name: bigMonsterData.name,
            level: bigMonsterLevel,
            sprite: bigMonsterData.sprite
        });

        const littleMonsterLevel = Math.random() < 0.6 ? 1 : 2;
        const littleMonsterData = MONSTER_DATA[littleMonsterLevel];
         monsters.push({
             name: littleMonsterData.name,
             level: littleMonsterLevel,
             sprite: littleMonsterData.sprite
        });

    } else {
        const numMonsters = Math.random() < 0.7 ? 1 : 2;
        let availableLevels = possibleLevels.filter(l => l <= 2);
        if (availableLevels.length === 0) availableLevels = [1]; 

        for (let i = 0; i < numMonsters; i++) {
             const level = availableLevels[Math.floor(Math.random() * availableLevels.length)];
             const monsterData = MONSTER_DATA[level];
             monsters.push({
                 name: monsterData.name,
                 level: level,
                 sprite: monsterData.sprite
             });
        }
    }

    // Prevent duplicate monsters on the same tile
    const uniqueMonsters = monsters.reduce((acc, current) => {
        if (!acc.find(item => item.name === current.name)) {
            acc.push(current);
        }
        return acc;
    }, [] as Monster[]);

    return uniqueMonsters;
}

export function createPlayer(
    seatIndex: number,
    playerId: string,
    name: string,
    color: PlayerColor,
    isBot: boolean,
    basePos: { x: number, y: number },
    settings: GameSettings,
    debugMode: boolean
): Player {
    let startingCards: CardName[] = [];
    if (debugMode && !isBot) { // Only give debug cards to the human player
        startingCards = [...new Set(BASE_CARDS)];
    }
    
    let revealedTiles: string[] = [];
    if (settings.fogOfWar) {
        revealedTiles.push(`${basePos.x}-${basePos.y}`);
    }


    return {
        id: seatIndex,
        playerId,
        name,
        color,
        isBot,
        armies: [{ id: 0, position: basePos, hasActed: false }],
        resources: { [ResourceType.Gems]: 0, [ResourceType.Iron]: 0, [ResourceType.Wheat]: 0 },
        armyCount: 1,
        attackPower: 0,
        nextArmyCost: settings.initialDeployCost,
        victoryPoints: 0,
        specialCards: startingCards,
        positions: [],
        hasExtraMove: false,
        actionsThisTurn: [],
        passiveAbilities: { [AbilityName.Explorer]: false, [AbilityName.Collector]: false },
        isSabotaged: false,
        efficientActive: false,
        masterBuilderActive: false,
        reinforceActive: false,
        revealedTiles,
    };
}

export function initializeGame(
    gameId: string, 
    gameName: string, 
    maxPlayers: number, 
    creator: { playerId: string, name: string, color: PlayerColor }, 
    numBots: number, 
    debugMode: boolean = false,
    settings: GameSettings = defaultGameSettings
): GameState {
  const map2D: Island[][] = Array.from({ length: MAP_ROWS }, (_, y) =>
    Array.from({ length: MAP_COLS }, (_, x) => ({
      id: `${x}-${y}`,
      x,
      y,
      type: IslandType.Empty,
      occupants: [],
      resources: [],
      positionedBy: [],
      monsters: [],
    }))
  );

  const players: Player[] = [];
  const baseTiles: BaseTileInfo[] = [];
  
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

  map2D[creatorPos.y][creatorPos.x] = {
      ...map2D[creatorPos.y][creatorPos.x],
      type: IslandType.Base,
      owner: creatorSeatIndex,
      occupants: [{ playerId: creatorSeatIndex, armyId: creatorPlayer.armies[0].id }],
      resources: [
        { type: ResourceType.Gems, amount: settings.baseResourceAmount }, 
        { type: ResourceType.Iron, amount: settings.baseResourceAmount }, 
        { type: ResourceType.Wheat, amount: settings.baseResourceAmount }
      ], 
  };
  baseTiles.push({ owner: creatorSeatIndex, x: creatorPos.x, y: creatorPos.y });
  
  const usedColors = [creator.color];

  if (maxPlayers === 1 && numBots > 0) {
    for (let i = 0; i < numBots; i++) {
        const botSeatIndex = players.length;
        const botPos = basePositions[botSeatIndex];
        const availableColors = PLAYER_COLORS.filter(c => !usedColors.includes(c));
        const botColor = availableColors[0];
        usedColors.push(botColor);

        const botPlayer = createPlayer(botSeatIndex, `bot_${i+1}`, `Bot ${i+1}`, botColor, true, botPos, settings, debugMode);
        players.push(botPlayer);

        map2D[botPos.y][botPos.x] = {
            ...map2D[botPos.y][botPos.x],
            type: IslandType.Base,
            owner: botSeatIndex,
            occupants: [{playerId: botSeatIndex, armyId: botPlayer.armies[0].id}],
            resources: [
                { type: ResourceType.Gems, amount: settings.baseResourceAmount }, 
                { type: ResourceType.Iron, amount: settings.baseResourceAmount }, 
                { type: ResourceType.Wheat, amount: settings.baseResourceAmount }
            ], 
        };
        baseTiles.push({ owner: botSeatIndex, x: botPos.x, y: botPos.y });
    }
  }


  const center = { x: Math.floor(MAP_COLS / 2), y: Math.floor(MAP_ROWS / 2) };

  for (let y = 0; y < MAP_ROWS; y++) {
    for (let x = 0; x < MAP_COLS; x++) {
      if (map2D[y][x].type === IslandType.Base && map2D[y][x].owner !== undefined) continue;

      let islandType: IslandType;
      
      if (x === center.x && y === center.y) {
          islandType = IslandType.Monster;
          const bossMonsterData = MONSTER_DATA[4];
          map2D[y][x].monsters = [{
              name: bossMonsterData.name,
              level: 4,
              sprite: bossMonsterData.sprite
          }];
          map2D[y][x].type = islandType;
          continue; 
      }

      const distance = Math.abs(x - center.x) + Math.abs(y - center.y);
      
      let rand = Math.random();
      if (distance <= 1) { 
        if (rand < settings.resourceDensity - 0.1) islandType = IslandType.Resource; 
        else if (rand < 0.8) islandType = IslandType.Special;  
        else islandType = IslandType.Monster; 
      } else {
        if (rand < settings.resourceDensity) islandType = IslandType.Resource;
        else if (rand < 0.95) islandType = IslandType.Monster;
        else islandType = IslandType.Special;
      }
      
      map2D[y][x].type = islandType;

      if (islandType === IslandType.Resource) {
        const resourceTypes: ResourceType[] = [ResourceType.Gems, ResourceType.Iron, ResourceType.Wheat];
        const availableResources = [...resourceTypes];
        
        const numResourceTypes = (distance <= 3 && Math.random() < 0.4) ? 2 : 1;
        const islandResources: IslandResource[] = [];

        if (numResourceTypes === 1) {
            const randomIndex = Math.floor(Math.random() * availableResources.length);
            const selectedResourceType = availableResources[randomIndex];
            islandResources.push({ type: selectedResourceType, amount: 2 * settings.baseResourceAmount });
        } else {
            for(let i=0; i < numResourceTypes; i++) {
                const randomIndex = Math.floor(Math.random() * availableResources.length);
                const selectedResourceType = availableResources.splice(randomIndex, 1)[0];
                const amount = (Math.random() < 0.5 ? 1 : 2) * settings.baseResourceAmount;
                islandResources.push({ type: selectedResourceType, amount });
            }
        }
        map2D[y][x].resources = islandResources;
      } else if(islandType === IslandType.Monster) {
          map2D[y][x].monsters = generateMonsters(x, y);
      }
    }
  }

  const finalCardDeck = BASE_CARDS.filter(card => settings.availableCards.includes(card));
  const initialDeck = [...finalCardDeck, ...finalCardDeck];
  for (let i = initialDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [initialDeck[i], initialDeck[j]] = [initialDeck[j], initialDeck[i]];
  }

  const map = map2D.flat();

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
    let newState = { ...gameState };
    newState.status = GameStatus.Playing;
    newState.turn = 1;
    newState.log.push(`${starterName} started the game! It's now ${newState.players[0].name}'s turn.`);
    
    return newState;
}
