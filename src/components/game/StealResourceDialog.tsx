'use client';
import type { Player, ResourceType } from '@/lib/types';
import { useState } from 'react';
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
import { ResourceIcon } from '../icons';

type StealResourceDialogProps = {
  players: Player[];
  onSteal: (targetPlayerId: number, resource: ResourceType) => void;
  onClose: () => void;
};

export function StealResourceDialog({ players, onSteal, onClose }: StealResourceDialogProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedResource, setSelectedResource] = useState<ResourceType | null>(null);

  const handleSelectPlayer = (player: Player) => {
    setSelectedPlayer(player);
    setSelectedResource(null); // Reset resource selection when player changes
  };

  const renderPlayerSelection = () => (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Use 'Steal Resource'</AlertDialogTitle>
        <AlertDialogDescription>
          Select a player to steal 2 resources from.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <div className="grid grid-cols-3 gap-2 py-4">
        {players.map((player) => (
          <Card
            key={player.id}
            className={`cursor-pointer p-2 transition-all hover:bg-muted ${selectedPlayer?.id === player.id ? 'ring-2 ring-primary' : ''}`}
            onClick={() => handleSelectPlayer(player)}
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
        <Button disabled={!selectedPlayer} onClick={() => { /* No-op, just moves to next screen */ }}>
          Select Resources
        </Button>
      </AlertDialogFooter>
    </>
  );

  const renderResourceSelection = () => (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Steal from {selectedPlayer?.name}</AlertDialogTitle>
        <AlertDialogDescription>
          Select which resource to steal. You will take 2 units.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <div className="flex justify-around gap-4 py-4">
        {(Object.keys(selectedPlayer!.resources) as ResourceType[]).map((resource) => (
          <Button
            key={resource}
            variant={selectedResource === resource ? 'default' : 'outline'}
            className="flex h-24 w-24 flex-col items-center justify-center gap-2"
            onClick={() => setSelectedResource(resource)}
            disabled={selectedPlayer!.resources[resource] === 0}
          >
            <ResourceIcon type={resource} className="h-8 w-8" />
            <span className="capitalize">{resource}</span>
            <span className="text-xs font-bold text-muted-foreground">
              (Available: {selectedPlayer!.resources[resource]})
            </span>
          </Button>
        ))}
      </div>
      <AlertDialogFooter>
        <Button variant="outline" onClick={() => setSelectedPlayer(null)}>Back</Button>
        <Button disabled={!selectedResource} onClick={() => onSteal(selectedPlayer!.id, selectedResource!)}>
          Steal {selectedResource}
        </Button>
      </AlertDialogFooter>
    </>
  );

  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent>
        {selectedPlayer ? renderResourceSelection() : renderPlayerSelection()}
      </AlertDialogContent>
    </AlertDialog>
  );
}
