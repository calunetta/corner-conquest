
'use client';
import { useState, useEffect } from 'react';
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
import { PlayerColor, GameSettings } from '@/lib/types';
import { Loader2, Check, HelpCircle, Settings } from 'lucide-react';
import { Switch } from '../ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { CustomSettingsSheet } from './CustomSettingsSheet';
import { defaultGameSettings } from '@/lib/game-initializer';
import { PLAYER_COLORS, PLAYER_DATA } from '@/lib/player-data';
import Image from 'next/image';

type CreateGameDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateGame: (
    gameName: string,
    maxPlayers: number,
    playerColor: PlayerColor,
    numBots: number,
    debugMode: boolean,
    settings: GameSettings,
  ) => Promise<boolean>;
};

export function CreateGameDialog({
  open,
  onOpenChange,
  onCreateGame,
}: CreateGameDialogProps) {
  const [gameName, setGameName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState<number>(4);
  const [playerColor, setPlayerColor] = useState<PlayerColor>('blue');
  const [debugMode, setDebugMode] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [customSettings, setCustomSettings] = useState<GameSettings>(defaultGameSettings);


  useEffect(() => {
    if (maxPlayers === 1) {
      setDebugMode(true);
    } else {
      setDebugMode(false);
    }
  }, [maxPlayers]);

  const handleSubmit = async () => {
    if (!gameName || isCreating) return;
    setIsCreating(true);
    const numBots = maxPlayers === 1 ? 1 : 0;
    const success = await onCreateGame(gameName, maxPlayers, playerColor, numBots, debugMode, customSettings);
    setIsCreating(false);
    if (success) {
      onOpenChange(false);
    }
  };
  
  const handleSettingsSave = (newSettings: GameSettings) => {
    setCustomSettings(newSettings);
    setIsCustomizing(false);
  }

  return (
    <>
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
                Game Mode
              </Label>
              <Select
                value={String(maxPlayers)}
                onValueChange={(value) => setMaxPlayers(Number(value))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select max players" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Player vs. Bot</SelectItem>
                  <SelectItem value="2">2 Players</SelectItem>
                  <SelectItem value="3">3 Players</SelectItem>
                  <SelectItem value="4">4 Players</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="playerColor" className="text-right">
                Your Army
              </Label>
              <Select
                value={playerColor}
                onValueChange={(value) => setPlayerColor(value as PlayerColor)}
              >
                <SelectTrigger className="col-span-3 h-auto">
                   <SelectValue>
                      <span className="flex items-center gap-2">
                        <Image src={PLAYER_DATA[playerColor].sprite.idle} alt={PLAYER_DATA[playerColor].name} width={54} height={54} />
                        <span>{PLAYER_DATA[playerColor].name}</span>
                      </span>
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PLAYER_COLORS.map((color) => (
                    <SelectItem key={color} value={color}>
                      <span className="flex items-center gap-2">
                        <Image src={PLAYER_DATA[color].sprite.idle} alt={PLAYER_DATA[color].name} width={54} height={54} />
                        <span>{PLAYER_DATA[color].name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {maxPlayers === 1 && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="debugMode" className="text-right flex items-center gap-1">
                  Debug Mode
                  <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <HelpCircle className='h-4 w-4 text-muted-foreground' />
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Start the game with one of every special card for easy testing.</p>
                        </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <div className="col-span-3">
                  <Switch
                    id="debugMode"
                    checked={debugMode}
                    onCheckedChange={setDebugMode}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter className='sm:justify-between'>
            <Button variant="outline" onClick={() => setIsCustomizing(true)}>
                <Settings className="mr-2 h-4 w-4" />
                Customize Match
            </Button>
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
      <CustomSettingsSheet 
        open={isCustomizing}
        onOpenChange={setIsCustomizing}
        onSave={handleSettingsSave}
        initialSettings={customSettings}
      />
    </>
  );
}
