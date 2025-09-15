
'use client';
import type { Player, Army } from '@/lib/types';
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
import { Swords } from 'lucide-react';
import { AlertDialogCancel } from '@radix-ui/react-alert-dialog';

type TeleportDialogProps = {
  player: Player;
  onSelectArmy: (armyId: number) => void;
  onClose: () => void;
};

export function TeleportDialog({ player, onSelectArmy, onClose }: TeleportDialogProps) {
  
  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Use 'Teleport'</AlertDialogTitle>
          <AlertDialogDescription>
            Select which army you would like to teleport. After selection, click any tile on the map to move it there.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid grid-cols-2 gap-2 py-4 sm:grid-cols-3">
          {player.armies.map((army) => (
            <Card
              key={army.id}
              className="cursor-pointer p-2 transition-all hover:bg-muted"
              onClick={() => onSelectArmy(army.id)}
            >
              <CardContent className="flex flex-col items-center gap-2 p-1">
                <Swords className="h-8 w-8" style={{ color: player.color }} />
                <p className="text-sm font-bold">Army {army.id + 1}</p>
                <p className="text-xs text-muted-foreground">({army.position.x}, {army.position.y})</p>
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
