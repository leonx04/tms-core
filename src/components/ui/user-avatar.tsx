import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { User } from "@/types"

interface UserAvatarProps {
    user: User
    size?: "sm" | "md" | "lg"
    showTooltip?: boolean
}

export function UserAvatar({ user, size = "md", showTooltip = true }: UserAvatarProps) {
    const displayName = user.displayName || user.email || "Unknown User"
    const initial = displayName.charAt(0).toUpperCase()

    const avatarSizeClasses = {
        sm: "h-6 w-6 text-xs",
        md: "h-8 w-8 text-sm",
        lg: "h-10 w-10 text-base"
    }

    const avatar = (
        <div
            className={`${avatarSizeClasses[size]} bg-primary text-primary-foreground rounded-full flex items-center justify-center font-medium ring-2 ring-background`}
        >
            {initial}
        </div>
    )

    if (!showTooltip) {
        return avatar
    }

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    {avatar}
                </TooltipTrigger>
                <TooltipContent>
                    <p>{displayName}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}
