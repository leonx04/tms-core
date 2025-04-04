import { verifyCloudinarySignature } from "@/config/cloudinary"
import { database } from "@/config/firebase"
import { get, push, ref, set } from "firebase/database"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    // Get the Cloudinary notification
    const payload = await request.json()

    // Verify the signature if provided
    const signature = request.headers.get("X-Cld-Signature")

    if (signature) {
      // Find the project with this Cloudinary configuration
      const cloudinaryRef = ref(database, "projectCloudinary")
      const cloudinarySnapshot = await get(cloudinaryRef)

      if (!cloudinarySnapshot.exists()) {
        return NextResponse.json({ error: "No Cloudinary configurations found" }, { status: 404 })
      }

      const cloudinaryConfigs = cloudinarySnapshot.val()
      let isValidSignature = false
      let projectId = null
      let projectConfig = null

      // Check signature against all project configurations
      for (const [configId, config] of Object.entries(cloudinaryConfigs)) {
        const { apiSecret, projectId: pid } = config as any

        if (apiSecret) {
          if (verifyCloudinarySignature(payload, signature, apiSecret)) {
            isValidSignature = true
            projectId = pid
            projectConfig = config
            break
          }
        }
      }

      if (!isValidSignature) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 403 })
      }

      // Process the webhook for the identified project
      if (projectId) {
        await processCloudinaryWebhook(projectId, payload, projectConfig)
      }
    } else {
      // If no signature, try to identify the project from the payload
      const publicId = payload.public_id

      if (publicId) {
        // Extract folder name from public_id (format: folder/filename)
        const folderName = publicId.split("/")[0]

        // Find the project with this folder name
        const cloudinaryRef = ref(database, "projectCloudinary")
        const cloudinarySnapshot = await get(cloudinaryRef)

        if (cloudinarySnapshot.exists()) {
          const cloudinaryConfigs = cloudinarySnapshot.val()
          let projectId = null
          let projectConfig = null

          for (const [configId, config] of Object.entries(cloudinaryConfigs)) {
            if ((config as any).folderName === folderName) {
              projectId = (config as any).projectId
              projectConfig = config
              break
            }
          }

          if (projectId) {
            await processCloudinaryWebhook(projectId, payload, projectConfig)
          }
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error processing Cloudinary webhook:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function processCloudinaryWebhook(projectId: string, payload: any, projectConfig: any) {
  try {
    // Store the Cloudinary event in the database
    const eventRef = push(ref(database, `projectCloudinaryEvents/${projectId}`))

    await set(eventRef, {
      timestamp: new Date().toISOString(),
      event: payload.notification_type,
      resource: {
        type: payload.resource_type,
        publicId: payload.public_id,
        url: payload.secure_url || payload.url,
        version: payload.version,
      },
      metadata: payload.metadata || {},
    })

    // Create notifications for project members if needed
    if (["upload", "update", "delete"].includes(payload.notification_type)) {
      const projectRef = ref(database, `projects/${projectId}`)
      const projectSnapshot = await get(projectRef)

      if (projectSnapshot.exists()) {
        const projectData = projectSnapshot.val()
        const members = projectData.members || {}

        // Create a notification for each project member
        for (const [memberId, memberData] of Object.entries(members)) {
          const notificationRef = push(ref(database, "notifications"))

          await set(notificationRef, {
            userId: memberId,
            eventType: "CLOUDINARY_EVENT",
            referenceId: projectId,
            message: `Cloudinary ${payload.notification_type}: ${payload.public_id}`,
            status: "unread",
            createdAt: new Date().toISOString(),
            data: {
              type: "cloudinary",
              event: payload.notification_type,
              resourceType: payload.resource_type,
              publicId: payload.public_id,
              url: payload.secure_url || payload.url,
            },
          })
        }
      }
    }

    // Update project uploads if this is a new upload
    if (payload.notification_type === "upload" && payload.metadata) {
      // Check if the upload has task or comment metadata
      const { taskId, commentId, userId } = payload.metadata

      if ((taskId || commentId) && userId) {
        // Store the upload in the project uploads
        const uploadRef = push(ref(database, `projectCloudinaryUploads/${projectId}`))

        await set(uploadRef, {
          projectId,
          userId,
          publicId: payload.public_id,
          url: payload.secure_url || payload.url,
          resourceType: payload.resource_type,
          format: payload.format,
          width: payload.width,
          height: payload.height,
          bytes: payload.bytes,
          taskId,
          commentId,
          createdAt: new Date().toISOString(),
        })
      }
    }
  } catch (error) {
    console.error("Error processing Cloudinary webhook for project:", error)
    throw error
  }
}

