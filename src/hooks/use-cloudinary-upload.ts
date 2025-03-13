"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"

type UploadOptions = {
  projectId: string
  maxFileSize?: number // in bytes
  allowedFileTypes?: string[]
  onProgress?: (progress: number) => void
}

type UploadResult = {
  url: string
  publicId: string
  format: string
  width: number
  height: number
  resourceType: string
}

export function useCloudinaryUpload() {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const getUploadSignature = async (projectId: string, params: Record<string, any> = {}) => {
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
      const { signature, timestamp, cloudName, apiKey, folder } = await getUploadSignature(options.projectId)

      // Create form data
      const formData = new FormData()
      formData.append("file", file)
      formData.append("api_key", apiKey)
      formData.append("timestamp", timestamp.toString())
      formData.append("signature", signature)
      formData.append("folder", folder)

      // Upload to Cloudinary
      const xhr = new XMLHttpRequest()

      xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, true)

      // Setup progress tracking
      if (options.onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100)
            options.onProgress?.(progress)
          }
        }
      }

      // Return a promise that resolves when the upload is complete
      return new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const response = JSON.parse(xhr.responseText)
            resolve({
              url: response.secure_url,
              publicId: response.public_id,
              format: response.format,
              width: response.width,
              height: response.height,
              resourceType: response.resource_type,
            })
          } else {
            reject(new Error("Upload failed"))
          }
        }

        xhr.onerror = () => {
          reject(new Error("Upload failed"))
        }

        xhr.send(formData)
      })
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
  }
}

