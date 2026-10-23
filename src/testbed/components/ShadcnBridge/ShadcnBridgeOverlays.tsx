'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

import { EVENTS, Openable } from './ShadcnBridgeDialogs';

export function AlertDialogLeave() {
  return (
    <Openable>
      {(open, setOpen) => (
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Leave match?</AlertDialogTitle>
              <AlertDialogDescription>Your army stays on the map.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Stay</AlertDialogCancel>
              <AlertDialogAction variant="destructive">Leave</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Openable>
  );
}

export function SheetState({ side }: { side: 'right' | 'left' | 'bottom' }) {
  return (
    <Openable>
      {(open, setOpen) => (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side={side}>
            <SheetHeader>
              <SheetTitle>Event Log</SheetTitle>
              <SheetDescription>Last 20 events.</SheetDescription>
            </SheetHeader>
            <ul className="space-y-2 font-readable text-sm">
              {EVENTS.map((line) => <li key={line}>{line}</li>)}
            </ul>
          </SheetContent>
        </Sheet>
      )}
    </Openable>
  );
}
