import { cn } from "@/utils/utils";

export function LoadingSpinner({
  className,
  size = "default",
}: { className?: string; size?: "sm" | "default" | "lg" }) {
  const sizeClasses = {
    sm: "h-8 w-8",
    default: "h-12 w-12",
    lg: "h-16 w-16",
  }

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className="relative">
        <div className={cn("rounded-full border-2 border-primary/10", sizeClasses[size])}></div>
        <div
          className={cn(
            "absolute left-0 top-0 animate-spin rounded-full border-2 border-transparent border-t-primary",
            sizeClasses[size],
          )}
        ></div>
      </div>
    </div>
  )
}

