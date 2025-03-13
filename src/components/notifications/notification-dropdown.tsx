"use client"

import { useState, useEffect, useRef } from "react"
import { Bell, Check, CheckCheck, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useNotifications } from "@/hooks/use-notifications"
import { formatDistanceToNow } from "date-fns"

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification } = useNotifications()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const handleNotificationClick = (notificationId: string) => {
    markAsRead(notificationId)
  }

  const getNotificationIcon = (eventType: string) => {
    switch (eventType) {
      case "CREATE_TASK":
        return (
          <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-200 flex items-center justify-center">
            T
          </div>
        )
      case "UPDATE_TASK":
        return (
          <div className="h-8 w-8 rounded-full bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-200 flex items-center justify-center">
            U
          </div>
        )
      case "ADD_COMMENT":
        return (
          <div className="h-8 w-8 rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-200 flex items-center justify-center">
            C
          </div>
        )
      case "INVITE_MEMBER":
        return (
          <div className="h-8 w-8 rounded-full bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-200 flex items-center justify-center">
            I
          </div>
        )
      case "WEBHOOK_EVENT":
        return (
          <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-200 flex items-center justify-center">
            W
          </div>
        )
      case "CLOUDINARY_EVENT":
        return (
          <div className="h-8 w-8 rounded-full bg-cyan-100 text-cyan-600 dark:bg-cyan-900 dark:text-cyan-200 flex items-center justify-center">
            C
          </div>
        )
      default:
        return (
          <div className="h-8 w-8 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-200 flex items-center justify-center">
            N
          </div>
        )
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button variant="ghost" size="icon" className="rounded-full relative" onClick={() => setIsOpen(!isOpen)}>
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-primary text-primary-foreground">
            {unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-card rounded-lg shadow-modern border border-border/5 overflow-hidden animate-fadeIn z-50">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <h3 className="font-medium">Notifications</h3>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={markAllAsRead}>
                <CheckCheck className="h-3.5 w-3.5 mr-1" /> Mark all as read
              </Button>
            )}
          </div>

          <div className="max-h-[70vh] overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-muted-foreground">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary mx-auto mb-2"></div>
                <p>Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Bell className="h-10 w-10 mx-auto mb-2 opacity-20" />
                <p>No notifications yet</p>
              </div>
            ) : (
              <div>
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 border-b border-border hover:bg-muted/30 transition-colors flex items-start ${
                      notification.status === "unread" ? "bg-muted/20" : ""
                    }`}
                  >
                    <div className="mr-3 mt-1">{getNotificationIcon(notification.eventType)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm mb-1 break-words">{notification.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex flex-col space-y-1 ml-2">
                      {notification.status === "unread" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation()
                            markAsRead(notification.id)
                          }}
                          title="Mark as read"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteNotification(notification.id)
                        }}
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

