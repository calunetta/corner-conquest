'use client';

import {
  CardPlayOverlay,
  CardsDialog,
  SabotageDialog,
  SpecialIslandRollDialog,
  StealResourceDialog,
  WealthyDialog,
} from '@/modules/cards';
import type { CardPlaySandboxState } from './CardPlaySandbox.types';

/** The real card dialogs and overlay, wired to the sandbox handlers the way GameDialogManager wires them. */
export function CardPlaySandboxDialogs({ state }: { state: CardPlaySandboxState }) {
  const { dialogs } = state.uiState;

  return (
    <>
      {dialogs.cardsPlayerId !== null && (
        <CardsDialog
          player={state.localPlayer}
          onClose={state.handleCloseCards}
          onUseCard={state.handleUseCard}
          canUseCards
        />
      )}
      {dialogs.sabotage?.isOpen && (
        <SabotageDialog
          players={state.opponents}
          onSabotage={() => state.handleResolveCard()}
          onClose={state.handleCancelCard}
        />
      )}
      {dialogs.wealthy?.isOpen && (
        <WealthyDialog onSelectResource={() => state.handleResolveCard()} onClose={state.handleCancelCard} />
      )}
      {dialogs.stealResource?.isOpen && (
        <StealResourceDialog
          players={state.opponents}
          onSteal={() => state.handleResolveCard()}
          onClose={state.handleCancelCard}
        />
      )}
      {dialogs.specialIslandRoll?.isOpen && (
        <SpecialIslandRollDialog
          state={dialogs.specialIslandRoll}
          onRoll={() => undefined}
          onClose={state.handleCloseFoundCard}
        />
      )}
      <CardPlayOverlay play={state.play} onFinished={state.endPlay} />
    </>
  );
}
