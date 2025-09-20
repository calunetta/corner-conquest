
'use client';
import type { Player, Army, AttackSelectionDialogState } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Swords, Anchor, CheckCircle } from 'lucide-react';
import { AlertDialogCancel } from '@radix-ui/react-alert-dialog';

type AttackSelectionDialogProps = {
  state: AttackSelectionDialogState;
  onSelectTarget: (armyId: number) => void;
  onClose: () => void;
  isMyTurn: boolean;
};

export function AttackSelectionDialog({ state, onSelectTarget, onClose, isMyTurn }: AttackSelectionDialogProps) {
    const { armies, defendingPlayer } = state;

    const getArmyStatus = (army: Army): { text: string; icon: React.ReactNode } => {
        if (army.hasActed) {
            return { text: "Acted", icon: <CheckCircle className="h-4 w-4 text-green-500" /> };
        }
        const position = defendingPlayer.positions.find(p => p.armyId === army.id);
        if (position) {
            return { text: `Positioned`, icon: <Anchor className="h-4 w-4 text-blue-400" /> };
        }
        return { text: "Ready", icon: <CheckCircle className="h-4 w-4 text-gray-400" /> };
    }

  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Select a Target</AlertDialogTitle>
          <AlertDialogDescription>
            Choose which of {defendingPlayer.name}'s armies you want to attack.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="grid grid-cols-2 gap-4 py-4 sm:grid-cols-3">
          {armies.map((army) => {
            const status = getArmyStatus(army);
            return (
              <Card
                key={army.id}
                className={`p-2 transition-all ${isMyTurn ? 'cursor-pointer hover:bg-muted' : 'cursor-not-allowed opacity-50'}`}
                onClick={() => isMyTurn && onSelectTarget(army.id)}
              >
                <CardContent className="flex flex-col items-center gap-2 p-1 pt-2">
                  <Swords className="h-8 w-8" style={{ color: defendingPlayer.color }} />
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
