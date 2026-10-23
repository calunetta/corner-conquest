'use client';

import { useState, type ReactNode } from 'react';
import { Swords } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
/** Open by default so snapshot.mjs captures it; a Reopen button is the way back once closed. */
export function Openable({ children }: { children: (open: boolean, setOpen: (open: boolean) => void) => ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="p-4">
      <Button variant="outline" onClick={() => setOpen(true)}>
        Reopen
      </Button>
      {children(open, setOpen)}
    </div>
  );
}

export const EVENTS = Array.from({ length: 20 }, (_, index) => `Turn ${index + 1}: Player ${(index % 4) + 1} moved 3 units to the north shore.`);

function MoveArmyBody() {
  return (
    <DialogHeader>
      <DialogTitle>Move army</DialogTitle>
      <DialogDescription>Choose how many units to send.</DialogDescription>
    </DialogHeader>
  );
}

export function DialogDefault() {
  return (
    <Openable>
      {(open, setOpen) => (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <MoveArmyBody />
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => setOpen(false)}>Confirm</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Openable>
  );
}

export function DialogLongContent() {
  return (
    <Openable>
      {(open, setOpen) => (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Field guide</DialogTitle>
              <DialogDescription>Rules of the island, scroll to read them all.</DialogDescription>
            </DialogHeader>
            <ul className="space-y-2 font-readable text-sm">
              {EVENTS.map((line) => <li key={line}>{line}</li>)}
            </ul>
            <DialogFooter>
              <Button onClick={() => setOpen(false)}>Got it</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Openable>
  );
}

export function DialogPaperFrame() {
  return (
    <Openable>
      {(open, setOpen) => (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent frame="paper">
            <DialogHeader>
              <DialogTitle ribbon="yellow">Rename island</DialogTitle>
              <DialogDescription>Ghost and link buttons must stay readable on paper.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="ghost">Ghost action</Button>
              <Button variant="link">Link action</Button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => setOpen(false)}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Openable>
  );
}

export function DialogGlassClassName() {
  return (
    <Openable>
      {(open, setOpen) => (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="bg-background/90 backdrop-blur-2xl border border-white/15 max-w-md">
            <MoveArmyBody />
            <DialogFooter>
              <Button onClick={() => setOpen(false)}>Confirm</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Openable>
  );
}

export function DialogHybrid() {
  return (
    <Openable>
      {(open, setOpen) => (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-md border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950">
            <DialogHeader className="rounded bg-gradient-to-r from-red-900/60 to-blue-900/60 p-2">
              <DialogTitle icon={<Swords className="h-5 w-5" />}>Battle at Ironhill</DialogTitle>
              <DialogDescription>Attackers roll first.</DialogDescription>
            </DialogHeader>
            <ul className="space-y-1 text-sm">
              <li className="text-red-400">Attacker lost 2 units</li>
              <li className="text-blue-400">Defender lost 1 unit</li>
              <li className="text-gray-400">Dice: 6, 4, 3 vs 5, 2</li>
              <li className="text-muted-foreground">The island stays contested.</li>
            </ul>
            <DialogFooter>
              <Button size="sm" onClick={() => setOpen(false)}>Roll again</Button>
              <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Openable>
  );
}
