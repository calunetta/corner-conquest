'use client';

import Image from 'next/image';
import type { GameAction, PlayerColor } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { FightIcon, RegistryIcon, toCollectorIdleSprite } from '@/modules/shared';
import { styles } from './ActionsPanel.styles';
import type { ActionViewModel } from './ActionsPanel.types';

const staticActionIconMap = {
  attack: <FightIcon className="h-4 w-4" />,
  deploy: <RegistryIcon id="shield" className="h-4 w-4" />,
  upgrade: <RegistryIcon id="zap" className="h-4 w-4" />,
  'buy-card': <RegistryIcon id="shopping-cart" className="h-4 w-4" />,
  'show-cards': <RegistryIcon id="album" className="h-4 w-4" />,
  'abilities-shop': <RegistryIcon id="university" className="h-4 w-4" />,
} as const;

interface ActionButtonProps {
  action: ActionViewModel;
  isMain: boolean;
  /** Used only for the "position" action, whose icon is the local player's collector sprite. */
  localPlayerColor: PlayerColor;
  onActionClick: (id: GameAction) => void;
  /** Mobile bar/sheet only: render `action.disabledReason` as static text under the button
   *  instead of relying on hover/focus Tooltip. Desktop never passes this (stays false). */
  disabledReasonVisible?: boolean;
}

/** Renders a single action button with tooltip. */
export function ActionButton({
  action,
  isMain,
  localPlayerColor,
  onActionClick,
  disabledReasonVisible = false,
}: ActionButtonProps) {
  const icon =
    action.icon === 'position' ? (
      <Image src={toCollectorIdleSprite(localPlayerColor)} alt="" aria-hidden width={16} height={16} unoptimized />
    ) : (
      staticActionIconMap[action.icon]
    );

  return (
    <div className={isMain ? 'w-full' : ''}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={action.isPendingMatch ? 'default' : 'outline'}
            onClick={() => onActionClick(action.id)}
            disabled={action.disabled}
            className={styles.buttonVariant({ isMain, isPendingMatch: action.isPendingMatch })}
            data-testid={`action-button-${action.id}`}
          >
            {icon}
            <span className="whitespace-normal">{action.label}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{action.tooltip}</p>
          {action.disabled && <p className="mt-1 text-xs text-destructive">{action.disabledReason}</p>}
        </TooltipContent>
      </Tooltip>
      {disabledReasonVisible && action.disabled && (
        <p className={styles.disabledReasonCaption} title={action.disabledReason}>
          {action.disabledReason}
        </p>
      )}
    </div>
  );
}
