import Image from 'next/image';
import { getLucideGlyph, resolveIcon } from '@/modules/icons';
import type { IconDefaultSource } from '@/modules/icons';
import { cn } from '@/lib/utils';

export interface RegistryIconProps {
  /** icon-registry.config.json id, e.g. "skull" or "icon-fight". */
  id: string;
  className?: string;
  /** Accessible text for image icons. Omitted means a decorative image (alt=""). */
  alt?: string;
}

/** Renders any registry icon (image or lucide) with its resolved override and transform. */
export function RegistryIcon({ id, className, alt = '' }: RegistryIconProps) {
  const { source, transform } = resolveIcon(id);
  return (
    <span className={cn('relative inline-flex items-center justify-center shrink-0', className)}>
      <span className="relative flex h-full w-full items-center justify-center" style={{ transform }}>
        <RegistryIconGlyph source={source} alt={alt} />
      </span>
    </span>
  );
}

function RegistryIconGlyph({ source, alt }: { source: IconDefaultSource; alt: string }) {
  if (source.kind === 'image') {
    return (
      <Image
        src={source.src}
        alt={alt}
        width={32}
        height={32}
        className="h-full w-full object-contain select-none"
        unoptimized
      />
    );
  }

  const Glyph = getLucideGlyph(source.name);
  if (!Glyph) return null;
  return <Glyph className="h-full w-full" />;
}
