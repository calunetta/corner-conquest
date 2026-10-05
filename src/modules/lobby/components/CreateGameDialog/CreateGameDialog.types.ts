import type { GameSettings, PlayerColor } from '@/lib/types';
import type { LucideIcon } from 'lucide-react';

export type CreateGameDialogProps = {
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

export type FactionOption = {
  color: PlayerColor;
  name: string;
  spriteSrc: string;
};

export type FormatOption = {
  value: number;
  title: string;
  meta: string;
  icon: LucideIcon;
};

export type CreateGameDialogViewModel = {
  gameName: string;
  onGameNameChange: (value: string) => void;
  maxPlayers: number;
  onMaxPlayersChange: (value: number) => void;
  playerColor: PlayerColor;
  onPlayerColorChange: (color: PlayerColor) => void;
  debugMode: boolean;
  onDebugModeChange: (checked: boolean) => void;
  isCreating: boolean;
  isCustomizing: boolean;
  onOpenCustomize: () => void;
  onCustomizeChange: (open: boolean) => void;
  customSettings: GameSettings;
  factionOptions: FactionOption[];
  formatOptions: FormatOption[];
  onSubmit: () => void;
  onSettingsSave: (settings: GameSettings) => void;
};
