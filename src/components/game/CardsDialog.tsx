
'use client';
import type { Player } from '@/lib/types';
import { SPECIAL_CARD_DESCRIPTIONS, USABLE_CARDS } from '@/lib/card-data';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import { AlertDialogCancel } from '@radix-ui/react-alert-dialog';

type CardsDialogProps = {
  player: Player;
  onClose: () => void;
  onUseCard: (cardName: string) => void;
  canUseCards: boolean;
};

export function CardsDialog({ player, onClose, onUseCard, canUseCards }: CardsDialogProps) {
  const cardCounts = player.specialCards.reduce((acc, card) => {
    acc[card] = (acc[card] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const uniqueCards = Object.keys(cardCounts);

  const canUseCardAbility = canUseCards && !player.actionsThisTurn.includes('use-card');
  
  const handleUseCard = (cardName: string) => {
    onUseCard(cardName);
  }

  const isCardUsableNow = (cardName: string): boolean => {
    return USABLE_CARDS.includes(cardName);
  }

  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md sm:max-w-3xl">
        <AlertDialogHeader>
          <AlertDialogTitle>{player.name}'s Special Cards</AlertDialogTitle>
          <AlertDialogDescription>
            These are the special cards you have collected. You can use one card per turn.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <ScrollArea className="h-96 pr-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {uniqueCards.length > 0 ? uniqueCards.map((cardName) => {
                return (
                    <Card key={cardName}>
                        <CardHeader className='flex-row items-center justify-between p-4'>
                            <CardTitle className="text-lg">{cardName}</CardTitle>
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-bold text-muted-foreground">x{cardCounts[cardName]}</span>
                                {isCardUsableNow(cardName) && (
                                    <Button 
                                        size="sm" 
                                        onClick={() => handleUseCard(cardName)} 
                                        disabled={!canUseCardAbility}
                                    >
                                        Use
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className='p-4 pt-0'>
                            <p className="text-sm text-muted-foreground">
                                {SPECIAL_CARD_DESCRIPTIONS[cardName] || 'No description available.'}
                            </p>
                        </CardContent>
                    </Card>
                )
            }) : (
                <p className="text-center text-muted-foreground">You have no special cards.</p>
            )}
            </div>
        </ScrollArea>

        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
