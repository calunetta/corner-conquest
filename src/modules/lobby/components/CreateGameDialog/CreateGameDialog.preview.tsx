'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import type { ComponentPreview } from '@/testbed';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, HelpCircle, Settings, Swords, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CustomSettingsSheet } from '../CustomSettingsSheet';
import { useCreateGameDialog } from './CreateGameDialog.hook';
import { styles } from './CreateGameDialog.styles';
import type { CreateGameDialogViewModel } from './CreateGameDialog.types';

const noopAsync = async () => true;

/**
 * Pure view component that renders the dialog form.
 * Accepts the view model as props so preview can pass different states.
 */
function CreateGameDialogView(props: CreateGameDialogViewModel & { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <>
      <Dialog open={props.open} onOpenChange={props.onOpenChange}>
        <DialogContent className={styles.dialogContent}>
          <DialogHeader className={styles.dialogHeader}>
            <div className={styles.headerContainer}>
              <div className={styles.headerIcon}>
                <Swords className="h-5 w-5" />
              </div>
              <div className={styles.headerTextGroup}>
                <DialogTitle className={styles.dialogTitle}>Create Conquest Arena</DialogTitle>
                <DialogDescription className={styles.dialogDescription}>
                  Configure room settings, player capacity, and choose your army commander.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className={styles.formContent}>
            <div className={styles.formGroup}>
              <Label htmlFor="name" className={styles.label}>Game Name</Label>
              <Input id="name" value={props.gameName} onChange={(e) => props.onGameNameChange(e.target.value)}
                className={styles.input} placeholder="Archipelago Conquest" />
            </div>
            <div className={styles.formGroup}>
              <Label id="maxPlayers" htmlFor="maxPlayers" className={styles.label}>Match Format</Label>
              <div role="group" aria-labelledby="maxPlayers" className={styles.formatGrid}>
                {props.formatOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = props.maxPlayers === opt.value;
                  return (
                    <button key={opt.value} type="button" aria-pressed={isSelected}
                      onClick={() => props.onMaxPlayersChange(opt.value)}
                      className={cn(styles.formatCard, isSelected ? styles.formatCardSelected : styles.formatCardUnselected)}>
                      <div className={cn(styles.formatIconCircle, isSelected ? styles.formatIconCircleSelected : styles.formatIconCircleUnselected)}>
                        <Icon className={styles.formatIconSize} />
                      </div>
                      <div className={styles.formatTextGroup}>
                        <div className={styles.formatTitle}>{opt.title}</div>
                        <div className={styles.formatMeta}>{opt.meta}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className={styles.formGroup}>
              <Label className={styles.label}>Choose Faction Army</Label>
              <div className={styles.factionGrid}>
                {props.factionOptions.map((opt) => (
                  <button key={opt.color} type="button" onClick={() => props.onPlayerColorChange(opt.color)}
                    className={`${styles.factionButton} ${props.playerColor === opt.color ? styles.factionButtonSelected : styles.factionButtonUnselected}`}>
                    <Image src={opt.spriteSrc} alt={opt.name} width={40} height={40}
                      className={styles.factionImage} unoptimized />
                    <span className={styles.factionName}>{opt.name}</span>
                  </button>
                ))}
              </div>
            </div>
            {props.maxPlayers === 1 && (
              <div className={styles.debugModeContainer}>
                <div className="space-y-0.5">
                  <Label htmlFor="debugMode" className={styles.debugModeLabel}>
                    Debug Training Mode
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className={styles.helpIcon} />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Disables Fog of War and provides all special cards for testing.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <p className={styles.debugModeDescription}>Reveal full map and start with cards.</p>
                </div>
                <Switch id="debugMode" checked={props.debugMode} onCheckedChange={props.onDebugModeChange} />
              </div>
            )}
          </div>
          <DialogFooter className={styles.dialogFooter}>
            <Button variant="outline" size="sm" onClick={props.onOpenCustomize} className={styles.advancedButton}>
              <Settings className="mr-1.5 h-3.5 w-3.5" />
              Advanced Rules
            </Button>
            <Button onClick={props.onSubmit} disabled={!props.gameName.trim() || props.isCreating} className={styles.createButton}>
              {props.isCreating ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Shield className="mr-1.5 h-3.5 w-3.5" />}
              Create Game
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CustomSettingsSheet open={props.isCustomizing} onOpenChange={props.onCustomizeChange} onSave={props.onSettingsSave} initialSettings={props.customSettings} />
    </>
  );
}

/**
 * Wrapper to manage dialog state and drive hook to a specific maxPlayers value.
 */
function CreateGameDialogWrapper({ targetMaxPlayers }: { targetMaxPlayers?: number }) {
  const [isOpen, setIsOpen] = useState(true);
  const vm = useCreateGameDialog({ open: true, onOpenChange: setIsOpen, onCreateGame: noopAsync });

  // Drive the hook to the target maxPlayers state via useEffect.
  // Intentionally omit vm from dependencies so this only runs when the preview's
  // targetMaxPlayers prop changes, not on every internal vm state update (e.g., card clicks).
  // This allows user clicks on format cards to persist and update aria-pressed states.
  useEffect(() => {
    if (targetMaxPlayers !== undefined && vm.maxPlayers !== targetMaxPlayers) {
      vm.onMaxPlayersChange(targetMaxPlayers);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetMaxPlayers]);

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} variant="outline">
        Reopen dialog
      </Button>
    );
  }

  return <CreateGameDialogView {...vm} open={isOpen} onOpenChange={setIsOpen} />;
}

export const createGameDialogPreview: ComponentPreview = {
  slug: 'lobby-create-dialog',
  title: 'Create game dialog',
  group: 'Lobby',
  states: [
    {
      name: 'Multiplayer',
      render: () => <CreateGameDialogWrapper targetMaxPlayers={4} />,
    },
    {
      name: 'Solo vs bot',
      render: () => <CreateGameDialogWrapper targetMaxPlayers={1} />,
    },
  ],
};
