"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { storeCloudinaryUpload } from "@/services/cloudinary-service"

type UploadOptions = {
  projectId: string
  taskId?: string
  commentId?: string
  maxFileSize?: number // in bytes
  allowedFileTypes?: string[]
  onProgress?: (progress: number) => void
  autoStore?: boolean // whether to automatically store the upload in the database
}

type UploadResult = {
  url: string
  publicId: string
  format: string
  width?: number
  height?: number
  resourceType: string
  bytes?: number
  duration?: number
}

export function useCloudinaryUpload() {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<number>(0)
  const { user } = useAuth()

  const getUploadSignature = async (
    projectId: string,
    taskId?: string,
    commentId?: string,
    params: Record<string, any> = {},
  ) => {
    if (!user) {
      throw new Error("User not authenticated")
    }

    const idToken = await user.getIdToken()

    const response = await fetch("/api/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        projectId,
        taskId,
        commentId,
        ...params,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to get upload signature")
    }

    return response.json()
  }

  const uploadFile = async (file: File, options: UploadOptions): Promise<UploadResult> => {
    setIsUploading(true)
    setError(null)
    setProgress(0)

    try {
      // Validate file size
      if (options.maxFileSize && file.size > options.maxFileSize) {
        throw new Error(`File size exceeds the maximum allowed size (${options.maxFileSize / 1024 / 1024}MB)`)
      }

      // Validate file type
      if (options.allowedFileTypes && options.allowedFileTypes.length > 0) {
        const fileExtension = file.name.split(".").pop()?.toLowerCase()
        if (!fileExtension || !options.allowedFileTypes.includes(fileExtension)) {
          throw new Error(`File type not allowed. Allowed types: ${options.allowedFileTypes.join(", ")}`)
        }
      }

      // Get upload signature
      const { signature, timestamp, cloudName, apiKey, folder, metadata } = await getUploadSignature(
        options.projectId,
        options.taskId,
        options.commentId,
      )

      // Create form data
      const formData = new FormData()
      formData.append("file", file)
      formData.append("api_key", apiKey)
      formData.append("timestamp", timestamp.toString())
      formData.append("signature", signature)
      formData.append("folder", folder)

      // Add context metadata
      if (metadata) {
        const contextParts = []
        if (metadata.userId) contextParts.push(`userId=${metadata.userId}`)
        if (metadata.projectId) contextParts.push(`projectId=${metadata.projectId}`)
        if (metadata.taskId) contextParts.push(`taskId=${metadata.taskId}`)
        if (metadata.commentId) contextParts.push(`commentId=${metadata.commentId}`)

        if (contextParts.length > 0) {
          formData.append("context", contextParts.join("|"))
        }
      }

      // Upload to Cloudinary
      const xhr = new XMLHttpRequest()

      xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, true)

      // Setup progress tracking
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progressValue = Math.round((event.loaded / event.total) * 100)
          setProgress(progressValue)
          options.onProgress?.(progressValue)
        }
      }

      // Return a promise that resolves when the upload is complete
      const uploadPromise = new Promise<UploadResult>((resolve, reject) => {
        xhr.onload = async () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const response = JSON.parse(xhr.responseText)

            const result = {
              url: response.secure_url,
              publicId: response.public_id,
              format: response.format,
              width: response.width,
              height: response.height,
              resourceType: response.resource_type,
              bytes: response.bytes,
              duration: response.duration,
            }

            // Automatically store the upload in the database if requested
            if (options.autoStore !== false && user) {
              try {
                await storeCloudinaryUpload(options.projectId, user.uid, {
                  ...result,
                  taskId: options.taskId,
                  commentId: options.commentId,
                })
              } catch (storeError) {
                console.error("Error storing upload:", storeError)
                // Continue even if storing fails
              }
            }

            resolve(result)
          } else {
            reject(new Error("Upload failed"))
          }
        }

        xhr.onerror = () => {
          reject(new Error("Upload failed"))
        }

        xhr.send(formData)
      })

      return await uploadPromise
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setIsUploading(false)
    }
  }

  return {
    uploadFile,
    isUploading,
    error,
    progress,
  }
}

