import * as React from "react"

import { cn } from "@/lib/utils"
import { PixelPanel, type PanelVariant } from "@/modules/pixel-ui"

// Light frames draw ink text, which text-muted-foreground (a light tone) cannot be read on.
// Ink at 90% keeps 5.25:1 or more on banner, paper and carved fills.
const LIGHT_FRAMES: readonly PanelVariant[] = ["banner", "paper", "carved"]
const LIGHT_FRAME_DESCRIPTION = "[&_[data-card-description]]:text-ink/90"

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Draws a sprite frame instead of the flat plate. PixelPanel takes no ref. */
  frame?: PanelVariant
}

// The 2px outline is an inset ring, not a border: the old Card had a 1px border, and a real
// 2px border would grow content-sized cards. The 1px transparent border keeps the old footprint.
const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, frame, ...props }, ref) => {
    if (frame) {
      return (
        <PixelPanel
          variant={frame}
          padding="none"
          className={cn(
            LIGHT_FRAMES.includes(frame) && LIGHT_FRAME_DESCRIPTION,
            className
          )}
          {...props}
        />
      )
    }
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-none border border-transparent ring-2 ring-inset ring-border bg-card text-card-foreground shadow-[0_2px_0_hsl(var(--ink))]",
          className
        )}
        {...props}
      />
    )
  }
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "font-pixel text-2xl font-semibold leading-none",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    data-card-description=""
    className={cn("font-readable text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
