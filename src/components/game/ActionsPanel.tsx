'use client';
import type { GameAction } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Move, Pickaxe, Shield, Star, Users } from 'lucide-react';

type ActionsPanelProps = {
  onAction: (action: GameAction) => void;
  lastAction: GameAction | null;
  currentAction: GameAction | null;
};

const actions: { id: GameAction; label: string; icon: React.ReactNode }[] = [
  { id: 'move', label: 'Move', icon: <Move className="mr-2 h-4 w-4" /> },
  { id: 'mine', label: 'Mine', icon: <Pickaxe className="mr-2 h-4 w-4" /> },
  { id: 'attack', label: 'Attack', icon: <Shield className="mr-2 h-4 w-4" /> },
  { id: 'farm', label: 'Farm Card', icon: <Star className="mr-2 h-4 w-4" /> },
];

export function ActionsPanel({ onAction, lastAction, currentAction }: ActionsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2">
        {actions.map((action) => (
          <Button
            key={action.id}
            variant={currentAction === action.id ? 'default' : 'outline'}
            onClick={() => onAction(action.id)}
            disabled={action.id === lastAction}
            className="flex h-12 flex-col justify-center gap-1 px-2 text-xs sm:flex-row sm:text-sm"
          >
            {action.icon}
            <span>{action.label}</span>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
