
'use client';
import type { Player } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '../ui/card';

type SabotageDialogProps = {
  players: Player[];
  onSabotage: (targetPlayerId: number) => void;
  onClose: () => void;
};

export function SabotageDialog({ players, onSabotage, onClose }: SabotageDialogProps) {

  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Use 'Sabotage' Card</AlertDialogTitle>
          <AlertDialogDescription>
            Choose an opponent. They will miss their next turn.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="grid grid-cols-2 gap-2 py-4 sm:grid-cols-3">
          {players.map((player) => (
            <Card
              key={player.id}
              className="cursor-pointer p-2 transition-all hover:bg-muted"
              onClick={() => onSabotage(player.id)}
            >
              <CardContent className="flex flex-col items-center gap-2 p-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: player.color, color: 'white' }}>
                  {player.name.charAt(0)}
                </div>
                <p className="text-sm font-bold">{player.name}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
