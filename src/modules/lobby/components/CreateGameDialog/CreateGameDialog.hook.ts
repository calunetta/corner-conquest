import { useEffect, useState } from 'react';
import { defaultGameSettings } from '@/modules/game-rules';
import type { GameSettings, PlayerColor } from '@/lib/types';
import { PlayerColor as PlayerColorEnum } from '@/lib/types';
import { toFactionOptions } from './CreateGameDialog.map';
import type { CreateGameDialogProps, CreateGameDialogViewModel } from './CreateGameDialog.types';

const DEFAULT_MAX_PLAYERS = 4;
const SOLO_MAX_PLAYERS = 1;

/** Local UI state for the create-game dialog; no Firestore, no legacy context. */
export function useCreateGameDialog(props: CreateGameDialogProps): CreateGameDialogViewModel {
  const { onOpenChange, onCreateGame } = props;
  const [gameName, setGameName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState<number>(DEFAULT_MAX_PLAYERS);
  const [playerColor, setPlayerColor] = useState<PlayerColor>(PlayerColorEnum.Blue);
  const [debugMode, setDebugMode] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [customSettings, setCustomSettings] = useState<GameSettings>(defaultGameSettings);

  useEffect(() => {
    setDebugMode(maxPlayers === SOLO_MAX_PLAYERS);
  }, [maxPlayers]);

  const handleSubmit = async (): Promise<void> => {
    if (!gameName.trim() || isCreating) return;
    setIsCreating(true);

    const numBots = maxPlayers === SOLO_MAX_PLAYERS ? 1 : 0;
    const finalSettings = { ...customSettings };
    if (maxPlayers === SOLO_MAX_PLAYERS) {
      finalSettings.fogOfWar = !debugMode;
    }

    const success = await onCreateGame(gameName.trim(), maxPlayers, playerColor, numBots, debugMode, finalSettings);
    setIsCreating(false);
    if (success) {
      onOpenChange(false);
    }
  };

  const handleSettingsSave = (newSettings: GameSettings): void => {
    setCustomSettings(newSettings);
    setIsCustomizing(false);
  };

  return {
    gameName,
    onGameNameChange: setGameName,
    maxPlayers,
    onMaxPlayersChange: setMaxPlayers,
    playerColor,
    onPlayerColorChange: setPlayerColor,
    debugMode,
    onDebugModeChange: setDebugMode,
    isCreating,
    isCustomizing,
    onOpenCustomize: () => setIsCustomizing(true),
    onCustomizeChange: setIsCustomizing,
    customSettings,
    factionOptions: toFactionOptions(),
    onSubmit: () => {
      void handleSubmit();
    },
    onSettingsSave: handleSettingsSave,
  };
}
