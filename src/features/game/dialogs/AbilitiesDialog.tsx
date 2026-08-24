'use client';

import type { Player, GameState, AbilityName } from '@/lib/types';
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
import { Gem, CheckCircle, Award } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AbilityName as AbilityNameEnum } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

type AbilitiesDialogProps = {
  player: Player;
  onClose: () => void;
  onBuyAbility: (abilityName: AbilityName) => void;
  gameState: GameState;
  isMyTurn: boolean;
};

type AbilityInfo = {
  name: AbilityName;
  title: string;
  description: string;
};

const ALL_ABILITIES: AbilityInfo[] = [
  { name: AbilityNameEnum.Explorer, title: 'Explorer', description: 'Passively gain 1 VP per turn for each island you have an army on.' },
  { name: AbilityNameEnum.Collector, title: 'Collector', description: 'Passively collect 1 of each available resource from every island you have an army on at the end of your turn.' },
];

export function AbilitiesDialog({ player, onClose, onBuyAbility, gameState, isMyTurn }: AbilitiesDialogProps) {
  const { toast } = useToast();
  const { settings } = gameState;
  const cost = settings.abilityCost;
  
  const availableAbilities = ALL_ABILITIES.filter(a => settings.availableAbilities.includes(a.name));

  const handleBuy = (ability: AbilityInfo) => {
    try {
      onBuyAbility(ability.name);
      toast({ title: 'Purchase Successful!', description: `You have acquired the ${ability.title} ability.` });
    } catch(e: any) {
      console.error('Purchase Failed:', e);
      toast({ title: 'Purchase Failed', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent className="bg-background/90 backdrop-blur-2xl border border-white/15 shadow-[0_24px_72px_rgba(0,0,0,0.85)] max-w-md sm:max-w-lg overflow-hidden">
        <AlertDialogHeader className="pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <AlertDialogTitle className="text-xl font-bold">Empire Abilities Shop</AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground">
                Purchase permanent passive abilities using gems to empower your conquest.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        
        <ScrollArea className="h-72 pr-3 my-2">
          <div className="grid gap-3">
            {availableAbilities.map((ability) => {
              const hasAbility = player.passiveAbilities[ability.name];
              const canAfford = player.resources.gems >= cost;

              return (
                <Card key={ability.name} className="bg-black/40 border-white/10 hover:border-emerald-500/30 hover:bg-black/60 transition-all duration-200">
                  <CardHeader className="flex-row items-center justify-between p-3 pb-1">
                    <CardTitle className="text-sm font-bold text-foreground">{ability.title}</CardTitle>
                    {hasAbility ? (
                      <Badge variant="outline" className="bg-emerald-500/15 border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center gap-1">
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span>Active</span>
                      </Badge>
                    ) : (
                      <>
                        {isMyTurn && (
                          <Button
                            size="sm"
                            onClick={() => handleBuy(ability)}
                            disabled={!canAfford}
                            className="h-7 text-xs px-3 font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                          >
                            <Gem className="mr-1 h-3 w-3" />
                            Buy ({cost} Gems)
                          </Button>
                        )}
                      </>
                    )}
                  </CardHeader>
                  <CardContent className="p-3 pt-1">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {ability.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
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
