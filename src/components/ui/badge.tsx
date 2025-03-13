import type React from "react"
import { cn } from "@/lib/utils"

interface BadgeProps {
  children: React.ReactNode
  variant?: "default" | "primary" | "secondary" | "success" | "warning" | "danger" | "info" | "outline"
  className?: string
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        variant === "default" && "bg-secondary text-secondary-foreground",
        variant === "primary" && "bg-primary/10 text-primary",
        variant === "secondary" && "bg-secondary text-secondary-foreground",
        variant === "success" && "bg-success/10 text-success",
        variant === "warning" && "bg-warning/10 text-warning",
        variant === "danger" && "bg-destructive/10 text-destructive",
        variant === "info" && "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
        variant === "outline" && "border border-border bg-transparent",
        className,
      )}
    >
      {children}
    </span>
  )
}

