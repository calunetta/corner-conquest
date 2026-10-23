import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Flat chip. The outline is an inset ring because the old badge had a 1px border and is
// content-sized; no hover shifts since Badge is a non-interactive div.
const badgeVariants = cva(
  "inline-flex items-center rounded-none border border-transparent ring-2 ring-inset px-2.5 py-0.5 font-pixel text-xs shadow-[0_1px_0_hsl(var(--ink))] transition-colors focus:outline-none focus:ring-ring",
  {
    variants: {
      variant: {
        default:
          "ring-ink bg-primary text-primary-foreground",
        secondary:
          "ring-muted-foreground bg-secondary text-secondary-foreground",
        destructive:
          // Darker than --destructive (3.70:1 with the light text at text-xs): 5.0:1 here.
          "ring-ink bg-[hsl(5_70%_45%)] text-destructive-foreground",
        outline: "ring-border bg-background/60 text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
