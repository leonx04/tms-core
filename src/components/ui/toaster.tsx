"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { CheckCircle, AlertCircle, Info, XCircle } from 'lucide-react'
import { cn } from "@/lib/utils"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        // Determine icon based on variant
        let Icon = Info
        if (variant === "destructive") Icon = XCircle
        else if (variant === "success") Icon = CheckCircle
        else if (variant === "warning") Icon = AlertCircle

        return (
          <Toast key={id} variant={variant} {...props} className={cn("animate-bounce-in", props.className)}>
            <div className="flex gap-3 items-start">
              <div className="pt-0.5 shrink-0">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription className="break-words">{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose className="rounded-full absolute duration-200 hover:bg-muted/30 right-2 top-2 transition-colors">
              <span className="sr-only">Close</span>
              <XCircle className="h-4 w-4" />
            </ToastClose>
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
