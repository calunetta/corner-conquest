import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        // Inset ring keeps the old 1px border footprint; ring-muted-foreground is the 3:1 boundary.
        className={cn(
          "h-10 flex w-full rounded-none border border-transparent ring-2 ring-inset ring-muted-foreground bg-background px-3 py-2 font-readable text-base shadow-[inset_0_2px_0_hsl(var(--ink))] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground hover:ring-foreground/60 focus-visible:outline-none focus-visible:ring-ring aria-[invalid=true]:ring-destructive disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
