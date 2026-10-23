"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"
import { PixelButton, PixelPanel } from "@/modules/pixel-ui"

/*
 * Shared parts of Dialog, AlertDialog and Sheet. The Radix Content element stays the outermost
 * node and is a transparent shell; the pixel frame and the dark field live inside it.
 */
export type DialogFrameKind = "special" | "paper"

export const MOTION_REDUCE = "motion-reduce:animate-none motion-reduce:duration-0"

// Appended AFTER the caller className so old glass overrides (bg-background/90, blur, border) lose.
export const SHELL_TRANSPARENT =
  "border-0 bg-transparent p-0 shadow-none backdrop-blur-none"

export const DIALOG_SHELL = `fixed left-[50%] top-[50%] z-50 w-[calc(100vw-16px)] max-w-lg max-h-[calc(100dvh-16px)] translate-x-[-50%] translate-y-[-50%] duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] ${MOTION_REDUCE}`

export const OVERLAY_CLASS = `fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 ${MOTION_REDUCE}`

// The dialog close button sits on the shell's top-right corner, outside the centred ribbon band
// (tunable max widths: 264 px on a 374 px shell leaves an 8 px gap). Fixed rem caps, not a
// percentage: a percentage max-width collapses inside shrink-to-fit parents such as the
// CombatDialog header. Sheets keep the close button inside the field, so their ribbon is left
// aligned and leaves 4rem on the right.
export const TITLE_RIBBON = "mx-auto block w-fit max-w-[16.5rem] sm:max-w-sm [&_h2]:text-lg sm:[&_h2]:text-xl"
export const SHEET_TITLE_RIBBON = "mr-auto block max-w-[calc(100%-4rem)]"
export const DESCRIPTION_CLASS = "font-readable text-sm text-muted-foreground"
export const FOOTER_CLASS =
  "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"

// tunable: px-4 py-2 (D2), max-h = 16 px shell margin + 2 x 16 px frame inset.
const FIELD_BASE =
  "grid max-h-[calc(100dvh-3rem)] gap-4 overflow-y-auto px-4 py-2"
const FIELD_SPECIAL = "bg-black/50"
// Paper is cream: ghost/link buttons and muted text default to light colours and would vanish.
const FIELD_PAPER =
  "text-ink [&_.text-muted-foreground]:text-ink/80 [&_button.bg-transparent.text-foreground]:text-ink [&_button.text-accent]:text-ink"

export interface DialogFrameProps {
  frame: DialogFrameKind
  children: React.ReactNode
}

export function DialogFrame({ frame, children }: DialogFrameProps) {
  return (
    <PixelPanel variant={frame} padding="none">
      <div
        className={cn(
          FIELD_BASE,
          frame === "special" ? FIELD_SPECIAL : FIELD_PAPER
        )}
      >
        {children}
      </div>
    </PixelPanel>
  )
}

export function DialogCloseButton({ className }: { className?: string }) {
  return (
    <DialogPrimitive.Close asChild>
      <PixelButton
        size="icon-round"
        className={cn("absolute right-0 top-0", className)}
      >
        <X className="h-5 w-5 text-ink" />
        <span className="sr-only">Close</span>
      </PixelButton>
    </DialogPrimitive.Close>
  )
}
