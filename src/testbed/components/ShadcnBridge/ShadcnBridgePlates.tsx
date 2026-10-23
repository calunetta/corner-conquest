import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { PanelVariant } from '@/modules/pixel-ui';

function CardBody({ title }: { title: string }) {
  return (
    <>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Last 20 events.</CardDescription>
      </CardHeader>
      <CardContent>Body text on the card.</CardContent>
    </>
  );
}

export function CardPlate() {
  return (
    <div className="max-w-sm p-4">
      <Card>
        <CardBody title="Event Log" />
      </Card>
    </div>
  );
}

const FRAMES: PanelVariant[] = ['paper', 'wood', 'carved'];

export function CardFrames() {
  return (
    <div className="flex flex-col items-start gap-6 p-4">
      {FRAMES.map((frame) => (
        <Card key={frame} frame={frame} className="w-64 max-w-full">
          <div className="p-2">
            <CardBody title={`Frame ${frame}`} />
          </div>
        </Card>
      ))}
    </div>
  );
}

const BADGE_VARIANTS = ['default', 'secondary', 'destructive', 'outline'] as const;

export function Badges() {
  return (
    <div className="flex flex-col gap-3 p-4">
      {BADGE_VARIANTS.map((variant) => (
        <div key={variant} className="flex flex-wrap items-center gap-2">
          <Badge variant={variant}>Bot</Badge>
          <Badge variant={variant}>
            <span className="font-readable tabular-nums">3</span>
          </Badge>
          <Badge variant={variant}>
            <span className="font-readable tabular-nums">00:12</span>
          </Badge>
          <span className="text-xs text-muted-foreground">{variant}</span>
        </div>
      ))}
    </div>
  );
}

const PROGRESS_VALUES = [0, 50, 100];

function ProgressRows({ className }: { className?: string }) {
  return (
    <div className={`flex flex-col gap-3 p-4 ${className ?? ''}`}>
      {PROGRESS_VALUES.map((value) => (
        <Progress key={value} value={value} aria-label={`Progress ${value}`} />
      ))}
    </div>
  );
}

function PaperBackground({ children }: { children: ReactNode }) {
  return <div className="bg-paper">{children}</div>;
}

export function ProgressOnDark() {
  return <ProgressRows />;
}

export function ProgressOnPaper() {
  return (
    <PaperBackground>
      <ProgressRows />
    </PaperBackground>
  );
}
