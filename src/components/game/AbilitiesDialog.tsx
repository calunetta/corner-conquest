
'use client';
import type { Player, PassiveAbilities } from '@/lib/types';
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
import { Gem, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type AbilitiesDialogProps = {
  player: Player;
  onClose: () => void;
  onBuyAbility: (abilityName: keyof PassiveAbilities) => void;
};

type AbilityInfo = {
  name: keyof PassiveAbilities;
  title: string;
  description: string;
  cost: number;
}

const ABILITIES: AbilityInfo[] = [
    { name: 'explorer', title: 'Explorer', description: 'Passively gain 1 VP per turn for each island you have an army on.', cost: 15 },
    { name: 'collector', title: 'Collector', description: 'Passively collect 1 of each available resource from every island you have an army on at the end of your turn.', cost: 15 },
]

export function AbilitiesDialog({ player, onClose, onBuyAbility }: AbilitiesDialogProps) {
  const { toast } = useToast();

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
            {ABILITIES.map((ability) => {
                const hasAbility = player.passiveAbilities[ability.name];
                const canAfford = player.resources.gems >= ability.cost;

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
                                <Button size="sm" onClick={() => handleBuy(ability)} disabled={!canAfford}>
                                    <Gem className="mr-2 h-4 w-4" />
                                    Purchase ({ability.cost})
                                </Button>
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
          <AlertDialogCancel asChild>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
