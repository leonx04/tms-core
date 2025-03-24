import { v2 as cloudinary } from "cloudinary"
import crypto from "crypto"

export type CloudinaryConfig = {
  cloudName: string
  apiKey: string
  apiSecret: string
  folderName?: string
}

export const configureCloudinary = (config: CloudinaryConfig) => {
  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    secure: true,
  })

  return cloudinary
}

export const getUploadSignature = (config: CloudinaryConfig, params: Record<string, any> = {}) => {
  const timestamp = Math.round(new Date().getTime() / 1000)

  // Combine all parameters that should be signed
  const signatureParams = {
    timestamp,
    folder: config.folderName || "TMC",
    ...params,
  }

  // Create the string to sign
  const signatureString =
    Object.entries(signatureParams)
      .sort()
      .map(([key, value]) => `${key}=${value}`)
      .join("&") + config.apiSecret

  // Generate SHA-1 hash
  const signature = crypto.createHash("sha1").update(signatureString).digest("hex")

  return {
    signature,
    timestamp,
    cloudName: config.cloudName,
    apiKey: config.apiKey,
    folder: config.folderName || "TMC",
  }
}

// Verify Cloudinary webhook signature
export const verifyCloudinarySignature = (payload: any, signature: string, apiSecret: string): boolean => {
  const expectedSignature = crypto
    .createHash("sha1")
    .update(JSON.stringify(payload) + apiSecret)
    .digest("hex")

  return signature === expectedSignature
}

export default cloudinary
