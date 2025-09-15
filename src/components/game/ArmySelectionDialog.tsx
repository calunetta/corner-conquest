
'use client';
import type { Player, Army, ArmySelectionDialogState, PlayerPosition } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '../ui/card';
import { Swords, Anchor, CheckCircle } from 'lucide-react';
import { AlertDialogCancel } from '@radix-ui/react-alert-dialog';

type ArmySelectionDialogProps = {
  state: ArmySelectionDialogState;
  player: Player;
  onSelectArmy: (armyId: number) => void;
  onClose: () => void;
};

export function ArmySelectionDialog({ state, player, onSelectArmy, onClose }: ArmySelectionDialogProps) {
    const { armies, x, y } = state;

    const getArmyStatus = (army: Army): { text: string; icon: React.ReactNode } => {
        if (army.hasActed) {
            return { text: "Acted", icon: <CheckCircle className="h-4 w-4 text-green-500" /> };
        }
        const position = player.positions.find(p => p.armyId === army.id);
        if (position) {
            return { text: `Positioned`, icon: <Anchor className="h-4 w-4 text-blue-400" /> };
        }
        return { text: "Ready", icon: <CheckCircle className="h-4 w-4 text-gray-400" /> };
    }

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
          {armies.map((army) => {
            const status = getArmyStatus(army);
            const isSelectable = !army.hasActed || !!player.teleportState; // Can select acted army for teleport
            return (
              <Card
                key={army.id}
                className={`cursor-pointer p-2 transition-all hover:bg-muted ${!isSelectable ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => isSelectable && onSelectArmy(army.id)}
              >
                <CardContent className="flex flex-col items-center gap-2 p-1 pt-2">
                  <Swords className="h-8 w-8" style={{ color: player.color }} />
                  <p className="text-sm font-bold">Army {army.id + 1}</p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {status.icon}
                    <span>{status.text}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
