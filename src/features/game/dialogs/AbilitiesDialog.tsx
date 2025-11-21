

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
import { Gem, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AbilityName as AbilityNameEnum } from '@/lib/types';

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
}

const ALL_ABILITIES: AbilityInfo[] = [
    { name: AbilityNameEnum.Explorer, title: 'Explorer', description: 'Passively gain 1 VP per turn for each island you have an army on.' },
    { name: AbilityNameEnum.Collector, title: 'Collector', description: 'Passively collect 1 of each available resource from every island you have an army on at the end of your turn.' },
]

export function AbilitiesDialog({ player, onClose, onBuyAbility, gameState, isMyTurn }: AbilitiesDialogProps) {
  const { toast } = useToast();
  const { settings } = gameState;
  const cost = settings.abilityCost;
  
  const availableAbilities = ALL_ABILITIES.filter(a => settings.availableAbilities.includes(a.name));

  const handleBuy = (ability: AbilityInfo) => {
    try {
        onBuyAbility(ability.name);
        toast({ title: 'Purchase Successful!', description: `You have acquired the ${ability.title} ability.`});
    } catch(e: any) {
        toast({ title: 'Purchase Failed', description: e.message, variant: 'destructive'});
    }
  }

  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Abilities Shop</AlertDialogTitle>
          <AlertDialogDescription>
            Purchase permanent passive abilities for your empire.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <ScrollArea className="h-72 pr-6">
            <div className="grid gap-4">
            {availableAbilities.map((ability) => {
                const hasAbility = player.passiveAbilities[ability.name];
                const canAfford = player.resources.gems >= cost;

                return (
                    <Card key={ability.name}>
                        <CardHeader className='flex-row items-center justify-between p-4'>
                            <CardTitle className="text-lg">{ability.title}</CardTitle>
                            {hasAbility ? (
                                <div className="flex items-center gap-2 text-green-500">
                                    <CheckCircle className="h-5 w-5" />
                                    <span className="font-bold">Owned</span>
                                </div>
                            ) : (
                                <>
                                  {isMyTurn && (
                                    <Button size="sm" onClick={() => handleBuy(ability)} disabled={!canAfford}>
                                        <Gem className="mr-2 h-4 w-4" />
                                        Purchase ({cost})
                                    </Button>
                                  )}
                                </>
                            )}
                        </CardHeader>
                        <CardContent className='p-4 pt-0'>
                            <p className="text-sm text-muted-foreground">
                                {ability.description}
                            </p>
                        </CardContent>
                    </Card>
                )
            })}
            </div>
        </ScrollArea>

        <AlertDialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
