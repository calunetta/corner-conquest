'use client';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Zap, Shield, Play } from 'lucide-react';
import { toCardsDialogViewModel } from './CardsDialog.map';
import { styles } from './CardsDialog.styles';
import type { CardsDialogProps } from './CardsDialog.types';

export function CardsDialog({ player, onClose, onUseCard, canUseCards }: CardsDialogProps) {
  const viewModel = toCardsDialogViewModel(player, canUseCards);

  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent className={styles.content}>
        <AlertDialogHeader className={styles.header}>
          <div className={styles.headerRow}>
            <div className={styles.iconWrap}>
              <Sparkles className={styles.icon} />
            </div>
            <div>
              <AlertDialogTitle className={styles.title}>{viewModel.playerName}&apos;s Special Cards</AlertDialogTitle>
              <AlertDialogDescription className={styles.description}>
                Tactical power-ups and special spells available for use.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <ScrollArea className={styles.scrollArea}>
          <div className={styles.grid}>
            {viewModel.cards.length > 0 ? (
              viewModel.cards.map((card) => (
                <Card key={card.name} className={styles.card}>
                  <CardHeader className={styles.cardHeader}>
                    <div className={styles.cardTitleRow}>
                      <Zap className={styles.zapIcon} />
                      <CardTitle className={styles.cardTitle}>{card.name}</CardTitle>
                    </div>
                    <div className={styles.badgeRow}>
                      <Badge variant="outline" className={styles.countBadge}>
                        x{card.count}
                      </Badge>
                      {card.isUsable && (
                        <Button
                          size="sm"
                          onClick={() => onUseCard(card.name)}
                          disabled={!viewModel.canUseCardAbility}
                          className={styles.useButton}
                        >
                          <Play className={styles.playIcon} />
                          Use
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className={styles.cardContent}>
                    <p className={styles.descriptionText}>{card.description}</p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className={styles.emptyState}>
                <Shield className={styles.emptyIcon} />
                <p className={styles.emptyText}>This player currently has no special cards.</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <AlertDialogFooter className={styles.footer}>
          <Button variant="outline" size="sm" onClick={onClose} className={styles.closeButton}>
            Close
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
