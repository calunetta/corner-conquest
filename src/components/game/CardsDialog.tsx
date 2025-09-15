'use client';
import type { Player } from '@/lib/types';
import { SPECIAL_CARD_DESCRIPTIONS } from '@/lib/card-data';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '../ui/scroll-area';

type CardsDialogProps = {
  player: Player;
  onClose: () => void;
};

export function CardsDialog({ player, onClose }: CardsDialogProps) {

  const cardCounts = player.specialCards.reduce((acc, card) => {
    acc[card] = (acc[card] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const uniqueCards = Object.keys(cardCounts);

  return (
    <AlertDialog open={true}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>{player.name}'s Special Cards</AlertDialogTitle>
          <AlertDialogDescription>
            These are the special cards you have collected.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <ScrollArea className="h-72 pr-6">
            <div className="grid gap-4">
            {uniqueCards.length > 0 ? uniqueCards.map((cardName) => (
                <Card key={cardName}>
                    <CardHeader className='flex-row items-center justify-between p-4'>
                        <CardTitle className="text-lg">{cardName}</CardTitle>
                        <span className="text-sm font-bold text-muted-foreground">x{cardCounts[cardName]}</span>
                    </CardHeader>
                    <CardContent className='p-4 pt-0'>
                        <p className="text-sm text-muted-foreground">
                            {SPECIAL_CARD_DESCRIPTIONS[cardName] || 'No description available.'}
                        </p>
                    </CardContent>
                </Card>
            )) : (
                <p className="text-center text-muted-foreground">You have no special cards.</p>
            )}
            </div>
        </ScrollArea>

        <AlertDialogFooter>
          <AlertDialogAction onClick={onClose}>Close</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
