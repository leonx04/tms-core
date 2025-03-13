import { getUploadSignature } from "@/lib/cloudinary"
import { database } from "@/lib/firebase"
import { getAuth } from "firebase-admin/auth"
import { get, ref } from "firebase/database"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split(" ")[1]
    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid

    // Get project ID from request
    const { projectId, ...uploadParams } = await request.json()

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
    const cloudinaryRef = ref(database, `projectCloudinary`)
    const cloudinarySnapshot = await get(cloudinaryRef)

    if (!cloudinarySnapshot.exists()) {
      return NextResponse.json({ error: "Cloudinary configuration not found" }, { status: 404 })
    }

    const cloudinaryConfigs = cloudinarySnapshot.val()
    let projectCloudinaryConfig: {
      cloudName: string
      apiKey: string
      apiSecret: string
      folderName: string
      projectId: string
    } | undefined

    // Find the config for this project
    Object.values(cloudinaryConfigs).forEach((config: any) => {
      if (config.projectId === projectId) {
        projectCloudinaryConfig = config
      }
    })

    if (!projectCloudinaryConfig) {
      return NextResponse.json({ error: "Cloudinary configuration not found for this project" }, { status: 404 })
    }

    // Generate upload signature
    const uploadSignature = getUploadSignature(
      {
        cloudName: projectCloudinaryConfig.cloudName,
        apiKey: projectCloudinaryConfig.apiKey,
        apiSecret: projectCloudinaryConfig.apiSecret,
        folderName: projectCloudinaryConfig.folderName,
      },
      uploadParams,
    )

    return NextResponse.json(uploadSignature)
  } catch (error) {
    console.error("Error generating upload signature:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

