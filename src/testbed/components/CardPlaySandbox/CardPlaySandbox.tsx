'use client';

import { Button } from '@/components/ui/button';
import { GameAction } from '@/lib/types';
import { MobileActionsBar } from '@/modules/hud/components/ActionsPanel/MobileActionsBar';
import { myTurnNoSelection } from '@/modules/hud/components/ActionsPanel/ActionsPanel.fixtures';
import { SANDBOX_COMBAT_CARDS } from './CardPlaySandbox.fixtures';
import { useCardPlaySandbox } from './CardPlaySandbox.hook';
import { styles } from './CardPlaySandbox.styles';
import type { CardPlaySandboxProps } from './CardPlaySandbox.types';
import { CardPlaySandboxDialogs } from './CardPlaySandboxDialogs';

const INTRO_BY_VARIANT = {
  desktop: 'Open Cards and use a card to see when the card animation plays.',
  mobile: 'Open More Actions, tap Cards, then use a card. Narrow the window below the mobile breakpoint for the compact card.',
} as const;

/** Dev-only click-through of the card-play animation rules with a fake match. */
export function CardPlaySandbox({ variant }: CardPlaySandboxProps) {
  const state = useCardPlaySandbox();
  const pendingAction = state.uiState.pendingAction;
  const isMapStep = pendingAction?.type === 'teleport' || pendingAction?.type === 'scout';

  return (
    <div className={styles.root}>
      <p className={styles.intro}>{INTRO_BY_VARIANT[variant]}</p>

      {variant === 'desktop' ? (
        <div className={styles.buttonRow}>
          <Button onClick={state.handleOpenCards} data-testid="sandbox-open-cards">
            Cards
          </Button>
        </div>
      ) : (
        <MobileActionsBar
          {...myTurnNoSelection}
          onActionClick={(actionId) => actionId === GameAction.local_ShowCards && state.handleOpenCards()}
        />
      )}

      <section className={styles.panel} aria-label="Status">
        <h3 className={styles.panelTitle}>Status</h3>
        <div className={styles.statusList}>
          <span>Turn {state.game.turn}</span>
          <span data-testid="sandbox-gate">Animation gate: {state.isBlocked ? 'blocked' : 'open'}</span>
          <span>Pending step: {pendingAction?.cardName ?? 'none'}</span>
        </div>
        {isMapStep && (
          <div className={styles.buttonRow}>
            <Button onClick={state.handleResolveCard} data-testid="sandbox-finish-step">
              Finish {pendingAction.cardName}
            </Button>
            <Button variant="secondary" onClick={state.handleCancelCard}>
              Cancel
            </Button>
          </div>
        )}
      </section>

      <section className={styles.panel} aria-label="Combat cards">
        <h3 className={styles.panelTitle}>Combat cards (never animate)</h3>
        <div className={styles.buttonRow}>
          {SANDBOX_COMBAT_CARDS.map((cardName) => (
            <Button key={cardName} variant="outline" onClick={() => state.handleLogCombatCard(cardName)}>
              Log {cardName}
            </Button>
          ))}
        </div>
      </section>

      <div className={styles.buttonRow}>
        <Button variant="secondary" onClick={state.handleNextTurn}>
          Next turn
        </Button>
      </div>

      <section className={styles.panel} aria-label="Log">
        <h3 className={styles.panelTitle}>Log</h3>
        {state.game.log.length === 0 ? (
          <p className={styles.logEmpty}>No log entries yet.</p>
        ) : (
          <ul className={styles.logList} data-testid="sandbox-log">
            {/* Index keys are safe: the sandbox log is append-only. */}
            {state.game.log.map((entry, index) => (
              <li key={index} className={styles.logEntry}>
                {typeof entry === 'string' ? entry : entry.message}
              </li>
            ))}
          </ul>
        )}
      </section>

      <CardPlaySandboxDialogs state={state} />
    </div>
  );
}
