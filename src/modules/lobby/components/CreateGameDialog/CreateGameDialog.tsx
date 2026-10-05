'use client';

import Image from 'next/image';
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
import type { CreateGameDialogProps } from './CreateGameDialog.types';

export function CreateGameDialog(props: CreateGameDialogProps) {
  const vm = useCreateGameDialog(props);

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
              <Input id="name" value={vm.gameName} onChange={(e) => vm.onGameNameChange(e.target.value)}
                className={styles.input} placeholder="Archipelago Conquest" />
            </div>
            <div className={styles.formGroup}>
              <Label id="maxPlayers" htmlFor="maxPlayers" className={styles.label}>Match Format</Label>
              <div role="group" aria-labelledby="maxPlayers" className={styles.formatGrid}>
                {vm.formatOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = vm.maxPlayers === opt.value;
                  return (
                    <button key={opt.value} type="button" aria-pressed={isSelected}
                      onClick={() => vm.onMaxPlayersChange(opt.value)}
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
                {vm.factionOptions.map((opt) => (
                  <button key={opt.color} type="button" onClick={() => vm.onPlayerColorChange(opt.color)}
                    className={`${styles.factionButton} ${vm.playerColor === opt.color ? styles.factionButtonSelected : styles.factionButtonUnselected}`}>
                    <Image src={opt.spriteSrc} alt={opt.name} width={40} height={40}
                      className={styles.factionImage} unoptimized />
                    <span className={styles.factionName}>{opt.name}</span>
                  </button>
                ))}
              </div>
            </div>
            {vm.maxPlayers === 1 && (
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
                <Switch id="debugMode" checked={vm.debugMode} onCheckedChange={vm.onDebugModeChange} />
              </div>
            )}
          </div>
          <DialogFooter className={styles.dialogFooter}>
            <Button variant="outline" size="sm" onClick={vm.onOpenCustomize} className={styles.advancedButton}>
              <Settings className="mr-1.5 h-3.5 w-3.5" />
              Advanced Rules
            </Button>
            <Button onClick={vm.onSubmit} disabled={!vm.gameName.trim() || vm.isCreating} className={styles.createButton}>
              {vm.isCreating ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Shield className="mr-1.5 h-3.5 w-3.5" />}
              Create Game
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CustomSettingsSheet open={vm.isCustomizing} onOpenChange={vm.onCustomizeChange} onSave={vm.onSettingsSave} initialSettings={vm.customSettings} />
    </>
  );
}
