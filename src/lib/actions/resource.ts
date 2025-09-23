
import type { GameState, Army, ResourceType, ActionHandlerResult } from '@/lib/types';
import { IslandType, MAP_COLS } from '../types';
import { checkAndEndTurnIfNoActions } from './player';
import { cloneDeep } from 'lodash';

export function handleSelectResourceForPosition(state: GameState, resource: ResourceType, selectedArmy: Army | null): GameState {
    let newState = cloneDeep(state);
    const { players, currentPlayerIndex } = newState;
    const player = players[currentPlayerIndex];

    if (!selectedArmy) {
        throw new Error("No army selected for positioning.");
    }
    
    const { x, y } = selectedArmy.position;
    player.positions.push({ x, y, resource, armyId: selectedArmy.id });
    
    const tile = newState.map[y * MAP_COLS + x];
    if (!tile.positionedBy) tile.positionedBy = [];
    tile.positionedBy.push({playerId: player.id, resource});

    const armyInState = player.armies.find(a => a.id === selectedArmy.id);
    if (armyInState) {
        armyInState.hasActed = true; // Commit the action
    }
    
    newState.log.push(`${player.name} positioned an army on ${resource}.`);
    
    newState = checkAndEndTurnIfNoActions(newState);
    
    return newState;
};
