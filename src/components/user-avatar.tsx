import { User } from "@/types"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface UserAvatarProps {
  user: User
  size?: "sm" | "md" | "lg"
  showTooltip?: boolean
}

export function UserAvatar({ user, size = "md", showTooltip = true }: UserAvatarProps) {
  const getInitials = (name: string) => {
    if (!name) return "?"
    const parts = name.split(" ")
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
  }

  const sizeClasses = {
    sm: "h-6 w-6 text-xs",
    md: "h-8 w-8 text-sm",
    lg: "h-10 w-10 text-base"
  }

  const avatar = (
    <div
      className={`${sizeClasses[size]} rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium ring-2 ring-background`}
    >
      {getInitials(user.displayName || "")}
    </div>
  )

  if (!showTooltip) return avatar

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {avatar}
        </TooltipTrigger>
        <TooltipContent>
          <p>{user.displayName || "Unknown user"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
