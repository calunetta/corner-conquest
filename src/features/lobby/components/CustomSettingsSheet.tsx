
'use client';
import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import type { GameSettings, CardName, AbilityName } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BASE_CARDS } from '@/lib/card-data';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { AbilityName as AbilityNameEnum } from '@/lib/enums';


type CustomSettingsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (settings: GameSettings) => void;
  initialSettings: GameSettings;
};

const ALL_ABILITIES: AbilityName[] = [AbilityNameEnum.Explorer, AbilityNameEnum.Collector];

export function CustomSettingsSheet({
  open,
  onOpenChange,
  onSave,
  initialSettings,
}: CustomSettingsSheetProps) {
  const [settings, setSettings] = useState<GameSettings>(initialSettings);

  const handleSave = () => {
    onSave(settings);
  };
  
  const handleCardToggle = (cardName: CardName, checked: boolean) => {
    setSettings(prev => ({
        ...prev,
        availableCards: checked 
            ? [...prev.availableCards, cardName]
            : prev.availableCards.filter(c => c !== cardName)
    }));
  };
  
  const handleAbilityToggle = (abilityName: AbilityName, checked: boolean) => {
    setSettings(prev => ({
        ...prev,
        availableAbilities: checked 
            ? [...prev.availableAbilities, abilityName]
            : prev.availableAbilities.filter(a => a !== abilityName)
    }));
  };

  const renderSlider = (
    key: keyof GameSettings,
    label: string,
    min: number,
    max: number,
    step: number = 1
  ) => {
    // A type guard to ensure we are only dealing with numeric settings
    if (typeof settings[key] !== 'number') {
        return null;
    }

    return (
        <div className="space-y-3">
        <div className="flex justify-between">
            <Label>{label}</Label>
            <span className="font-bold text-primary">
            {key === 'resourceDensity'
                ? `${Math.round((settings[key] as number) * 100)}%`
                : settings[key]}
            </span>
        </div>
        <Slider
            value={[settings[key] as number]}
            onValueChange={(value) => setSettings({ ...settings, [key]: value[0] })}
            min={min}
            max={max}
            step={step}
        />
        </div>
    );
  }
  
  const renderCardSelection = () => (
    <div className="space-y-4">
        <div className="space-y-1">
            <h4 className="font-medium">Available Cards</h4>
            <p className="text-sm text-muted-foreground">Select which special cards can be drawn during the game.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
            {BASE_CARDS.map(card => (
                <div key={card} className="flex items-center space-x-2">
                    <Checkbox
                        id={`card-${card}`}
                        checked={settings.availableCards.includes(card)}
                        onCheckedChange={(checked) => handleCardToggle(card, !!checked)}
                    />
                    <Label htmlFor={`card-${card}`}>{card}</Label>
                </div>
            ))}
        </div>
    </div>
  );
  
  const renderAbilitySelection = () => (
     <div className="space-y-4">
        <div className="space-y-1">
            <h4 className="font-medium">Available Abilities</h4>
            <p className="text-sm text-muted-foreground">Select which passive abilities can be purchased.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
            {ALL_ABILITIES.map(ability => (
                <div key={ability} className="flex items-center space-x-2">
                    <Checkbox
                        id={`ability-${ability}`}
                        checked={settings.availableAbilities.includes(ability)}
                        onCheckedChange={(checked) => handleAbilityToggle(ability, !!checked)}
                    />
                    <Label htmlFor={`ability-${ability}`} className='capitalize'>{ability}</Label>
                </div>
            ))}
        </div>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Customize Game Settings</SheetTitle>
          <SheetDescription>
            Tailor the game to your liking. These settings will apply to the new game you create.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1">
          <ScrollArea className="h-full pr-6">
            <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="costs">Costs</TabsTrigger>
                    <TabsTrigger value="content">Content</TabsTrigger>
                </TabsList>
                <TabsContent value="general" className="pt-4 space-y-6">
                    <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                            <Label>Fog of War</Label>
                            <p className="text-xs text-muted-foreground">
                                Hide map tiles until they are explored by each player individually.
                            </p>
                        </div>
                        <Switch
                            checked={settings.fogOfWar}
                            onCheckedChange={(checked) => setSettings({ ...settings, fogOfWar: checked })}
                        />
                    </div>
                    <Separator />
                    {renderSlider('victoryPointGoal', 'Victory Points to Win', 10, 100, 5)}
                    <Separator />
                    {renderSlider('vpPerIslandDiscovery', 'VP per Island Discovery', 0, 5)}
                    <Separator />
                    {renderSlider('resourceDensity', 'Resource vs. Monster Density', 0.1, 0.9, 0.05)}
                </TabsContent>
                 <TabsContent value="costs" className="pt-4 space-y-6">
                    {renderSlider('initialDeployCost', 'Initial Deploy Cost (Food)', 1, 10)}
                    <Separator />
                    {renderSlider('deployCostIncrement', 'Deploy Cost Increment', 0, 5)}
                    <Separator />
                    {renderSlider('upgradeCost', 'Upgrade Cost (Iron)', 1, 15)}
                    <Separator />
                    {renderSlider('abilityCost', 'Ability Cost (Gems)', 5, 50, 5)}
                    <Separator />
                    {renderSlider('baseResourceAmount', 'Resources per Spot', 1, 5)}
                </TabsContent>
                <TabsContent value="content" className="pt-4 space-y-6">
                    {renderCardSelection()}
                    <Separator />
                    {renderAbilitySelection()}
                </TabsContent>
            </Tabs>
          </ScrollArea>
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Settings</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
