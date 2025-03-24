import { getUploadSignature } from "@/config/cloudinary"
import { database } from "@/config/firebase"
import { auth as adminAuth } from "@/config/firebase-admin" // Import from our firebase-admin config
import { get, ref } from "firebase/database"
import { type NextRequest, NextResponse } from "next/server"
import { getCloudinaryConfigByProjectId } from "@/services/cloudinary-service"

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if adminAuth is available
    if (!adminAuth) {
      console.error("Firebase Admin Auth is not initialized")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    const token = authHeader.split(" ")[1]
    const decodedToken = await adminAuth.verifyIdToken(token) // Use our imported adminAuth
    const userId = decodedToken.uid

    // Get project ID and other parameters from request
    const { projectId, taskId, commentId, ...uploadParams } = await request.json()

    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 })
    }

    // Check if user has access to this project
    const projectRef = ref(database, `projects/${projectId}`)
    const projectSnapshot = await get(projectRef)

    if (!projectSnapshot.exists()) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const projectData = projectSnapshot.val()

    if (!projectData.members || !projectData.members[userId]) {
      return NextResponse.json({ error: "You do not have access to this project" }, { status: 403 })
    }

    // Get Cloudinary config for this project
    const projectCloudinaryConfig = await getCloudinaryConfigByProjectId(projectId)

    if (!projectCloudinaryConfig) {
      return NextResponse.json({ error: "Cloudinary configuration not found for this project" }, { status: 404 })
    }

    // Add metadata to the upload params
    const metadata = {
      userId,
      projectId,
      ...(taskId ? { taskId } : {}),
      ...(commentId ? { commentId } : {}),
    }

    // Generate upload signature with metadata
    const uploadSignature = getUploadSignature(
      {
        cloudName: projectCloudinaryConfig.cloudName,
        apiKey: projectCloudinaryConfig.apiKey,
        apiSecret: projectCloudinaryConfig.apiSecret,
        folderName: projectCloudinaryConfig.folderName,
      },
      {
        ...uploadParams,
        context: `userId=${userId}|projectId=${projectId}${taskId ? `|taskId=${taskId}` : ""}${commentId ? `|commentId=${commentId}` : ""}`,
      },
    )

    return NextResponse.json({
      ...uploadSignature,
      metadata,
    })
  } catch (error) {
    console.error("Error generating upload signature:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

