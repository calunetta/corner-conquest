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
import { GameSettings, PlayerColor } from '@/lib/types';
import { Loader2, HelpCircle, Settings, Swords, Shield } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CustomSettingsSheet } from './CustomSettingsSheet';
import { defaultGameSettings } from '@/lib/game-initializer';
import { PLAYER_COLORS, PLAYER_DATA } from '@/modules/game-rules';
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
  const [playerColor, setPlayerColor] = useState<PlayerColor>(PlayerColor.Blue);
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
    if (!gameName.trim() || isCreating) return;
    setIsCreating(true);
    const numBots = maxPlayers === 1 ? 1 : 0;
    
    let finalSettings = { ...customSettings };
    if (maxPlayers === 1) {
      finalSettings.fogOfWar = !debugMode;
    }

    const success = await onCreateGame(gameName.trim(), maxPlayers, playerColor, numBots, debugMode, finalSettings);
    setIsCreating(false);
    if (success) {
      onOpenChange(false);
    }
  };
  
  const handleSettingsSave = (newSettings: GameSettings) => {
    setCustomSettings(newSettings);
    setIsCustomizing(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-background/90 backdrop-blur-2xl border border-white/15 shadow-[0_24px_72px_rgba(0,0,0,0.85)] max-w-lg overflow-hidden">
          <DialogHeader className="pb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Swords className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">Create Conquest Arena</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Configure room settings, player capacity, and choose your army commander.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="grid gap-4 py-3">
            {/* Game Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-semibold text-foreground">
                Game Name
              </Label>
              <Input
                id="name"
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                className="bg-black/40 border-white/10 focus-visible:ring-amber-400"
                placeholder="Archipelago Conquest"
              />
            </div>

            {/* Game Mode */}
            <div className="space-y-1.5">
              <Label htmlFor="maxPlayers" className="text-xs font-semibold text-foreground">
                Match Format
              </Label>
              <Select
                value={String(maxPlayers)}
                onValueChange={(value) => setMaxPlayers(Number(value))}
              >
                <SelectTrigger className="bg-black/40 border-white/10">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent className="bg-background/95 backdrop-blur-xl border-white/15">
                  <SelectItem value="1">Solo vs. Bot AI (Training match)</SelectItem>
                  <SelectItem value="2">2 Players (1v1 Duel)</SelectItem>
                  <SelectItem value="3">3 Players (Archipelago Skirmish)</SelectItem>
                  <SelectItem value="4">4 Players (Grand Conquest)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Faction Army Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">
                Choose Faction Army
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PLAYER_COLORS.map((color) => {
                  const isSelected = playerColor === color;
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setPlayerColor(color)}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all duration-200 ${
                        isSelected
                          ? 'border-amber-400 bg-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.4)] scale-105'
                          : 'border-white/10 bg-black/30 hover:border-white/20 hover:bg-black/50'
                      }`}
                    >
                      <Image
                        src={PLAYER_DATA[color].sprite.idle}
                        alt={PLAYER_DATA[color].name}
                        width={40}
                        height={40}
                        className="object-contain drop-shadow"
                        unoptimized
                      />
                      <span className="text-[11px] font-bold mt-1 capitalize text-foreground">
                        {PLAYER_DATA[color].name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {maxPlayers === 1 && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/10">
                <div className="space-y-0.5">
                  <Label htmlFor="debugMode" className="text-xs font-semibold text-foreground flex items-center gap-1">
                    Debug Training Mode
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Disables Fog of War and provides all special cards for testing.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <p className="text-[11px] text-muted-foreground">Reveal full map and start with cards.</p>
                </div>
                <Switch
                  id="debugMode"
                  checked={debugMode}
                  onCheckedChange={setDebugMode}
                />
              </div>
            )}
          </div>

          <DialogFooter className="sm:justify-between pt-2 border-t border-white/10 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCustomizing(true)}
              className="border-white/10 hover:bg-white/5 text-xs"
            >
              <Settings className="mr-1.5 h-3.5 w-3.5" />
              Advanced Rules
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!gameName.trim() || isCreating}
              className="font-bold bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-[0_0_16px_rgba(245,158,11,0.3)] text-xs px-4"
            >
              {isCreating ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Shield className="mr-1.5 h-3.5 w-3.5" />}
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
