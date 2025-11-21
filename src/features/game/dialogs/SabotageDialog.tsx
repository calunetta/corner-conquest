

'use client';
import type { Player } from '@/lib/types';
import { CardName } from '@/lib/types';
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
          <AlertDialogTitle>Use '{CardName.Sabotage}' Card</AlertDialogTitle>
          <AlertDialogDescription>
            Choose an opponent. They will miss their next turn.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="grid grid-cols-2 gap-2 py-4 sm:grid-cols-3">
          {players.map((player) => (
            <Card
              key={player.id}
              className='p-2 transition-all cursor-pointer hover:bg-muted'
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
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
