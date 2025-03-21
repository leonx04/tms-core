import type * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        // Add new variants for status, priority, type, and role badges
        status: "badge",
        priority: "badge",
        type: "badge",
        role: "badge",
      },
      animation: {
        none: "",
        pulse: "badge-animation-pulse",
        fade: "badge-animation-fade",
        slide: "badge-animation-slide",
      }
    },
    defaultVariants: {
      variant: "default",
      animation: "none",
    },
  },
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
  withDot?: boolean;
  dotColor?: string;
}

function Badge({ className, variant, animation, withDot, dotColor, ...props }: BadgeProps) {
  return (
    <div 
      className={cn(badgeVariants({ variant, animation }), className)} 
      data-dot-color={dotColor}
      {...props} 
    />
  )
}

export { Badge, badgeVariants }