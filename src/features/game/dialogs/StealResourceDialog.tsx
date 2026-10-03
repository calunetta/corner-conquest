'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import type { Player, ResourceType } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { ResourceIcon, RESOURCE_SPRITES, getResourceDisplayName } from '@/components/icons';
import { HandMetal, ArrowLeft, Check } from 'lucide-react';
import { PLAYER_DATA } from '@/modules/game-rules';

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
    setSelectedResource(null);
  };

  const renderPlayerSelection = () => (
    <>
      <AlertDialogHeader className="pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <HandMetal className="h-5 w-5" />
          </div>
          <div>
            <AlertDialogTitle className="text-xl font-bold">Infiltrate & Steal</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Select an opponent to pillage 2 resource units from their stockpile.
            </AlertDialogDescription>
          </div>
        </div>
      </AlertDialogHeader>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 py-4">
        {players.map((player) => {
          const isSelected = selectedPlayer?.id === player.id;
          const totalResources = Object.values(player.resources).reduce((a, b) => a + b, 0);

          return (
            <button
              key={player.id}
              type="button"
              data-testid={`steal-target-player-${player.id}`}
              onClick={() => handleSelectPlayer(player)}
              className={`flex flex-col items-center p-3 rounded-xl border transition-all duration-200 ${
                isSelected
                  ? 'border-purple-400 bg-purple-500/20 shadow-[0_0_16px_rgba(168,85,247,0.4)] scale-105'
                  : 'border-white/10 bg-black/40 hover:border-white/20 hover:bg-black/60'
              }`}
            >
              <div className="relative h-10 w-10 mb-1 flex items-center justify-center">
                <Image
                  src={PLAYER_DATA[player.color]?.sprite.idle || '/sprites/blue_idle.gif'}
                  alt={player.name}
                  width={36}
                  height={36}
                  className="object-contain drop-shadow"
                  unoptimized
                />
              </div>
              <p className="text-xs font-bold truncate max-w-full text-foreground">{player.name}</p>
              <span className="text-[10px] text-muted-foreground mt-0.5">{totalResources} total resources</span>
            </button>
          );
        })}
      </div>

      <AlertDialogFooter className="pt-2 border-t border-white/10">
        <Button variant="outline" size="sm" onClick={onClose} className="border-white/10 text-xs">
          Cancel
        </Button>
      </AlertDialogFooter>
    </>
  );

  const renderResourceSelection = () => (
    <>
      <AlertDialogHeader className="pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <HandMetal className="h-5 w-5" />
          </div>
          <div>
            <AlertDialogTitle className="text-xl font-bold">Steal from {selectedPlayer?.name}</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Select which stockpile resource to seize (2 units).
            </AlertDialogDescription>
          </div>
        </div>
      </AlertDialogHeader>

      <div className="grid grid-cols-3 gap-3 py-4">
        {(Object.keys(selectedPlayer!.resources) as ResourceType[]).map((resource) => {
          const available = selectedPlayer!.resources[resource];
          const isSelected = selectedResource === resource;
          const isAvailable = available > 0;
          const sprite = RESOURCE_SPRITES[resource] || '/sprites/mine.png';
          const displayName = getResourceDisplayName(resource);

          return (
            <button
              key={resource}
              type="button"
              disabled={!isAvailable}
              data-testid={`steal-resource-${resource}`}
              onClick={() => setSelectedResource(resource)}
              className={`relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 ${
                !isAvailable
                  ? 'opacity-40 border-white/5 bg-black/20 cursor-not-allowed'
                  : isSelected
                  ? 'border-purple-400 bg-purple-500/20 shadow-[0_0_16px_rgba(168,85,247,0.4)] scale-105'
                  : 'border-white/10 bg-black/40 hover:border-white/20 hover:bg-black/60'
              }`}
            >
              {isSelected && (
                <div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-purple-500 text-white flex items-center justify-center">
                  <Check className="h-3 w-3 stroke-[3]" />
                </div>
              )}

              {/* Animated Resource Preview Sprite */}
              <div className="relative w-11 h-11 mb-1 flex items-center justify-center drop-shadow">
                <Image
                  src={sprite}
                  alt={displayName}
                  width={44}
                  height={44}
                  className="h-full w-full object-contain"
                  unoptimized
                />
              </div>

              <div className="flex items-center gap-1">
                <ResourceIcon type={resource} className="w-3.5 h-3.5" />
                <span className="text-xs font-bold capitalize text-foreground">{displayName}</span>
              </div>

              <span className="text-[10px] text-muted-foreground font-mono mt-0.5">Avail: {available}</span>
            </button>
          );
        })}
      </div>

      <AlertDialogFooter className="pt-2 border-t border-white/10 gap-2">
        <Button variant="outline" size="sm" onClick={() => setSelectedPlayer(null)} className="border-white/10 text-xs">
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back
        </Button>
        <Button
          size="sm"
          disabled={!selectedResource}
          onClick={() => onSteal(selectedPlayer!.id, selectedResource!)}
          className="font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-[0_0_16px_rgba(168,85,247,0.4)] text-xs px-4"
        >
          Steal 2 {selectedResource ? getResourceDisplayName(selectedResource) : 'Resources'}
        </Button>
      </AlertDialogFooter>
    </>
  );

  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent className="bg-background/95 backdrop-blur-2xl border border-white/15 shadow-[0_24px_72px_rgba(0,0,0,0.85)] max-w-md overflow-hidden">
        {!selectedPlayer ? renderPlayerSelection() : renderResourceSelection()}
      </AlertDialogContent>
    </AlertDialog>
  );
}
