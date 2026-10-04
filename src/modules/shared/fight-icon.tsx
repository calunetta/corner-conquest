import Image from 'next/image';
import { cn } from '@/lib/utils';

export function FightIcon({ className }: { className?: string }) {
  return (
    <span className={cn('relative inline-flex items-center justify-center shrink-0', className)}>
      <Image
        src="/sprites/icon_fight.png"
        alt="Fight"
        width={32}
        height={32}
        className="h-full w-full object-contain select-none"
        unoptimized
      />
    </span>
  );
}
