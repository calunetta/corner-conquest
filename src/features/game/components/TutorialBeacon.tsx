'use client';
import { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { HelpCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TutorialBeaconProps {
  id: string; // unique ID to track if this beacon has been seen
  title: string;
  description: React.ReactNode;
  className?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export function TutorialBeacon({ id, title, description, className, side = 'top' }: TutorialBeaconProps) {
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
          variant="outline" 
          size="icon" 
          className={cn(
            "h-6 w-6 rounded-full border-blue-500/50 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 hover:text-blue-400 relative z-40 flex-shrink-0",
            !hasSeen && "animate-pulse ring-2 ring-blue-500 ring-offset-2 ring-offset-background",
            className
          )}
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side={side} className="w-80 relative z-50">
        <div className="space-y-2 relative">
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute -top-2 -right-2 h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={() => handleOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
          <h4 className="font-semibold leading-none text-blue-400 pr-6">{title}</h4>
          <div className="text-sm text-muted-foreground mt-2">
            {description}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
