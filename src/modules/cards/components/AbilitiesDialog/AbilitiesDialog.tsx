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
import { ResourceIcon } from '@/components/icons';
import { ResourceType } from '@/lib/types';
import { CheckCircle, Award } from 'lucide-react';
import { useAbilitiesDialog } from './AbilitiesDialog.hook';
import { styles } from './AbilitiesDialog.styles';
import type { AbilitiesDialogProps } from './AbilitiesDialog.types';

export function AbilitiesDialog(props: AbilitiesDialogProps) {
  const { viewModel, onBuyAbility, onClose } = useAbilitiesDialog(props);

  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent className={styles.content}>
        <AlertDialogHeader className={styles.header}>
          <div className={styles.headerRow}>
            <div className={styles.iconWrap}>
              <Award className={styles.icon} />
            </div>
            <div>
              <AlertDialogTitle className={styles.title}>Empire Abilities Shop</AlertDialogTitle>
              <AlertDialogDescription className={styles.description}>
                Purchase permanent passive abilities using gold to empower your conquest.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <ScrollArea className={styles.scrollArea}>
          <div className={styles.grid}>
            {viewModel.abilities.map((ability) => (
              <Card key={ability.name} className={styles.card}>
                <CardHeader className={styles.cardHeader}>
                  <CardTitle className={styles.cardTitle}>{ability.title}</CardTitle>
                  {ability.hasAbility ? (
                    <Badge variant="outline" className={styles.activeBadge}>
                      <CheckCircle className={styles.activeIcon} />
                      <span>Active</span>
                    </Badge>
                  ) : (
                    ability.showBuyButton && (
                      <Button
                        size="sm"
                        onClick={() => onBuyAbility(ability)}
                        disabled={!ability.canAfford}
                        className={styles.buyButton}
                      >
                        <ResourceIcon type={ResourceType.Gold} className={styles.buyIcon} />
                        Buy ({viewModel.cost} Gold)
                      </Button>
                    )
                  )}
                </CardHeader>
                <CardContent className={styles.cardContent}>
                  <p className={styles.descriptionText}>{ability.description}</p>
                </CardContent>
              </Card>
            ))}
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
