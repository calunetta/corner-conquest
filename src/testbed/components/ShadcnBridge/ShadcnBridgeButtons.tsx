import { Button, type ButtonSize, type ButtonVariant } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PixelPanel } from '@/modules/pixel-ui';

const SIZES: ButtonSize[] = ['default', 'lg', 'sm', 'icon', 'plate'];
const VARIANTS: { variant: ButtonVariant; label: string }[] = [
  { variant: 'default', label: 'Confirm' },
  { variant: 'destructive', label: 'Leave' },
  { variant: 'outline', label: 'Cancel' },
  { variant: 'secondary', label: 'Stay' },
  { variant: 'ghost', label: 'Ghost' },
  { variant: 'link', label: 'Link' },
];

function ButtonMatrix({ disabled = false }: { disabled?: boolean }) {
  return (
    <div className="flex flex-col gap-6 p-4">
      {VARIANTS.map(({ variant, label }) => (
        <section key={variant} className="flex flex-col gap-2">
          <h3 className="font-readable text-xs text-muted-foreground">{variant}</h3>
          <div className="flex flex-wrap items-center gap-4">
            {SIZES.map((size) => (
              <Button key={size} variant={variant} size={size} disabled={disabled} aria-label={size === 'icon' ? `${label} icon` : undefined}>
                {size === 'icon' ? '+' : `${label} ${size}`}
              </Button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function ButtonsDefault() {
  return <ButtonMatrix />;
}

export function ButtonsDisabled() {
  return <ButtonMatrix disabled />;
}

export function ButtonsAsChild() {
  return (
    <div className="flex flex-wrap items-center gap-4 p-4">
      <Button asChild>
        <a href="#open">Open</a>
      </Button>
      <Button asChild variant="destructive" size="sm">
        <a href="#leave">Leave</a>
      </Button>
      <Button asChild variant="link">
        <a href="#more">More</a>
      </Button>
    </div>
  );
}

export function ButtonsOnSpecialFrame() {
  return (
    <PixelPanel variant="special" className="m-4 w-[420px]">
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm">Small</Button>
        <Button>Default</Button>
      </div>
    </PixelPanel>
  );
}

export function ButtonsMobileRow() {
  return (
    <div className="flex w-full items-center gap-2">
      <Button>Confirm</Button>
      <Button variant="secondary">Cancel</Button>
      <Button size="icon" variant="outline" aria-label="More" className="shrink-0">
        +
      </Button>
    </div>
  );
}

export function ButtonTooltip() {
  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-wrap items-center gap-6 p-4 pt-16">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button>Sprite</Button>
          </TooltipTrigger>
          <TooltipContent>End turn</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button asChild variant="outline">
              <a href="#end">Anchor</a>
            </Button>
          </TooltipTrigger>
          <TooltipContent>End turn</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

function FocusRow({ label }: { label: string }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <span className="font-readable text-xs">{label}</span>
      <Button>Sprite</Button>
      <Button size="plate" variant="secondary">
        Plate
      </Button>
      <Button size="sm" variant="ghost">
        Plain
      </Button>
    </div>
  );
}

export function ButtonFocusRing() {
  return (
    <div className="flex flex-col gap-0">
      <p className="p-4 font-readable text-xs text-muted-foreground">Press Tab to move focus through each row.</p>
      <div className="bg-background p-4">
        <FocusRow label="Dark" />
      </div>
      <div className="bg-paper p-4 text-ink">
        <FocusRow label="Paper" />
      </div>
    </div>
  );
}
