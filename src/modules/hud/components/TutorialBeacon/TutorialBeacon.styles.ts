import { cn } from '@/lib/utils';

export const styles = {
  triggerButton: (className?: string) =>
    cn(
      'h-6 w-6 rounded-full border-blue-500/50 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 hover:text-blue-400 relative z-40 flex-shrink-0 p-0.5',
      className,
    ),
  triggerButtonNew: cn(
    'animate-pulse ring-2 ring-blue-500 ring-offset-2 ring-offset-background',
  ),
  popoverContent: 'w-80 relative z-50',
  popoverInner: 'space-y-2 relative',
  closeButton: 'absolute -top-2 -right-2 h-6 w-6 text-muted-foreground hover:text-foreground',
  title: 'font-semibold leading-none text-blue-400 pr-6',
  description: 'text-sm text-muted-foreground mt-2',
};
