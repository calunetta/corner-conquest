'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { RegistryIcon } from '@/modules/shared';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { playerRingColors } from '@/modules/hud';
import { cn } from '@/lib/utils';
import { toVictoryViewModel } from './VictoryDialog.map';
import { styles } from './VictoryDialog.styles';
import type { VictoryDialogProps } from './VictoryDialog.types';

/** Pure view: the one-button end-of-match dialog. Escape/outside click are no-ops (no onOpenChange). */
export function VictoryDialog({ winner, isLocalWinner, isExiting, onReturnToLobby }: VictoryDialogProps) {
  const vm = toVictoryViewModel(winner, isLocalWinner);
  const returnButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <AlertDialog open={true}>
      <AlertDialogContent
        className={styles.content}
        onOpenAutoFocus={(event) => {
          // Radix only auto-focuses an AlertDialogCancel by default; this dialog has none.
          event.preventDefault();
          returnButtonRef.current?.focus();
        }}
      >
        <AlertDialogHeader>
          <div className={styles.iconWrap}>
            <RegistryIcon id="trophy" className={styles.icon} />
          </div>
          <AlertDialogTitle className={styles.title}>{vm.title}</AlertDialogTitle>
          <AlertDialogDescription className={styles.subtitle}>{vm.subtitle}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className={styles.winnerRow}>
          <div className={cn(styles.avatarContainer, playerRingColors[vm.color])}>
            {vm.avatarSrc ? (
              <Image
                src={vm.avatarSrc}
                alt={`${vm.color} player`}
                width={64}
                height={64}
                className={styles.avatarImage}
                unoptimized
              />
            ) : (
              <RegistryIcon id={vm.iconId} alt={`${vm.color} player`} className={styles.avatarImage} />
            )}
          </div>
          <div className={styles.winnerInfo}>
            <div className={styles.winnerNameRow}>
              <span className={styles.winnerName}>{winner.name}</span>
              {vm.isBot && (
                <Badge variant="secondary" className={styles.botBadge}>
                  BOT
                </Badge>
              )}
            </div>
            <span className={styles.commanderLine}>{vm.commanderLine}</span>
          </div>
        </div>

        <AlertDialogFooter className={styles.footer}>
          <Button
            ref={returnButtonRef}
            className={styles.returnButton}
            disabled={isExiting}
            onClick={onReturnToLobby}
          >
            {isExiting ? (
              <>
                <RegistryIcon id="loader-2" className={styles.loadingIcon} />
                Returning…
              </>
            ) : (
              <>
                <RegistryIcon id="log-out" className={styles.buttonIcon} />
                Return to Lobby
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
