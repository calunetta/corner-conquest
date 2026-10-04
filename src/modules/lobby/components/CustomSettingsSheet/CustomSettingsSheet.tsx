'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BASE_CARDS } from '@/modules/game-rules';
import { GENERAL_SLIDERS, COST_SLIDERS, ALL_ABILITIES, toSliderDisplayValue } from './CustomSettingsSheet.map';
import { useCustomSettingsSheet } from './CustomSettingsSheet.hook';
import { styles } from './CustomSettingsSheet.styles';
import type { CustomSettingsSheetProps } from './CustomSettingsSheet.types';

export function CustomSettingsSheet(props: CustomSettingsSheetProps) {
  const { settings, onSliderChange, onFogOfWarChange, onCardToggle, onAbilityToggle, onSave } =
    useCustomSettingsSheet(props);

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent className={styles.content}>
        <SheetHeader className={styles.header}>
          <SheetTitle>Customize Game Settings</SheetTitle>
          <SheetDescription>
            Tailor the game to your liking. These settings will apply to the new game you create.
          </SheetDescription>
        </SheetHeader>
        <div className={styles.scrollContainer}>
          <ScrollArea className={styles.scrollArea}>
            <Tabs defaultValue="general" className="w-full">
              <TabsList className={styles.tabsList}>
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="costs">Costs</TabsTrigger>
                <TabsTrigger value="content">Content</TabsTrigger>
              </TabsList>
              <TabsContent value="general" className={styles.tabsContent}>
                <div className={styles.fogSection}>
                  <div className="space-y-0.5">
                    <Label>Fog of War</Label>
                    <p className={styles.fogDescription}>
                      Hide map tiles until they are explored by each player individually.
                    </p>
                  </div>
                  <Switch checked={settings.fogOfWar} onCheckedChange={onFogOfWarChange} />
                </div>
                <Separator />
                {GENERAL_SLIDERS.map((config) => (
                  <div key={config.key} className={styles.sliderGroup}>
                    <div className={styles.sliderHeader}>
                      <Label>{config.label}</Label>
                      <span className={styles.sliderValue}>
                        {toSliderDisplayValue(config.key, settings[config.key] as number)}
                      </span>
                    </div>
                    <Slider
                      value={[settings[config.key] as number]}
                      onValueChange={(value) => onSliderChange(config.key, value[0])}
                      min={config.min}
                      max={config.max}
                      step={config.step}
                      className={styles.sliderTrack}
                    />
                    {config.key !== GENERAL_SLIDERS[GENERAL_SLIDERS.length - 1].key && <Separator />}
                  </div>
                ))}
              </TabsContent>
              <TabsContent value="costs" className={styles.tabsContent}>
                {COST_SLIDERS.map((config, idx) => (
                  <div key={config.key}>
                    <div className={styles.sliderGroup}>
                      <div className={styles.sliderHeader}>
                        <Label>{config.label}</Label>
                        <span className={styles.sliderValue}>
                          {toSliderDisplayValue(config.key, settings[config.key] as number)}
                        </span>
                      </div>
                      <Slider
                        value={[settings[config.key] as number]}
                        onValueChange={(value) => onSliderChange(config.key, value[0])}
                        min={config.min}
                        max={config.max}
                        step={config.step}
                        className={styles.sliderTrack}
                      />
                    </div>
                    {idx < COST_SLIDERS.length - 1 && <Separator />}
                  </div>
                ))}
              </TabsContent>
              <TabsContent value="content" className={styles.tabsContent}>
                <div className={styles.cardSection}>
                  <div className={styles.cardSubheader}>
                    <h4 className={styles.cardTitle}>Available Cards</h4>
                    <p className={styles.cardDescription}>Select which special cards can be drawn during the game.</p>
                  </div>
                  <div className={styles.cardGrid}>
                    {BASE_CARDS.map((card) => (
                      <div key={card} className={styles.checkboxItem}>
                        <Checkbox
                          id={`card-${card}`}
                          checked={settings.availableCards.includes(card)}
                          onCheckedChange={(checked) => onCardToggle(card, !!checked)}
                        />
                        <Label htmlFor={`card-${card}`}>{card}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                <Separator />
                <div className={styles.cardSection}>
                  <div className={styles.cardSubheader}>
                    <h4 className={styles.cardTitle}>Available Abilities</h4>
                    <p className={styles.cardDescription}>Select which passive abilities can be purchased.</p>
                  </div>
                  <div className={styles.cardGrid}>
                    {ALL_ABILITIES.map((ability) => (
                      <div key={ability} className={styles.checkboxItem}>
                        <Checkbox
                          id={`ability-${ability}`}
                          checked={settings.availableAbilities.includes(ability)}
                          onCheckedChange={(checked) => onAbilityToggle(ability, !!checked)}
                        />
                        <Label htmlFor={`ability-${ability}`} className="capitalize">
                          {ability}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </ScrollArea>
        </div>
        <SheetFooter className={styles.footer}>
          <Button variant="outline" onClick={() => props.onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSave}>Save Settings</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
