"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { useCloudinaryUpload } from "@/hooks/use-cloudinary-upload"
import { AlertCircle, FileImage, Loader2, Upload, X } from "lucide-react"
import Image from "next/image"

interface MediaUploaderProps {
    projectId: string
    taskId?: string
    commentId?: string
    onUploadComplete?: (result: {
        url: string
        publicId: string
        resourceType: string
        format: string
    }) => void
    maxFileSize?: number // in bytes, default 10MB
    allowedFileTypes?: string[] // default: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'mp4', 'webm']
    multiple?: boolean
    className?: string
}

export function MediaUploader({
    projectId,
    taskId,
    commentId,
    onUploadComplete,
    maxFileSize = 10 * 1024 * 1024, // 10MB default
    allowedFileTypes = ["jpg", "jpeg", "png", "gif", "webp", "pdf", "mp4", "webm"],
    multiple = false,
    className = "",
}: MediaUploaderProps) {
    const { toast } = useToast()
    const { uploadFile, isUploading, error, progress } = useCloudinaryUpload()
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const [previews, setPreviews] = useState<string[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return

        const files = Array.from(e.target.files)

        // Validate file types
        const invalidFiles = files.filter((file) => {
            const extension = file.name.split(".").pop()?.toLowerCase() || ""
            return !allowedFileTypes.includes(extension)
        })

        if (invalidFiles.length > 0) {
            toast({
                title: "Invalid file type",
                description: `Only ${allowedFileTypes.join(", ")} files are allowed.`,
                variant: "destructive",
            })
            return
        }

        // Validate file sizes
        const oversizedFiles = files.filter((file) => file.size > maxFileSize)

        if (oversizedFiles.length > 0) {
            toast({
                title: "File too large",
                description: `Maximum file size is ${maxFileSize / 1024 / 1024}MB.`,
                variant: "destructive",
            })
            return
        }

        // Create previews for images
        const newPreviews = files.map((file) => {
            if (file.type.startsWith("image/")) {
                return URL.createObjectURL(file)
            }
            return ""
        })

        setSelectedFiles(multiple ? [...selectedFiles, ...files] : files)
        setPreviews(multiple ? [...previews, ...newPreviews] : newPreviews)
    }

    const handleUpload = async () => {
        if (selectedFiles.length === 0) return

        try {
            for (let i = 0; i < selectedFiles.length; i++) {
                const file = selectedFiles[i]

                const result = await uploadFile(file, {
                    projectId,
                    taskId,
                    commentId,
                    maxFileSize,
                    allowedFileTypes,
                    autoStore: true,
                })

                onUploadComplete?.(result)

                toast({
                    title: "Upload successful",
                    description: "Your file has been uploaded successfully.",
                })
            }

            // Clear selected files after successful upload
            setSelectedFiles([])
            setPreviews([])

            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = ""
            }
        } catch (err: any) {
            toast({
                title: "Upload failed",
                description: err.message || "An error occurred during upload.",
                variant: "destructive",
            })
        }
    }

    const removeFile = (index: number) => {
        const newFiles = [...selectedFiles]
        const newPreviews = [...previews]

        // Revoke object URL to avoid memory leaks
        if (newPreviews[index]) {
            URL.revokeObjectURL(newPreviews[index])
        }

        newFiles.splice(index, 1)
        newPreviews.splice(index, 1)

        setSelectedFiles(newFiles)
        setPreviews(newPreviews)
    }

    const triggerFileInput = () => {
        fileInputRef.current?.click()
    }

    return (
        <div className={`space-y-4 ${className}`}>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                multiple={multiple}
                accept={allowedFileTypes.map((type) => `.${type}`).join(",")}
            />

            {/* Preview area */}
            {selectedFiles.length > 0 && (
                <div className="space-y-2">
                    {selectedFiles.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
                            {previews[index] ? (
                                <div className="relative h-12 w-12 rounded overflow-hidden">
                                    <Image src={previews[index] || "/placeholder.svg"} alt={file.name} fill className="object-cover" />
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-12 w-12 bg-muted rounded">
                                    <FileImage className="h-6 w-6 text-muted-foreground" />
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{file.name}</p>
                                <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => removeFile(index)} disabled={isUploading}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            {/* Progress bar */}
            {isUploading && (
                <div className="space-y-2">
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-center text-muted-foreground">Uploading... {progress}%</p>
                </div>
            )}

            {/* Error message */}
            {error && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={triggerFileInput} disabled={isUploading} className="flex-1">
                    <FileImage className="mr-2 h-4 w-4" />
                    Select {multiple ? "Files" : "File"}
                </Button>

                {selectedFiles.length > 0 && (
                    <Button
                        type="button"
                        onClick={handleUpload}
                        disabled={isUploading || selectedFiles.length === 0}
                        className="flex-1"
                    >
                        {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        Upload
                    </Button>
                )}
            </div>

            <p className="text-xs text-muted-foreground">
                Allowed file types: {allowedFileTypes.join(", ")}. Max size: {maxFileSize / 1024 / 1024}MB
            </p>
        </div>
    )
}

