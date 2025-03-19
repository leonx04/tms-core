import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { User } from "@/types"
import { UserAvatar } from "./user-avatar"

interface AssigneeGroupProps {
  users: User[]
  maxVisible?: number
  size?: "sm" | "md" | "lg"
}

export function AssigneeGroup({ users, maxVisible = 3, size = "md" }: AssigneeGroupProps) {
  if (!users || users.length === 0) {
    return <span className="text-sm text-muted-foreground">Unassigned</span>
  }

  // If we have fewer users than the max, just show them all
  if (users.length <= maxVisible) {
    return (
      <div className="flex -space-x-2">
        {users.map((user) => (
          <UserAvatar key={user.id} user={user} size={size} />
        ))}
      </div>
    )
  }

  // Otherwise, show some users and a count for the rest
  const visibleUsers = users.slice(0, maxVisible)
  const remainingCount = users.length - maxVisible

  return (
    <Popover>
      <div className="flex items-center">
        <div className="flex -space-x-2">
          {visibleUsers.map((user) => (
            <UserAvatar key={user.id} user={user} size={size} />
          ))}
        </div>
        
        <PopoverTrigger asChild>
          <div 
            className={`
              ${size === "sm" ? "h-6 w-6 text-xs" : size === "md" ? "h-8 w-8 text-sm" : "h-10 w-10 text-base"}
              rounded-full bg-muted text-muted-foreground flex items-center justify-center font-medium 
              ring-2 ring-background -ml-2 cursor-pointer hover:bg-muted/80
            `}
          >
            +{remainingCount}
          </div>
        </PopoverTrigger>
      </div>
      
      <PopoverContent className="w-60 p-2">
        <div className="space-y-2">
          <h4 className="font-medium text-sm">All Assignees</h4>
          <div className="space-y-1">
            {users.map((user) => (
              <div key={user.id} className="flex items-center gap-2 p-1">
                <UserAvatar user={user} size="sm" showTooltip={false} />
                <span className="text-sm">{user.displayName || "Unknown"}</span>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
