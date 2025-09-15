'use client';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PlayerColor } from '@/lib/types';
import { Loader2 } from 'lucide-react';

const PLAYER_COLORS: PlayerColor[] = ['blue', 'red', 'green', 'yellow'];

type CreateGameDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateGame: (
    gameName: string,
    maxPlayers: number,
    playerColor: PlayerColor
  ) => Promise<void>;
};

export function CreateGameDialog({
  open,
  onOpenChange,
  onCreateGame,
}: CreateGameDialogProps) {
  const [gameName, setGameName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState<number>(4);
  const [playerColor, setPlayerColor] = useState<PlayerColor>('blue');
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async () => {
    if (!gameName || isCreating) return;
    setIsCreating(true);
    await onCreateGame(gameName, maxPlayers, playerColor);
    setIsCreating(false);
    onOpenChange(false); // Close dialog on success
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Game</DialogTitle>
          <DialogDescription>
            Set up your new game room and invite others to join.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Game Name
            </Label>
            <Input
              id="name"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              className="col-span-3"
              placeholder="My Epic Game"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="maxPlayers" className="text-right">
              Max Players
            </Label>
            <Select
              value={String(maxPlayers)}
              onValueChange={(value) => setMaxPlayers(Number(value))}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select max players" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Player</SelectItem>
                <SelectItem value="2">2 Players</SelectItem>
                <SelectItem value="3">3 Players</SelectItem>
                <SelectItem value="4">4 Players</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="playerColor" className="text-right">
              Your Color
            </Label>
            <Select
              value={playerColor}
              onValueChange={(value) => setPlayerColor(value as PlayerColor)}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select your color" />
              </SelectTrigger>
              <SelectContent>
                {PLAYER_COLORS.map((color) => (
                  <SelectItem key={color} value={color}>
                    <span className="flex items-center gap-2">
                      <div className={`h-4 w-4 rounded-full bg-${color}-500`} />
                      <span className="capitalize">{color}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={!gameName || isCreating}
          >
            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Game
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
