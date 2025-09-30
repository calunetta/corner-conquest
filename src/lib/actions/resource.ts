
import type { GameState, Army, ResourceType, ActionHandlerResult } from '@/lib/types';
import { IslandType, MAP_COLS } from '../types';
import { checkAndEndTurnIfNoActions } from './player';

export function handleSelectResourceForPosition(state: GameState, resource: ResourceType, armyId: number): GameState {
    const { players, currentPlayerIndex } = state;
    const player = players[currentPlayerIndex];

    const selectedArmy = player.armies.find(a => a.id === armyId);
    if (!selectedArmy) {
        throw new Error("Army not found for positioning.");
    }
    
    const { x, y } = selectedArmy.position;
    player.positions.push({ x, y, resource, armyId: selectedArmy.id });
    
    const tile = state.map[y * MAP_COLS + x];
    if (!tile.positionedBy) tile.positionedBy = [];
    tile.positionedBy.push({playerId: player.id, resource});

    selectedArmy.hasActed = true;
    
    state.log.push(`${player.name} positioned an army on ${resource}.`);
    
    return state;
};
