'use client';

import { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { InfoIcon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { styles } from './TutorialBeacon.styles';
import type { TutorialBeaconProps } from './TutorialBeacon.types';

export function TutorialBeacon({
  id,
  title,
  description,
  className,
  side = 'top',
}: TutorialBeaconProps) {
  const [hasSeen, setHasSeen] = useState(true); // default true to avoid hydration mismatch
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const seen = localStorage.getItem(`beacon-seen-${id}`);
      if (!seen) {
        setHasSeen(false);
      }
    }
  }, [id]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && !hasSeen) {
      setHasSeen(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem(`beacon-seen-${id}`, 'true');
      }
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          data-testid={`tutorial-beacon-${id}`}
          variant="outline"
          size="icon"
          className={cn(
            styles.triggerButton(),
            !hasSeen && styles.triggerButtonNew,
            className,
          )}
        >
          <InfoIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side={side} className={styles.popoverContent}>
        <div className={styles.popoverInner}>
          <Button
            variant="ghost"
            size="icon"
            className={styles.closeButton}
            onClick={() => handleOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
          <h4 className={styles.title}>{title}</h4>
          <div className={styles.description}>{description}</div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
