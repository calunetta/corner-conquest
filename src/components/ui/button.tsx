import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { PixelButton, type PixelButtonVariant } from "@/modules/pixel-ui"

/*
 * Three tiers:
 * - sprite: size default/lg on default, destructive, outline, secondary. Renders PixelButton art.
 *   SPRITE_LOCK makes className colour, border, radius, shadow and height ignored (layout classes
 *   such as w-full, flex-*, margins still apply). `lg` does not forward size="large" to PixelButton:
 *   its 192 px minimum width comes from SPRITE_WIDTH, the art stays the 'default' size.
 * - plate: sm, icon, plate, and ghost/link. A flat bordered plain button, the old default dimensions.
 * - plain: asChild is always plate/plain (PixelButton has no Slot support), sprite sizes collapse to plate.
 */
export type ButtonVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost"
  | "link"
export type ButtonSize = "default" | "lg" | "sm" | "icon" | "plate"

// The 2px outline is an inset ring (a box-shadow), not a border, so plate buttons keep the old
// default/sm/icon sizes: a real border would grow content-sized and h-auto HUD buttons.
// `outline` keeps a 1px transparent border because the old outline variant had a 1px border.
const PRESSABLE_SHADOW =
  "shadow-[0_2px_0_hsl(var(--ink))] active:translate-y-[1px] active:shadow-[0_1px_0_hsl(var(--ink))]"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-none font-pixel text-sm font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: `ring-2 ring-inset ring-ink bg-primary text-primary-foreground hover:bg-primary/90 ${PRESSABLE_SHADOW}`,
        destructive: `ring-2 ring-inset ring-ink bg-destructive text-destructive-foreground hover:bg-destructive/90 ${PRESSABLE_SHADOW}`,
        outline: `border border-transparent ring-2 ring-inset ring-muted-foreground bg-card text-foreground hover:bg-accent hover:text-accent-foreground ${PRESSABLE_SHADOW}`,
        secondary: `ring-2 ring-inset ring-muted-foreground bg-secondary text-secondary-foreground hover:bg-secondary/80 ${PRESSABLE_SHADOW}`,
        ghost:
          "bg-transparent text-foreground hover:bg-accent/20 active:translate-y-[1px]",
        link: "text-accent underline underline-offset-4 hover:text-foreground active:translate-y-[1px]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3 text-sm",
        lg: "h-10 px-8",
        icon: "h-10 w-10",
        plate: "h-10 px-4 py-2",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const SPRITE_VARIANT: Partial<Record<ButtonVariant, PixelButtonVariant>> = {
  default: "primary",
  destructive: "danger",
  outline: "neutral",
  secondary: "neutral",
}

const SPRITE_LOCK =
  "!h-16 !rounded-none !border-0 !bg-transparent !bg-none !shadow-none"
const SPRITE_WIDTH: Record<"default" | "lg", string> = {
  default: "!min-w-[128px]",
  lg: "!min-w-[192px] px-8",
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "default", size = "default", asChild = false, ...props },
    ref
  ) => {
    const spriteVariant = SPRITE_VARIANT[variant]
    const isSpriteSize = size === "default" || size === "lg"

    if (!asChild && isSpriteSize && spriteVariant !== undefined) {
      return (
        <PixelButton
          ref={ref}
          variant={spriteVariant}
          className={cn(SPRITE_WIDTH[size], className, SPRITE_LOCK)}
          {...props}
        />
      )
    }

    const Comp = asChild ? Slot : "button"
    const plainSize = asChild && isSpriteSize ? "plate" : size
    return (
      <Comp
        className={cn(buttonVariants({ variant, size: plainSize, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
