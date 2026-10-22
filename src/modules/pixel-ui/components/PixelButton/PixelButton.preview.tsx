import type { ComponentPreview } from '@/testbed';
import { PixelButton } from './PixelButton';
import type { PixelButtonSize, PixelButtonVariant } from './PixelButton.types';

const VARIANTS: PixelButtonVariant[] = ['primary', 'danger'];
const SIZES: PixelButtonSize[] = ['default', 'large', 'icon-round', 'icon-square'];

function labelFor(size: PixelButtonSize): string {
  return size.startsWith('icon') ? '' : 'Move';
}

function ButtonCell({ variant, size, disabled, loading }: {
  variant: PixelButtonVariant;
  size: PixelButtonSize;
  disabled?: boolean;
  loading?: boolean;
}) {
  const label = labelFor(size);
  return (
    <div className="flex flex-col items-start gap-1">
      <PixelButton
        variant={variant}
        size={size}
        disabled={disabled}
        loading={loading}
        aria-label={label ? undefined : `${variant} ${size}`}
      >
        {label}
      </PixelButton>
      <span className="text-xs text-muted-foreground">{variant} / {size}</span>
    </div>
  );
}

function Matrix({ disabled, loading }: { disabled?: boolean; loading?: boolean }) {
  return (
    <div className="flex flex-wrap items-end gap-6">
      {VARIANTS.flatMap((variant) =>
        SIZES.map((size) => (
          <ButtonCell key={`${variant}-${size}`} variant={variant} size={size} disabled={disabled} loading={loading} />
        )),
      )}
    </div>
  );
}

function SizeRow({ size }: { size: PixelButtonSize }) {
  return (
    <div className="flex flex-wrap items-end gap-6">
      {VARIANTS.map((variant) => (
        <ButtonCell key={variant} variant={variant} size={size} />
      ))}
    </div>
  );
}

function MobileRow() {
  return (
    <div className="w-full space-y-2">
      <div className="flex w-full items-center gap-2">
        <PixelButton>Move</PixelButton>
        <PixelButton size="icon-round" variant="danger" aria-label="Attack" />
        <PixelButton size="icon-round" aria-label="Cards" />
      </div>
      <p className="text-xs text-muted-foreground">
        Default buttons have a 128 px floor (two 64 px caps), so three text buttons do not fit 390 px. The
        Phase 5 HUD uses icon buttons and the small ribbon sheets.
      </p>
    </div>
  );
}

export const pixelButtonPreview: ComponentPreview = {
  slug: 'pixel-ui-button',
  title: 'Pixel button',
  group: 'Pixel UI',
  states: [
    { name: 'All variants and sizes', render: () => <Matrix /> },
    { name: 'Default size', render: () => <SizeRow size="default" /> },
    { name: 'Large size', render: () => <SizeRow size="large" /> },
    { name: 'Icon round', render: () => <SizeRow size="icon-round" /> },
    { name: 'Icon square', render: () => <SizeRow size="icon-square" /> },
    { name: 'Disabled', render: () => <Matrix disabled /> },
    { name: 'Loading', render: () => <Matrix loading /> },
    { name: 'Mobile width 390', render: () => <MobileRow /> },
  ],
};
