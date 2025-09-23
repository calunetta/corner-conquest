
import type { GameState, Army, ResourceType, ActionHandlerResult } from '@/lib/types';
import { IslandType, MAP_COLS } from '../types';
import { checkAndEndTurnIfNoActions } from './player';

export function handleSelectResourceForPosition(state: GameState, resource: ResourceType, selectedArmy: Army | null): GameState {
    let newState = { ...state };
    const { players, currentPlayerIndex } = newState;
    const player = players[currentPlayerIndex];

    if (!selectedArmy) {
        return newState;
    }
    
    const { x, y } = selectedArmy.position;
    player.positions.push({ x, y, resource, armyId: selectedArmy.id });
    
    const tile = newState.map[y * MAP_COLS + x];
    if (!tile.positionedBy) tile.positionedBy = [];
    tile.positionedBy.push({playerId: player.id, resource});

    const army = player.armies.find(a => a.id === selectedArmy.id);
    if (army) army.hasActed = true;
    newState.log.push(`${player.name} positioned an army on ${resource}.`);
    
    newState = checkAndEndTurnIfNoActions(newState);
    
    return newState;
};
