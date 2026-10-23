import type { ReactNode } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

const AVATAR_SRC = '/tiny-swords/UI Elements/UI Elements/Human Avatars/Avatars_01.png';

function Row({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      {children}
      <Label htmlFor={id}>{label}</Label>
    </div>
  );
}

export function SwitchStates() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <Row id="sw-off" label="Off"><Switch id="sw-off" /></Row>
      <Row id="sw-on" label="On"><Switch id="sw-on" defaultChecked /></Row>
      <Row id="sw-dis" label="Disabled"><Switch id="sw-dis" disabled /></Row>
      <Row id="sw-dis-on" label="Disabled on"><Switch id="sw-dis-on" disabled defaultChecked /></Row>
    </div>
  );
}

export function CheckboxStates() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <Row id="cb-off" label="Unchecked"><Checkbox id="cb-off" /></Row>
      <Row id="cb-on" label="Checked"><Checkbox id="cb-on" defaultChecked /></Row>
      <Row id="cb-dis" label="Disabled"><Checkbox id="cb-dis" disabled /></Row>
      <Row id="cb-dis-on" label="Disabled checked"><Checkbox id="cb-dis-on" disabled defaultChecked /></Row>
    </div>
  );
}

export function RadioGroupState() {
  return (
    <RadioGroup defaultValue="normal" aria-label="Difficulty" className="p-4">
      <Row id="rg-easy" label="Easy"><RadioGroupItem id="rg-easy" value="easy" /></Row>
      <Row id="rg-normal" label="Normal"><RadioGroupItem id="rg-normal" value="normal" /></Row>
      <Row id="rg-hard" label="Hard"><RadioGroupItem id="rg-hard" value="hard" /></Row>
      <Row id="rg-locked" label="Locked"><RadioGroupItem id="rg-locked" value="locked" disabled /></Row>
    </RadioGroup>
  );
}

const SLIDERS = [
  { label: 'Low', value: 10, disabled: false },
  { label: 'Mid', value: 50, disabled: false },
  { label: 'High', value: 90, disabled: false },
  { label: 'Disabled', value: 50, disabled: true },
];

export function SliderStates() {
  return (
    <div className="flex max-w-sm flex-col gap-5 p-4">
      {SLIDERS.map(({ label, value, disabled }) => (
        <div key={label} className="flex flex-col gap-2">
          <span className="font-readable text-sm">{label}</span>
          <Slider aria-label={label} defaultValue={[value]} max={100} step={1} disabled={disabled} />
        </div>
      ))}
    </div>
  );
}

function SeparatorDemo() {
  return (
    <div className="flex flex-col gap-3">
      <span className="font-readable text-sm">Above</span>
      <Separator />
      <div className="flex h-8 items-center gap-3">
        <span className="font-readable text-sm">Left</span>
        <Separator orientation="vertical" />
        <span className="font-readable text-sm">Right</span>
      </div>
    </div>
  );
}

export function SeparatorStates() {
  return (
    <div className="flex max-w-sm flex-col gap-6 p-4">
      <div data-testid="separator-dark"><SeparatorDemo /></div>
      <Card frame="paper" className="w-full">
        <div className="p-4" data-testid="separator-paper"><SeparatorDemo /></div>
      </Card>
    </div>
  );
}

export function ScrollAreaLong() {
  return (
    <div className="p-4">
      <ScrollArea className="h-48 w-64 max-w-full border-2 border-border">
        <ul className="flex flex-col gap-2 p-3">
          {Array.from({ length: 30 }, (_, i) => (
            <li key={i} className="font-readable text-sm">Event {i + 1}: army moved.</li>
          ))}
        </ul>
      </ScrollArea>
    </div>
  );
}

export function AvatarStates() {
  return (
    <div className="flex items-center gap-4 p-4">
      <Avatar><AvatarImage src={AVATAR_SRC} alt="Player avatar" /><AvatarFallback>CC</AvatarFallback></Avatar>
      <Avatar><AvatarImage src="data:image/png;base64,AAAA" alt="Missing" /><AvatarFallback>CC</AvatarFallback></Avatar>
      <Avatar><AvatarFallback>B</AvatarFallback></Avatar>
    </div>
  );
}
