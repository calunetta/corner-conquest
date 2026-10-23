"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => {
  const clampedValue = Math.min(100, Math.max(0, value || 0))
  return (
  <ProgressPrimitive.Root
    ref={ref}
    value={clampedValue}
    className={cn(
      "relative h-4 w-full overflow-hidden rounded-none ring-2 ring-inset ring-border bg-secondary",
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 bg-accent transition-all motion-reduce:transition-none"
      style={{ transform: `translateX(-${100 - clampedValue}%)` }}
    />
  </ProgressPrimitive.Root>
  )
})
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
