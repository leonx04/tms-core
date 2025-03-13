"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"

type Notification = {
  id: string
  userId: string
  eventType: string
  referenceId: string
  message: string
  status: "read" | "unread"
  createdAt: string
  data?: any
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const fetchNotifications = async () => {
    if (!user) {
      setNotifications([])
      setUnreadCount(0)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const idToken = await user.getIdToken()

      const response = await fetch("/notifications", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      }).catch((err) => {
        throw new Error("Network error: " + err.message)
      })

      if (!response.ok) {
        throw new Error("Failed to fetch notifications")
      }

      const data = await response.json()
      setNotifications(data.notifications || [])

      const unread = data.notifications.filter((notification: Notification) => notification.status === "unread").length
      setUnreadCount(unread)
    } catch (err: any) {
      console.error("Error fetching notifications:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    if (!user) return

    try {
      const idToken = await user.getIdToken()

      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          notificationId,
          status: "read",
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to mark notification as read")
      }

      // Update local state
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId ? { ...notification, status: "read" } : notification,
        ),
      )

      // Update unread count
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (err: any) {
      console.error("Error marking notification as read:", err)
      setError(err.message)
    }
  }

  const markAllAsRead = async () => {
    if (!user || notifications.length === 0) return

    try {
      const idToken = await user.getIdToken()

      // Get all unread notification IDs
      const unreadIds = notifications
        .filter((notification) => notification.status === "unread")
        .map((notification) => notification.id)

      // Mark each notification as read
      for (const id of unreadIds) {
        await fetch("/api/notifications", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            notificationId: id,
            status: "read",
          }),
        })
      }

      // Update local state
      setNotifications((prev) => prev.map((notification) => ({ ...notification, status: "read" })))

      // Reset unread count
      setUnreadCount(0)
    } catch (err: any) {
      console.error("Error marking all notifications as read:", err)
      setError(err.message)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    if (!user) return

    try {
      const idToken = await user.getIdToken()

      const response = await fetch(`/api/notifications?id=${notificationId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to delete notification")
      }

      // Update local state
      const deletedNotification = notifications.find((n) => n.id === notificationId)
      setNotifications((prev) => prev.filter((notification) => notification.id !== notificationId))

      // Update unread count if the deleted notification was unread
      if (deletedNotification && deletedNotification.status === "unread") {
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch (err: any) {
      console.error("Error deleting notification:", err)
      setError(err.message)
    }
  }

  // Fetch notifications on mount and when user changes
  useEffect(() => {
    fetchNotifications()

    // Set up polling for new notifications (every 30 seconds)
    const intervalId = setInterval(fetchNotifications, 30000)

    return () => clearInterval(intervalId)
  }, [user])

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  }
}

