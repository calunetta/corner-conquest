"use client"

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export function Toaster() {
  const { toasts } = useToast()

  const infoToasts = toasts.filter((toast) => toast.variant !== 'destructive');
  const errorToasts = toasts.filter((toast) => toast.variant === 'destructive');

  return (
    <ToastProvider>
      {infoToasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      {errorToasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport className="bottom-0 right-0" />
      <ToastViewport className="top-0 flex-col gap-2 items-center" />
    </ToastProvider>
  )
}
