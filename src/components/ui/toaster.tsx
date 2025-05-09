"use client"

import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/utils/utils"
import { AlertCircle, CheckCircle, Info, XCircle } from "lucide-react"
import { useEffect, useRef } from "react"

export function Toaster() {
  const { toasts, dismiss } = useToast()
  const toastTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // Set up auto-dismiss for each toast
  useEffect(() => {
    // Clear any existing timeouts when toasts change
    const currentTimeouts = toastTimeoutsRef.current

    // Set up new timeouts for each toast
    toasts.forEach((toast) => {
      // Skip if this toast already has a timeout
      if (currentTimeouts.has(toast.id)) return

      // Create a new timeout for this toast
      const timeout = setTimeout(() => {
        dismiss(toast.id)
      }, 5000) // 5 seconds

      // Store the timeout reference
      currentTimeouts.set(toast.id, timeout)
    })

    // Cleanup function to clear timeouts when component unmounts or toasts change
    return () => {
      currentTimeouts.forEach((timeout, id) => {
        clearTimeout(timeout)
      })
    }
  }, [toasts, dismiss])

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, variant, ...props }) => {
        // Determine icon based on variant
        let Icon = Info
        if (variant === "destructive") Icon = XCircle
        else if (variant === "success") Icon = CheckCircle
        else if (variant === "warning") Icon = AlertCircle

        return (
          <Toast key={id} variant={variant} {...props} className={cn("animate-toast-slide-in", props.className)}>
            <div className="flex gap-3 items-start">
              <div className="pt-0.5 shrink-0">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && <ToastDescription className="break-words">{description}</ToastDescription>}
              </div>
            </div>
            {action}
            <ToastClose
              onClick={() => {
                // Clear the timeout when manually closed
                const timeout = toastTimeoutsRef.current.get(id)
                if (timeout) {
                  clearTimeout(timeout)
                  toastTimeoutsRef.current.delete(id)
                }
              }}
              className="rounded-full absolute duration-200 hover:bg-muted/30 right-2 top-2 transition-colors"
            >
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

