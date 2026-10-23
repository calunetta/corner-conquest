"use client"

import * as React from "react"
import * as SheetPrimitive from "@radix-ui/react-dialog"
import { cva, type VariantProps } from "class-variance-authority"
import { PixelPanel, Ribbon, type RibbonColor } from "@/modules/pixel-ui"

import { cn } from "@/lib/utils"
import {
  DESCRIPTION_CLASS,
  DialogCloseButton,
  FOOTER_CLASS,
  MOTION_REDUCE,
  OVERLAY_CLASS,
  SHEET_TITLE_RIBBON,
} from "@/components/ui/dialog-frame"

const Sheet = SheetPrimitive.Root

const SheetTrigger = SheetPrimitive.Trigger

const SheetClose = SheetPrimitive.Close

const SheetPortal = SheetPrimitive.Portal

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(OVERLAY_CLASS, className)}
    {...props}
    ref={ref}
  />
))
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName

const sheetVariants = cva(
  `fixed z-50 flex flex-col overflow-hidden transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500 ${MOTION_REDUCE}`,
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 max-h-[85dvh] data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 max-h-[85dvh] data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right:
          "inset-y-0 right-0 h-full w-3/4 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  }
)

type SheetSide = NonNullable<VariantProps<typeof sheetVariants>["side"]>

// The frame is drawn 64 px (one corner cell) past every viewport-touching edge so only the inner
// edge shows. The field keeps a 16 px margin on that inner edge so the frame band stays visible.
const SHEET_BLEED: Record<SheetSide, { frame: string; field: string }> = {
  right: { frame: "-inset-y-16 -right-16 left-0", field: "ml-4" },
  left: { frame: "-inset-y-16 -left-16 right-0", field: "mr-4" },
  bottom: { frame: "-inset-x-16 -bottom-16 top-0", field: "mt-4" },
  top: { frame: "-inset-x-16 -top-16 bottom-0", field: "mb-4" },
}

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side = "right", className, children, ...props }, ref) => {
  const bleed = SHEET_BLEED[side ?? "right"]
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        ref={ref}
        className={cn(
          sheetVariants({ side }),
          className,
          "bg-transparent p-0 shadow-none"
        )}
        {...props}
      >
        <PixelPanel
          aria-hidden
          variant="special"
          padding="none"
          rootClassName={cn("pointer-events-none absolute", bleed.frame)}
          className="h-full w-full"
        />
        <div
          className={cn(
            "relative flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto bg-black/50 p-4",
            bleed.field
          )}
        >
          {children}
        </div>
        <DialogCloseButton className={side === "right" ? "right-2 top-6" : "right-6 top-6"} />
      </SheetPrimitive.Content>
    </SheetPortal>
  )
})
SheetContent.displayName = SheetPrimitive.Content.displayName

const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
SheetHeader.displayName = "SheetHeader"

const SheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      FOOTER_CLASS,
      className
    )}
    {...props}
  />
)
SheetFooter.displayName = "SheetFooter"

interface SheetTitleProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title> {
  ribbon?: RibbonColor
  icon?: React.ReactNode
}

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  SheetTitleProps
>(({ className, ribbon = "blue", icon, children, ...props }, ref) => (
  <SheetPrimitive.Title ref={ref} asChild {...props}>
    <Ribbon
      as="h2"
      color={ribbon}
      icon={icon}
      className={cn(SHEET_TITLE_RIBBON, className)}
    >
      {children}
    </Ribbon>
  </SheetPrimitive.Title>
))
SheetTitle.displayName = SheetPrimitive.Title.displayName

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn(DESCRIPTION_CLASS, className)}
    {...props}
  />
))
SheetDescription.displayName = SheetPrimitive.Description.displayName

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
