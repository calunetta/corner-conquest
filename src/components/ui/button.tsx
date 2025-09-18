
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none relative group font-bold",
  {
    variants: {
      variant: {
        default: "hover:brightness-110",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "hover:brightness-110",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 px-5 py-3",
        sm: "h-10 rounded-md px-4",
        lg: "h-14 rounded-md px-8",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    const isCustom = variant === 'default' || variant === 'outline';

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled}
        {...props}
      >
        {isCustom && (
          <span 
            className={cn(
              'absolute inset-0 z-0 bg-no-repeat bg-[length:100%_100%]',
              {
                'bg-button-primary': variant === 'default',
                'bg-button-secondary': variant === 'outline',
                'group-active:bg-button-primary-pressed': variant === 'default',
              }
            )}
          ></span>
        )}
        <span className={cn(
            "relative z-10 flex items-center justify-center gap-2 pb-[4px]",
            variant === 'default' && 'text-white',
            variant === 'outline' && 'text-black'
        )}>
            {children}
        </span>
        {disabled && (
          <div className="absolute inset-0 z-20 rounded-md bg-black/60"></div>
        )}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
