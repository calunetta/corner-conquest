

import type { GameState, Island, Player, ResourceType, IslandType, PlayerColor, IslandResource, Monster, GameSettings, MonsterName } from './types';
import { BASE_CARDS, SPECIAL_CARDS } from './card-data';
import { PLAYER_COLORS } from './player-data';
import { MAP_COLS, MAP_ROWS } from './game-logic';

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
    availableAbilities: ['explorer', 'collector'],
};

const MONSTER_DATA: Record<number, { name: MonsterName, sprite: { idle: string, attack: string } }> = {
    1: { name: 'Lancer', sprite: { idle: '/sprites/lancer_idle.gif', attack: '/sprites/lancer_attack.gif' } },
    2: { name: 'Bear', sprite: { idle: '/sprites/bear_idle.gif', attack: '/sprites/bear_attack.gif' } },
    3: { name: 'Ogre', sprite: { idle: '/sprites/ogre_idle.gif', attack: '/sprites/ogre_attack.gif' } },
    4: { name: 'Minotaur', sprite: { idle: '/sprites/minotaur_idle.gif', attack: '/sprites/minotaur_attack.gif' } },
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

export function initializeGame(
    gameId: string, 
    gameName: string, 
    maxPlayers: number, 
    creator: { playerId: string, name: string, color: PlayerColor }, 
    numBots: number, 
    debugMode: boolean = false,
    settings: GameSettings = defaultGameSettings
): GameState {
  const map: Island[][] = Array.from({ length: MAP_ROWS }, (_, y) =>
    Array.from({ length: MAP_COLS }, (_, x) => ({
      id: `${x}-${y}`,
      x,
      y,
      type: 'empty',
      isHidden: !debugMode,
      occupants: [],
      resources: [],
      positionedBy: [],
      monsters: [],
    }))
  );

  const players: Player[] = [];
  
  const basePositions = [
    { x: 0, y: 0 },
    { x: MAP_COLS - 1, y: MAP_ROWS - 1 },
    { x: 0, y: MAP_ROWS - 1 },
    { x: MAP_COLS - 1, y: 0 },
  ];
  
  const creatorSeatIndex = 0;
  const creatorPos = basePositions[creatorSeatIndex];

  const initialArmy = { id: 0, position: creatorPos, hasActed: false };
  map[creatorPos.y][creatorPos.x] = {
      ...map[creatorPos.y][creatorPos.x],
      type: 'base',
      owner: creatorSeatIndex,
      isHidden: false,
      occupants: [{ playerId: creatorSeatIndex, armyId: initialArmy.id }],
      resources: [
        { type: 'gems', amount: 1 }, 
        { type: 'iron', amount: 1 }, 
        { type: 'food', amount: 1 }
      ], 
  };
  
  players.push({
      id: creatorSeatIndex,
      playerId: creator.playerId,
      name: creator.name,
      color: creator.color,
      isBot: false,
      armies: [initialArmy],
      resources: { gems: 0, iron: 0, food: 0 },
      armyCount: 1,
      attackPower: 0,
      nextArmyCost: settings.initialDeployCost,
      victoryPoints: 0,
      specialCards: debugMode ? [...new Set(BASE_CARDS)] : ['Extra Move', 'Steal Resource', 'Decide Dice Roll'],
      positions: [],
      hasExtraMove: false,
      actionsThisTurn: [],
      passiveAbilities: { explorer: false, collector: false },
      isSabotaged: false,
      reinforceActive: false,
      scoutActive: false,
      wealthyActive: false,
      efficientActive: false,
      masterBuilderActive: false,
  });

  const usedColors = [creator.color];

  if (maxPlayers === 1 && numBots > 0) {
    for (let i = 0; i < numBots; i++) {
        const botSeatIndex = players.length;
        const botPos = basePositions[botSeatIndex];
        const availableColors = PLAYER_COLORS.filter(c => !usedColors.includes(c));
        const botColor = availableColors[0];
        usedColors.push(botColor);

        const botArmy = { id: 0, position: botPos, hasActed: false };
        map[botPos.y][botPos.x] = {
            ...map[botPos.y][botPos.x],
            type: 'base',
            owner: botSeatIndex,
            isHidden: false,
            occupants: [{playerId: botSeatIndex, armyId: botArmy.id}],
            resources: [
                { type: 'gems', amount: 1 }, 
                { type: 'iron', amount: 1 }, 
                { type: 'food', amount: 1 }
            ], 
        };

        players.push({
            id: botSeatIndex,
            playerId: `bot_${i+1}`,
            name: `Bot ${i+1}`,
            color: botColor,
            isBot: true,
            armies: [botArmy],
            resources: debugMode ? { gems: 20, iron: 20, food: 20 } : { gems: 0, iron: 0, food: 0 },
            armyCount: 1,
            attackPower: 0,
            nextArmyCost: settings.initialDeployCost,
            victoryPoints: 0,
            specialCards: [],
            positions: [],
            hasExtraMove: false,
            actionsThisTurn: [],
            passiveAbilities: { explorer: false, collector: false },
            isSabotaged: false,
            reinforceActive: false,
            scoutActive: false,
            wealthyActive: false,
            efficientActive: false,
            masterBuilderActive: false,
        });
    }
  }


  const center = { x: Math.floor(MAP_COLS / 2), y: Math.floor(MAP_ROWS / 2) };

  for (let y = 0; y < MAP_ROWS; y++) {
    for (let x = 0; x < MAP_COLS; x++) {
      if (map[y][x].type === 'base' && map[y][x].owner !== undefined) continue;

      let islandType: IslandType;
      
      // Force center tile to be the "boss"
      if (x === center.x && y === center.y) {
          islandType = 'monster';
          const bossMonsterData = MONSTER_DATA[4];
          map[y][x].monsters = [{
              name: bossMonsterData.name,
              level: 4,
              sprite: bossMonsterData.sprite
          }];
          map[y][x].type = islandType;
          continue; // Skip to next iteration
      }

      const distance = Math.abs(x - center.x) + Math.abs(y - center.y);
      
      let rand = Math.random();
      if (distance <= 1) { 
        if (rand < settings.resourceDensity - 0.1) islandType = 'resource'; // Center is less likely to be resource
        else if (rand < 0.8) islandType = 'special';  
        else islandType = 'monster'; 
      } else {
        if (rand < settings.resourceDensity) islandType = 'resource';
        else if (rand < 0.95) islandType = 'monster';
        else islandType = 'special';
      }
      
      map[y][x].type = islandType;

      if (islandType === 'resource') {
        const resourceTypes: ResourceType[] = ['gems', 'iron', 'food'];
        const availableResources = [...resourceTypes];
        
        const numResourceTypes = (distance <= 3 && Math.random() < 0.4) ? 2 : 1;
        const islandResources: IslandResource[] = [];

        for(let i=0; i < numResourceTypes; i++) {
            const randomIndex = Math.floor(Math.random() * availableResources.length);
            const selectedResourceType = availableResources.splice(randomIndex, 1)[0];
            const amount = (Math.random() < 0.3 ? 2 : 1);
            islandResources.push({ type: selectedResourceType, amount });
        }
        map[y][x].resources = islandResources;
      } else if(islandType === 'monster') {
          map[y][x].monsters = generateMonsters(x, y);
      }
    }
  }
  
  if (!debugMode) {
    players.forEach(p => {
        p.armies.forEach(army => {
            map[army.position.y][army.position.x].isHidden = false;
        })
    });
  }

  const finalCardDeck = SPECIAL_CARDS.filter(card => settings.availableCards.includes(card));

  return {
    id: gameId,
    name: gameName,
    status: 'waiting',
    maxPlayers: maxPlayers === 1 ? numBots + 1 : maxPlayers,
    debugMode,
    settings,
    map,
    players,
    currentPlayerIndex: 0,
    turn: 0, // Turn 0 means game hasn't started
    log: [`Game '${gameName}' created by ${creator.name}! Waiting for players...`],
    winner: null,
    selectedTile: null,
    selectedArmyId: 0,
    possibleMoves: [],
    currentAction: null,
    specialCardsDeck: [...finalCardDeck],
    combatState: null,
    monsterCombatState: null,
    positionDialogState: null,
    collectDialogState: null,
    showCardsDialogForPlayer: null,
    stealResourceDialogState: null,
    useCardDialogState: null,
    teleportState: null,
    abilitiesShopState: null,
    sabotageDialogState: null,
    wealthyDialogState: null,
    scoutingState: null,
    armySelectionDialogState: null,
    attackSelectionDialogState: null,
  };
}

export function startGame(gameState: GameState, hostName: string): GameState {
    const newState = { ...gameState };
    newState.status = 'playing';
    newState.turn = 1; // Start the first turn
    newState.log.push(`${hostName} has started the game! It's now ${newState.players[0].name}'s turn.`);
    return newState;
}
