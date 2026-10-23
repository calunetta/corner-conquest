'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function TooltipOpen() {
  const [open, setOpen] = useState(true);
  return (
    <TooltipProvider>
      <div className="flex flex-col items-start gap-4 p-4 pt-16">
        <Tooltip open={open} onOpenChange={setOpen}>
          <TooltipTrigger asChild>
            <Button size="sm">Hover or focus me</Button>
          </TooltipTrigger>
          <TooltipContent>Collect 3 gold from this mine</TooltipContent>
        </Tooltip>
        {!open && (
          <Button size="sm" onClick={() => setOpen(true)}>
            Reopen tooltip
          </Button>
        )}
      </div>
    </TooltipProvider>
  );
}

export function PopoverOpen() {
  const [open, setOpen] = useState(true);
  return (
    <div className="flex flex-col items-start gap-4 p-4">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button size="sm">Toggle popover</Button>
        </PopoverTrigger>
        <PopoverContent className="max-w-[calc(100vw-2rem)]">
          <p className="font-pixel text-sm">Tip</p>
          <p>Tiles next to your castle are revealed at the start of every turn.</p>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function TabsStates() {
  return (
    <div className="max-w-sm p-4">
      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="players">Players</TabsTrigger>
          <TabsTrigger value="off" disabled>
            Locked
          </TabsTrigger>
        </TabsList>
        <TabsContent value="rules">Rules panel content.</TabsContent>
        <TabsContent value="players">Players panel content.</TabsContent>
      </Tabs>
    </div>
  );
}

type ToastVariant = 'default' | 'destructive';

function StaticToast({
  variant,
  title,
  description,
}: {
  variant: ToastVariant;
  title: string;
  description: string;
}) {
  const [open, setOpen] = useState(true);
  return (
    <ToastProvider duration={Infinity}>
      <div className="flex max-w-md flex-col items-start gap-4 p-4">
        <Toast variant={variant} open={open} onOpenChange={setOpen}>
          <div className="grid gap-1">
            <ToastTitle>{title}</ToastTitle>
            <ToastDescription>{description}</ToastDescription>
          </div>
          <ToastClose />
        </Toast>
        {!open && (
          <Button size="sm" onClick={() => setOpen(true)}>
            Reopen toast
          </Button>
        )}
      </div>
      <ToastViewport className="static max-w-md p-4 pt-0" />
    </ToastProvider>
  );
}

const LONG_TEXT =
  'The connection to the match was lost while your army was crossing the northern bridge, so the last three orders could not be confirmed. Check the event log and resend them if needed.';

export const ToastDefault = () => (
  <StaticToast variant="default" title="Turn saved" description="Your orders were sent." />
);
export const ToastDestructive = () => (
  <StaticToast variant="destructive" title="Move failed" description="Not enough gold." />
);
export const ToastLongText = () => (
  <StaticToast variant="destructive" title="Orders not confirmed" description={LONG_TEXT} />
);
