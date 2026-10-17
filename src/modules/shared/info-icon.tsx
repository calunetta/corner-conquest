import Image from 'next/image';
import { resolveIcon } from '@/modules/icons';
import { cn } from '@/lib/utils';

export function InfoIcon({ className }: { className?: string }) {
  const { src, transform } = resolveIcon('icon-info');
  return (
    <span className={cn('relative inline-flex items-center justify-center shrink-0', className)}>
      <span className="relative flex h-full w-full items-center justify-center" style={{ transform }}>
        <Image
          src={src}
          alt="Info"
          width={32}
          height={32}
          className="h-full w-full object-contain select-none"
          unoptimized
        />
      </span>
    </span>
  );
}
