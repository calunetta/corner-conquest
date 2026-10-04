'use client';

import React from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { XCircle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActionButton } from './ActionButton';
import { useActionsPanel } from './ActionsPanel.hook';
import { styles } from './ActionsPanel.styles';
import type { ActionsPanelProps, ActionsPanelViewModel } from './ActionsPanel.types';
interface ActionsPanelViewProps extends ActionsPanelViewModel {
  infoBeacon?: ReactNode;
}

/** Pure view: renders the actions panel. */
export function ActionsPanelView({
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
  return (
    <Card className={styles.card}>
      <CardHeader className={styles.header}>
        <div className={styles.headerTop}>
          <CardTitle className={styles.title}>
            Actions
            {infoBeacon && infoBeacon}
          </CardTitle>
          <div className={styles.deckCount}>Cards left in deck: {deckCount}</div>
        </div>
        <div className={styles.controls}>
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
          {isMyTurn && (
            <Button
              size="sm"
              disabled={isEndTurnDisabled}
              onClick={onEndTurn}
              className={cn(
                styles.endTurnButton,
                turnTimer.isExpiring && styles.endTurnButtonExpiring,
              )}
              data-testid="actions-panel-end-turn"
            >
              <span
                className={cn(
                  styles.endTurnProgress,
                  turnTimer.isExpiring ? styles.endTurnProgressExpiring : styles.endTurnProgressNormal,
                )}
                style={{ width: `${turnTimer.percentage}%` }}
              />
              <span className={styles.endTurnLabel}>
                <span>End Turn</span>
                <span className={styles.endTurnTime}>({turnTimer.formattedTime})</span>
              </span>
            </Button>
          )}
        </div>
        {isMyTurn && hasExtraMoveBanner && (
          <div className={styles.extraMoveBanner} data-testid="extra-move-banner">
            <Zap className="h-4 w-4 text-amber-400 shrink-0" />
            <span>Extra Move active! Select a soldier on the map to continue.</span>
          </div>
        )}
      </CardHeader>
      <CardContent className={styles.content}>
        <div className={styles.mainGrid}>
          {mainActions.map((action) => (
            <ActionButton key={action.id} action={action} isMain onActionClick={onActionClick} />
          ))}
          {alwaysAvailableActions.map((action) => (
            <ActionButton key={action.id} action={action} isMain onActionClick={onActionClick} />
          ))}
        </div>
        <Separator className={styles.separator} />
        <div className={styles.secondaryGrid}>
          {secondaryActions.map((action) => (
            <ActionButton key={action.id} action={action} isMain={false} onActionClick={onActionClick} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** Connected component: reads the game board context. */
export function ActionsPanel(props: ActionsPanelProps) {
  const viewModel = useActionsPanel();
  return <ActionsPanelView {...viewModel} infoBeacon={props.infoBeacon} />;
}
