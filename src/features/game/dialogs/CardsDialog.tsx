'use client';

import type { Player, CardName } from '@/lib/types';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { GameAction } from '@/lib/types';
import { Sparkles, Zap, Shield, Play } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type CardsDialogProps = {
  player: Player;
  onClose: () => void;
  onUseCard: (cardName: CardName) => void;
  canUseCards: boolean;
};

export function CardsDialog({ player, onClose, onUseCard, canUseCards }: CardsDialogProps) {
  const cardCounts = player.specialCards.reduce((acc, card) => {
    acc[card] = (acc[card] || 0) + 1;
    return acc;
  }, {} as Record<CardName, number>);

  const uniqueCards = Object.keys(cardCounts) as CardName[];
  const canUseCardAbility = canUseCards && !player.actionsThisTurn.includes(GameAction.UseCard);
  
  const handleUseCard = (cardName: CardName) => {
    onUseCard(cardName);
  };

  const isCardUsableNow = (cardName: CardName): boolean => {
    return USABLE_CARDS.includes(cardName);
  };

  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent className="bg-background/90 backdrop-blur-2xl border border-white/15 shadow-[0_24px_72px_rgba(0,0,0,0.85)] max-w-md sm:max-w-2xl overflow-hidden">
        <AlertDialogHeader className="pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <AlertDialogTitle className="text-xl font-bold">{player.name}'s Special Cards</AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground">
                Tactical power-ups and special spells available for use.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        
        <ScrollArea className="h-80 pr-3 my-2">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {uniqueCards.length > 0 ? (
              uniqueCards.map((cardName) => {
                const count = cardCounts[cardName];
                const usable = isCardUsableNow(cardName);

                return (
                  <Card
                    key={cardName}
                    className="bg-black/40 border-white/10 hover:border-cyan-500/30 hover:bg-black/60 transition-all duration-200"
                  >
                    <CardHeader className="flex-row items-center justify-between p-3 pb-1">
                      <div className="flex items-center gap-1.5">
                        <Zap className="h-4 w-4 text-cyan-400 shrink-0" />
                        <CardTitle className="text-sm font-bold text-foreground truncate">{cardName}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs font-mono font-bold bg-white/5 border-white/15">
                          x{count}
                        </Badge>
                        {usable && (
                          <Button 
                            size="sm" 
                            onClick={() => handleUseCard(cardName)} 
                            disabled={!canUseCardAbility}
                            className="h-7 text-xs px-3 font-bold bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                          >
                            <Play className="mr-1 h-3 w-3" />
                            Use
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 pt-1">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {SPECIAL_CARD_DESCRIPTIONS[cardName] || 'No description available.'}
                      </p>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                <Shield className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm">This player currently has no special cards.</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <AlertDialogFooter className="pt-2 border-t border-white/10">
          <Button variant="outline" size="sm" onClick={onClose} className="border-white/10 text-xs">
            Close
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
