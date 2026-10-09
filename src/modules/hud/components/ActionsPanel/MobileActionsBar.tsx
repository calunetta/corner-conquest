'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronUp } from 'lucide-react';
import { XCircle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActionButton } from './ActionButton';
import { MobileActionsSheet } from './MobileActionsSheet';
import { useMobileActionsBar } from './MobileActionsBar.hook';
import { styles } from './MobileActionsBar.styles';
import { styles as actionsPanelStyles } from './ActionsPanel.styles';
import type { ActionsPanelViewProps } from './ActionsPanel.types';

/** Mobile actions bar: fixed bottom bar with core actions + sheet for secondary actions. */
export function MobileActionsBar({
  mainActions,
  alwaysAvailableActions,
  secondaryActions,
  deckCount,
  isMyTurn,
  hasSelectedArmy,
  isCancellableActionInProgress,
  hasExtraMoveBanner,
  isEndTurnDisabled,
  turnTimer,
  onActionClick,
  onCancelAction,
  onDeselectArmy,
  onEndTurn,
  infoBeacon,
}: ActionsPanelViewProps) {
  const { barRef, barHeightPx, isSheetOpen, onSheetOpenChange } = useMobileActionsBar();
  const moreActionsButtonRef = useRef<HTMLButtonElement>(null);

  const rowCount = isMyTurn ? 4 : 3;

  return (
    <>
      {/* Spacer: reserves space for the fixed bar so GameLog content isn't hidden. */}
      <div className={styles.spacer} style={{ height: barHeightPx ? `${barHeightPx}px` : undefined }} />

      {/* Fixed bottom bar. */}
      <div ref={barRef} className={styles.barContainer} role="region" aria-label="Turn actions">
        {/* Row 1: conditional Cancel/Deselect/banner. */}
        <div className={styles.row1}>
          {isMyTurn && isCancellableActionInProgress && (
            <Button
              variant="destructive"
              size="sm"
              className={styles.cancelButton}
              onClick={onCancelAction}
              data-testid="actions-panel-cancel"
            >
              <XCircle className="mr-1 h-3.5 w-3.5" />
              Cancel
            </Button>
          )}
          {isMyTurn && hasSelectedArmy && (
            <Button
              variant="secondary"
              size="sm"
              className={styles.deselectButton}
              onClick={onDeselectArmy}
              data-testid="actions-panel-deselect"
            >
              <XCircle className="mr-1 h-3.5 w-3.5" />
              Deselect
            </Button>
          )}
          {isMyTurn && hasExtraMoveBanner && (
            <div className={styles.extraMoveBanner} data-testid="extra-move-banner">
              <Zap className="h-4 w-4 text-amber-400 shrink-0" />
              <span>Extra Move active! Select a soldier on the map to continue.</span>
            </div>
          )}
          <Button
            ref={moreActionsButtonRef}
            variant="outline"
            size="sm"
            className={styles.moreActionsButton}
            onClick={() => onSheetOpenChange(true)}
            data-testid="actions-panel-more-actions"
          >
            More Actions
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Row 2: main actions grid (Position, Attack, Deploy, and optionally End Turn). */}
        <div
          className={cn(
            styles.row2({ columnCount: rowCount }),
            hasSelectedArmy && styles.row2Active,
          )}
        >
          {mainActions.map((action) => (
            <ActionButton
              key={action.id}
              action={action}
              isMain
              disabledReasonVisible
              onActionClick={onActionClick}
            />
          ))}
          {alwaysAvailableActions.map((action) => (
            <ActionButton
              key={action.id}
              action={action}
              isMain
              disabledReasonVisible
              onActionClick={onActionClick}
            />
          ))}
          {isMyTurn && (
            <Button
              size="sm"
              disabled={isEndTurnDisabled}
              onClick={onEndTurn}
              className={cn(
                styles.endTurnButtonMobile,
                turnTimer.isExpiring && actionsPanelStyles.endTurnButtonExpiring,
              )}
              data-testid="actions-panel-end-turn"
            >
              <span
                className={cn(
                  actionsPanelStyles.endTurnProgress,
                  turnTimer.isExpiring
                    ? actionsPanelStyles.endTurnProgressExpiring
                    : actionsPanelStyles.endTurnProgressNormal,
                )}
                style={{ width: `${turnTimer.percentage}%` }}
              />
              <span className={actionsPanelStyles.endTurnLabel}>
                <span>End Turn</span>
                <span className={actionsPanelStyles.endTurnTime}>({turnTimer.formattedTime})</span>
              </span>
            </Button>
          )}
        </div>
      </div>

      {/* Sheet for secondary actions. */}
      <MobileActionsSheet
        open={isSheetOpen}
        onOpenChange={onSheetOpenChange}
        secondaryActions={secondaryActions}
        deckCount={deckCount}
        infoBeacon={infoBeacon}
        onActionClick={onActionClick}
        triggerRef={moreActionsButtonRef}
      />
    </>
  );
}
