import type { GameState, ResourceType } from '@/lib/types';
import { CardName, GameAction } from '@/lib/types';

const IMMEDIATE_EFFECT_CARDS: CardName[] = [CardName.Reinforce, CardName.Efficient, CardName.MasterBuilder];

/** Activates a card from hand: immediate-effect cards flip a flag, others set up a follow-up step. */
export function handleUseCard(state: GameState, payload: { cardName: CardName; isScout?: boolean }): GameState {
  const { players, currentPlayerIndex, discardPile } = state;
  const player = players[currentPlayerIndex];
  const { cardName, isScout } = payload;

  const cardIndex = player.specialCards.indexOf(cardName);
  if (cardIndex === -1) throw new Error(`You do not have the ${cardName} card.`);
  if (player.actionsThisTurn.includes(GameAction.UseCard)) throw new Error('You can only use one card per turn.');

  // Defer consuming the card action for cards that have a follow-up step
  if (IMMEDIATE_EFFECT_CARDS.includes(cardName)) {
    if (cardName === CardName.Reinforce) player.reinforceActive = true;
    if (cardName === CardName.Efficient) player.efficientActive = true;
    if (cardName === CardName.MasterBuilder) player.masterBuilderActive = true;
    state.log.push(`${player.name} activated '${cardName}'.`);
  } else if (cardName === CardName.ExtraMove) {
    player.hasExtraMove = true;
    player.actionsThisTurn.push(GameAction.UseCard);
    const usedCard = player.specialCards.splice(cardIndex, 1)[0];
    discardPile.push(usedCard);
    state.log.push(`${player.name} activated 'Extra Move' - select any soldier on the map for 1 bonus action.`);
  } else if (isScout) {
    player.actionsThisTurn.push(GameAction.UseCard);
    state.log.push(`${player.name} used the '${cardName}' card to scout ahead.`);
    const usedCard = player.specialCards.splice(cardIndex, 1)[0];
    discardPile.push(usedCard);
  }

  return state;
}

/** Resolves the Productive card's resource-doubling dialog, collecting from all of the player's positioned armies. */
export function handleUseProductiveCard(state: GameState, selectedResource: ResourceType | null): GameState {
  const player = state.players[state.currentPlayerIndex];
  const collectedResources: Record<string, number> = {};
  let doubledResourceString = '';

  // Only allow doubling a resource type where the player is actually positioned
  const validPositionedResources = player.positions.map((p) => p.resource);
  const validSelectedResource =
    selectedResource && validPositionedResources.includes(selectedResource) ? selectedResource : null;

  if (validSelectedResource) {
    player.actionsThisTurn.push(GameAction.UseCard);
    const cardIndex = player.specialCards.indexOf(CardName.Productive);
    if (cardIndex > -1) {
      state.discardPile.push(player.specialCards.splice(cardIndex, 1)[0]);
    }
  }

  player.positions.forEach((pos) => {
    const tile = state.map[pos.y * state.settings.gridSize.cols + pos.x];
    const resourceSpot = tile?.resources.find((r) => r.type === pos.resource);
    if (resourceSpot) {
      let amount = resourceSpot.amount;
      if (pos.resource === validSelectedResource) {
        amount *= 2;
        doubledResourceString = ` (doubled ${pos.resource})`;
      }
      player.resources[resourceSpot.type] += amount;
      collectedResources[resourceSpot.type] = (collectedResources[resourceSpot.type] || 0) + amount;
    }
  });

  const collectedStrings = Object.entries(collectedResources).map(([type, amount]) => `${amount} ${type}`);
  if (collectedStrings.length > 0) {
    state.log.push(`${player.name} collected ${collectedStrings.join(', ')}${doubledResourceString}.`);
  }

  player.positions.forEach((pos) => {
    const tile = state.map[pos.y * state.settings.gridSize.cols + pos.x];
    if (tile && tile.positionedBy) {
      tile.positionedBy = tile.positionedBy.filter((p) => !(p.playerId === player.id && p.resource === pos.resource));
    }
  });
  player.positions = [];

  state.productiveDialogState = null;
  return state;
}

/** Reveals a tile for the Scout card's preview, without consuming a move. */
export function handleScoutAction(state: GameState, x: number, y: number): GameState {
  const player = state.players[state.currentPlayerIndex];
  const tileId = `${x}-${y}`;

  if (!player.revealedTiles.includes(tileId)) {
    player.revealedTiles.push(tileId);
  }
  return state;
}
