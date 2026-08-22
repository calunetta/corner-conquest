'use client';
import type { Player, Army, ArmySelectionDialogState } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Swords, Anchor, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ReactNode } from 'react';

type ArmySelectionDialogProps = {
  state: ArmySelectionDialogState;
  player: Player;
  onSelectArmy: (armyId: number) => void;
  onClose: () => void;
  isMyTurn: boolean;
  selectedArmyId?: number | null;
};

export function ArmySelectionDialog({ state, player, onSelectArmy, onClose, isMyTurn, selectedArmyId }: ArmySelectionDialogProps) {
  if (!state) return null;
  const { armies, x, y } = state;

  const getArmyStatus = (army: Army): { text: string; icon: ReactNode } => {
    if (army.hasActed) {
      return { text: 'Acted', icon: <CheckCircle className="h-4 w-4 text-green-500" /> };
    }
    const position = player.positions.find((p) => p.armyId === army.id);
    if (position) {
      return { text: `Positioned`, icon: <Anchor className="h-4 w-4 text-blue-400" /> };
    }
    return { text: 'Ready', icon: <CheckCircle className="h-4 w-4 text-gray-400" /> };
  };

  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Select Army at ({x}, {y})</AlertDialogTitle>
          <AlertDialogDescription>
            You have multiple armies on this tile. Choose which one to command.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4 sm:grid-cols-3">
          {armies.map((army: Army) => {
            const status = getArmyStatus(army);
            const isSelectable = (!army.hasActed || player.hasExtraMove) && isMyTurn;
            const isCurrentlySelected = selectedArmyId === army.id;
            return (
              <Card
                key={army.id}
                className={`p-2 transition-all ${
                  isCurrentlySelected 
                    ? 'ring-2 ring-primary border-primary bg-primary/10 shadow-md cursor-pointer' 
                    : isSelectable 
                      ? 'cursor-pointer hover:bg-muted' 
                      : 'opacity-50 cursor-not-allowed'
                }`}
                onClick={() => isSelectable && onSelectArmy(army.id)}
              >
                <CardContent className="flex flex-col items-center gap-2 p-1 pt-2">
                  <Swords className="h-8 w-8" style={{ color: player.color }} />
                  <p className="text-sm font-bold flex items-center gap-1">
                    Army {army.id + 1}
                    {isCurrentlySelected && <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-semibold">Active</span>}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {status.icon}
                    <span>{status.text}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
