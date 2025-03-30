import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { User } from "@/types"

interface UserAvatarProps {
  user: User
  size?: "sm" | "md" | "lg"
  showTooltip?: boolean
  className?: string
}

export function UserAvatar({ user, size = "md", showTooltip = true, className = "" }: UserAvatarProps) {
  // Get photo URL from various possible properties
  const photoURL = user.photoURL || user.photoUrl || user.avatarUrl || user.avatar

  // Determine size classes
  const sizeClasses = {
    sm: "h-6 w-6 text-xs",
    md: "h-8 w-8 text-sm",
    lg: "h-10 w-10 text-base"
  }

  const avatar = (
    <Avatar className={`${sizeClasses[size]} ring-2 ring-background ${className}`}>
      <AvatarImage src={photoURL} alt={user.displayName || "User"} />
      <AvatarFallback className="bg-primary/10 text-primary">
        {user.displayName?.charAt(0) || user.email?.charAt(0) || "?"}
      </AvatarFallback>
    </Avatar>
  )

  if (showTooltip && user.displayName) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {avatar}
          </TooltipTrigger>
          <TooltipContent>
            <p>{user.displayName}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return avatar
}
