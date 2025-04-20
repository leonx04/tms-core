"use client";

import type React from "react";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useCloudinaryUpload } from "@/hooks/use-cloudinary-upload";
import { AlertCircle, FileImage, Loader2, Upload, X } from "lucide-react";
import Image from "next/image";

interface MediaUploaderProps {
  projectId: string;
  taskId?: string;
  commentId?: string;
  onUploadComplete?: (result: {
    url: string;
    publicId: string;
    resourceType: string;
    format: string;
  }) => void;
  maxFileSize?: number; // in bytes, default 10MB
  allowedFileTypes?: string[]; // default: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'mp4', 'webm']
  multiple?: boolean;
  className?: string;
}

// Add a utility function to truncate long text
const truncateText = (text: string, maxLength = 20) => {
  if (!text) return "";
  if (text.length <= maxLength) return text;

  // For filenames with extensions, preserve the extension
  const lastDotIndex = text.lastIndexOf(".");
  if (lastDotIndex > 0) {
    const name = text.substring(0, lastDotIndex);
    const extension = text.substring(lastDotIndex);

    if (name.length <= maxLength - 3) return text;

    return `${name.substring(0, maxLength - 3)}...${extension}`;
  }

  // For URLs or text without extensions
  return `${text.substring(0, maxLength)}...`;
};

export function MediaUploader({
  projectId,
  taskId,
  commentId,
  onUploadComplete,
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  allowedFileTypes = [
    "jpg",
    "jpeg",
    "png",
    "gif",
    "webp",
    "pdf",
    "mp4",
    "webm",
  ],
  multiple = false,
  className = "",
}: MediaUploaderProps) {
  const { toast } = useToast();
  const { uploadFile, isUploading, error, progress } = useCloudinaryUpload();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const validateFiles = (files: File[]) => {
    // Validate file types
    const invalidFiles = files.filter((file) => {
      const extension = file.name.split(".").pop()?.toLowerCase() || "";
      return !allowedFileTypes.includes(extension);
    });

    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid file type",
        description: `Only ${allowedFileTypes.join(", ")} files are allowed.`,
        variant: "destructive",
      });
      return false;
    }

    // Validate file sizes
    const oversizedFiles = files.filter((file) => file.size > maxFileSize);

    if (oversizedFiles.length > 0) {
      toast({
        title: "File too large",
        description: `Maximum file size is ${maxFileSize / 1024 / 1024}MB.`,
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const processFiles = (files: File[]) => {
    if (!validateFiles(files)) return;

    // Create previews for images
    const newPreviews = files.map((file) => {
      if (file.type.startsWith("image/")) {
        return URL.createObjectURL(file);
      }
      return "";
    });

    setSelectedFiles(multiple ? [...selectedFiles, ...files] : files);
    setPreviews(multiple ? [...previews, ...newPreviews] : newPreviews);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    processFiles(files);
  };

  // Add drag-and-drop functionality
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const files = Array.from(e.dataTransfer.files);
        processFiles(files);
      }
    },
    [multiple, selectedFiles, previews]
  );

  // Add paste functionality
  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        e.preventDefault();
        const files = Array.from(e.clipboardData.files);
        processFiles(files);
      }
    },
    [multiple, selectedFiles, previews]
  );

  // Add event listener for paste
  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => {
      document.removeEventListener("paste", handlePaste);
    };
  }, [handlePaste]);

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];

        const result = await uploadFile(file, {
          projectId,
          taskId,
          commentId,
          maxFileSize,
          allowedFileTypes,
          autoStore: true,
        });

        onUploadComplete?.(result);

        toast({
          title: "Upload successful",
          description: "Your file has been uploaded successfully.",
        });
      }

      // Clear selected files after successful upload
      setSelectedFiles([]);
      setPreviews([]);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err.message || "An error occurred during upload.",
        variant: "destructive",
      });
    }
  };

  const removeFile = (index: number, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    const newFiles = [...selectedFiles];
    const newPreviews = [...previews];

    // Revoke object URL to avoid memory leaks
    if (newPreviews[index]) {
      URL.revokeObjectURL(newPreviews[index]);
    }

    newFiles.splice(index, 1);
    newPreviews.splice(index, 1);

    setSelectedFiles(newFiles);
    setPreviews(newPreviews);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

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

      {/* Drag and drop area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : isUploading
            ? "bg-muted/50 border-muted"
            : "border-muted hover:border-primary/50 hover:bg-muted/10"
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={triggerFileInput}
      >
        <div className="flex flex-col items-center justify-center space-y-2">
          <FileImage className="h-8 w-8 text-muted-foreground" />
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {isUploading
                ? "Uploading..."
                : isDragging
                ? "Drop files here"
                : "Drag & drop files here or click to browse"}
            </p>
            <p className="text-xs text-muted-foreground">
              You can also paste images from clipboard
            </p>
          </div>
        </div>
      </div>

      {/* Preview area */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-2 border rounded-md bg-muted/30"
            >
              {previews[index] ? (
                <div className="relative h-12 w-12 rounded overflow-hidden">
                  <Image
                    src={previews[index] || "/placeholder.svg"}
                    alt={file.name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-12 w-12 bg-muted rounded">
                  <FileImage className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" title={file.name}>
                  {truncateText(file.name, 25)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => removeFile(index, e)}
                disabled={isUploading}
              >
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
          <p className="text-xs text-center text-muted-foreground">
            Uploading... {progress}%
          </p>
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
        <Button
          type="button"
          variant="outline"
          onClick={triggerFileInput}
          disabled={isUploading}
          className="flex-1"
        >
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
            {isUploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Upload
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Allowed file types: {allowedFileTypes.join(", ")}. Max size:{" "}
        {maxFileSize / 1024 / 1024}MB
      </p>
    </div>
  );
}
