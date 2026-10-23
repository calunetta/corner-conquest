import type { ComponentPreview } from '@/testbed';
import { PixelPanel } from '../PixelPanel/PixelPanel';
import type { PanelVariant } from '../PixelPanel/PixelPanel.types';

type SurfaceKind = 'paper' | 'card' | PanelVariant;

const LOG_LINES = ['Mia moved to (3,2) 1l0O', 'Kai found a card (gold: 12)'];
const CARD_BODY = ['Draw two cards, then pay 1 gold (3,2). Illinois 1l0O.'];
const SIZES = [12, 14, 16];
const FAMILIES = [
  { label: 'Patrick Hand + Lato (font-readable, font-body)', className: 'font-readable' },
  { label: 'MedievalSharp (font-pixel, font-headline, font-medieval)', className: 'font-medieval' },
];
const SURFACES: { label: string; kind: SurfaceKind }[] = [
  { label: 'Paper (bg-paper text-ink)', kind: 'paper' },
  { label: 'Banner panel', kind: 'banner' },
  { label: 'Carved panel', kind: 'carved' },
  { label: 'Dark card (bg-card)', kind: 'card' },
];

function Sample({ lines }: { lines: string[] }) {
  return (
    <div className="space-y-3">
      {FAMILIES.map((family) => (
        <div key={family.className} className="space-y-1">
          <p className="font-sans text-xs opacity-70">{family.label}</p>
          {SIZES.map((size) => (
            <div key={size} className={`${family.className} leading-snug`} style={{ fontSize: size }}>
              {lines.map((line) => (
                <p key={line}>{size}px: {line}</p>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function Surface({ kind, lines }: { kind: SurfaceKind; lines: string[] }) {
  if (kind === 'paper') {
    return <div className="bg-paper p-4 text-ink"><Sample lines={lines} /></div>;
  }
  if (kind === 'card') {
    return <div className="bg-card p-4 text-card-foreground"><Sample lines={lines} /></div>;
  }
  return (
    <PixelPanel variant={kind}>
      <Sample lines={lines} />
    </PixelPanel>
  );
}

function Section({ lines }: { lines: string[] }) {
  return (
    <div className="space-y-6">
      <p className="max-w-prose text-sm text-muted-foreground">
        Rule: text read at length (logs, card body, descriptions, inputs, digits) uses font-readable;
        institutional text (game name, titles, ribbons, buttons) uses font-pixel. Check l/I/1, 0/O and
        parentheses at 12 px in the 390 px screenshot.
      </p>
      {SURFACES.map((surface) => (
        <div key={surface.label} className="space-y-1">
          <p className="text-xs text-muted-foreground">{surface.label}</p>
          <Surface kind={surface.kind} lines={lines} />
        </div>
      ))}
    </div>
  );
}

export const pixelTypographyPreview: ComponentPreview = {
  slug: 'pixel-ui-typography',
  title: 'Pixel typography',
  group: 'Pixel UI',
  states: [
    { name: 'Event log lines', render: () => <Section lines={LOG_LINES} /> },
    { name: 'Card body', render: () => <Section lines={CARD_BODY} /> },
  ],
};
