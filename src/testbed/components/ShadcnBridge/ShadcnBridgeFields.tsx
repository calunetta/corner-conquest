import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function InputStates() {
  return (
    <div className="flex max-w-sm flex-col gap-4 p-4">
      <Input aria-label="Default" placeholder="My island" />
      <Input aria-label="Focused" placeholder="Focused (autofocus)" autoFocus />
      <Input aria-label="Disabled" placeholder="Disabled" disabled />
      <div className="flex flex-col gap-1">
        <Input aria-label="Invalid" defaultValue="" placeholder="My island" aria-invalid="true" />
        <span className="font-readable text-sm text-destructive">Name is required</span>
      </div>
    </div>
  );
}

export function TextareaStates() {
  return (
    <div className="flex max-w-sm flex-col gap-4 p-4">
      <Textarea aria-label="Default" placeholder="Notes" />
      <Textarea aria-label="Focused" placeholder="Focused (autofocus)" autoFocus />
      <Textarea aria-label="Disabled" placeholder="Disabled" disabled />
      <Textarea aria-label="Invalid" placeholder="Notes" aria-invalid="true" />
    </div>
  );
}

export function LabelWithInput() {
  return (
    <div className="flex max-w-sm flex-col gap-2 p-4">
      <Label htmlFor="game-name">Game name</Label>
      <Input id="game-name" placeholder="My island" />
    </div>
  );
}
