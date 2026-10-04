'use client';

import type { GameAction } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Shield, ShoppingCart, Anchor, Zap, Album, University } from 'lucide-react';
import { FightIcon } from '@/modules/shared';
import { styles } from './ActionsPanel.styles';
import type { ActionViewModel } from './ActionsPanel.types';

const actionIconMap = {
  position: <Anchor className="h-4 w-4" />,
  attack: <FightIcon className="h-4 w-4" />,
  deploy: <Shield className="h-4 w-4" />,
  upgrade: <Zap className="h-4 w-4" />,
  'buy-card': <ShoppingCart className="h-4 w-4" />,
  'show-cards': <Album className="h-4 w-4" />,
  'abilities-shop': <University className="h-4 w-4" />,
} as const;

interface ActionButtonProps {
  action: ActionViewModel;
  isMain: boolean;
  onActionClick: (id: GameAction) => void;
}

/** Renders a single action button with tooltip. */
export function ActionButton({ action, isMain, onActionClick }: ActionButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={isMain ? 'w-full' : ''}>
          <Button
            variant={action.isPendingMatch ? 'default' : 'outline'}
            onClick={() => onActionClick(action.id)}
            disabled={action.disabled}
            className={styles.buttonVariant({ isMain, isPendingMatch: action.isPendingMatch })}
            data-testid={`action-button-${action.id}`}
          >
            {actionIconMap[action.icon]}
            <span className="whitespace-normal">{action.label}</span>
          </Button>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{action.tooltip}</p>
        {action.disabled && <p className="mt-1 text-xs text-destructive">{action.disabledReason}</p>}
      </TooltipContent>
    </Tooltip>
  );
}
