import { emailTemplates, sendEmail } from "@/config/email"
import { database } from "@/config/firebase"
import { getAuth } from "firebase-admin/auth"
import { equalTo, get, orderByChild, query, ref, remove, set, update } from "firebase/database"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split(" ")[1]
    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid

    // Get notifications for this user
    const notificationsRef = ref(database, "notifications")
    const notificationsQuery = query(notificationsRef, orderByChild("userId"), equalTo(userId))
    const notificationsSnapshot = await get(notificationsQuery)

    if (!notificationsSnapshot.exists()) {
      return NextResponse.json({ notifications: [] })
    }

    const notifications = notificationsSnapshot.val()
    const notificationsList = Object.entries(notifications).map(([id, data]: [string, any]) => ({
      id,
      ...data,
    }))

    // Sort notifications by createdAt (newest first)
    notificationsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({ notifications: notificationsList })
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return NextResponse.json({ error: "Internal server error1" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // This endpoint is for creating notifications
    // It should be called from server-side code, not directly from the client

    const { userId, eventType, referenceId, message, data } = await request.json()

    if (!userId || !eventType || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Create a new notification
    const notificationRef = ref(database, `notifications/${Date.now()}_${userId}`)

    await set(notificationRef, {
      userId,
      eventType,
      referenceId,
      message,
      status: "unread",
      createdAt: new Date().toISOString(),
      data: data || null,
    })

    // Get user data to check notification preferences
    const userRef = ref(database, `users/${userId}`)
    const userSnapshot = await get(userRef)

    if (userSnapshot.exists()) {
      const userData = userSnapshot.val()

      // Send email notification if user has email notifications enabled
      if (userData.preferences?.emailNotifications) {
        // Determine which email template to use based on event type
        let emailSubject = ""
        let emailHtml = ""

        switch (eventType) {
          case "CREATE_TASK":
            if (data?.taskTitle && data?.projectName && data?.assignerName && data?.taskLink) {
              emailSubject = `New Task Assignment - ${data.taskTitle}`
              emailHtml = emailTemplates.taskAssignment(
                data.taskTitle,
                data.projectName,
                data.assignerName,
                data.taskLink,
                userData.displayName,
              )
            }
            break
          case "UPDATE_TASK":
            if (data?.taskTitle && data?.projectName && data?.updaterName && data?.updateType && data?.taskLink) {
              emailSubject = `Task Update - ${data.taskTitle}`
              emailHtml = emailTemplates.taskUpdate(
                data.taskTitle,
                data.projectName,
                data.updaterName,
                data.updateType,
                data.taskLink,
                userData.displayName,
              )
            }
            break
          case "INVITE_MEMBER":
            if (data?.projectName && data?.inviterName && data?.inviteLink) {
              emailSubject = `You've Been Invited to ${data.projectName}`
              emailHtml = emailTemplates.projectInvitation(
                data.projectName,
                data.inviterName,
                data.inviteLink,
                userData.displayName,
              )
            }
            break
          // Add more event types as needed
        }

        if (emailSubject && emailHtml && userData.email) {
          await sendEmail(userData.email, emailSubject, emailHtml)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error creating notification:", error)
    return NextResponse.json({ error: "Internal server error2" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split(" ")[1]
    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid

    const { notificationId, status } = await request.json()

    if (!notificationId || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get the notification to verify ownership
    const notificationRef = ref(database, `notifications/${notificationId}`)
    const notificationSnapshot = await get(notificationRef)

    if (!notificationSnapshot.exists()) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 })
    }

    const notification = notificationSnapshot.val()

    // Verify that the notification belongs to the user
    if (notification.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Update the notification status
    await update(notificationRef, { status })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating notification:", error)
    return NextResponse.json({ error: "Internal server error3" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split(" ")[1]
    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid

    const url = new URL(request.url)
    const notificationId = url.searchParams.get("id")

    if (!notificationId) {
      return NextResponse.json({ error: "Notification ID is required" }, { status: 400 })
    }

    // Get the notification to verify ownership
    const notificationRef = ref(database, `notifications/${notificationId}`)
    const notificationSnapshot = await get(notificationRef)

    if (!notificationSnapshot.exists()) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 })
    }

    const notification = notificationSnapshot.val()

    // Verify that the notification belongs to the user
    if (notification.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Delete the notification
    await remove(notificationRef)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting notification:", error)
    return NextResponse.json({ error: "Internal server error4" }, { status: 500 })
  }
}

