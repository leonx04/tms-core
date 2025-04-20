"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { getTaskCloudinaryUploads } from "@/services/cloudinary-service";
import { FileImage, ExternalLink, Download, ImagePlus } from "lucide-react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MediaUploader } from "./media-uploader";
import { MediaPreviewDialog } from "./media-preview-dialog";

interface TaskMediaSectionProps {
  projectId: string;
  taskId: string;
}

// Add the truncateText utility function at the top of the component
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

export function TaskMediaSection({ projectId, taskId }: TaskMediaSectionProps) {
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUploader, setShowUploader] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<any | null>(null);
  const [showMediaPreview, setShowMediaPreview] = useState(false);

  useEffect(() => {
    const fetchMedia = async () => {
      try {
        setLoading(true);
        const mediaItems = await getTaskCloudinaryUploads(projectId, taskId);
        setMedia(mediaItems);
      } catch (err) {
        console.error("Error fetching media:", err);
        setError("Failed to load media");
      } finally {
        setLoading(false);
      }
    };

    fetchMedia();
  }, [projectId, taskId]);

  const handleUploadComplete = (result: any) => {
    setMedia((prev) => [...prev, result]);
    setShowUploader(false);
  };

  const handleMediaSelect = (item: any) => {
    setSelectedMedia(item);
    setShowMediaPreview(true);
  };

  const isImage = (item: any) => {
    return (
      item.resourceType === "image" ||
      (item.format &&
        ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(
          item.format.toLowerCase()
        ))
    );
  };

  const isVideo = (item: any) => {
    return (
      item.resourceType === "video" ||
      (item.format &&
        ["mp4", "webm", "ogv"].includes(item.format.toLowerCase()))
    );
  };

  const isPdf = (item: any) => {
    return item.format && item.format.toLowerCase() === "pdf";
  };

  // Get truncated filename
  const getTruncatedFilename = (filename: string, maxLength = 20) => {
    if (!filename) return "";
    if (filename.length <= maxLength) return filename;

    return `${filename.substring(0, maxLength)}...`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="sm" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Media Attachments</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowUploader(true)}
        >
          <ImagePlus className="h-4 w-4 mr-2" />
          Add Media
        </Button>
      </div>

      {error ? (
        <div className="p-4 text-center text-destructive">
          <p>{error}</p>
        </div>
      ) : media.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground border rounded-lg">
          <FileImage className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="mb-4">No media attachments yet</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowUploader(true)}
          >
            <ImagePlus className="h-4 w-4 mr-2" />
            Add Media
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {media.map((item) => (
            <Card
              key={item.id || item.publicId}
              className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
              onClick={() => handleMediaSelect(item)}
            >
              <CardContent className="p-0 relative">
                {isImage(item) ? (
                  <div className="aspect-square relative">
                    <Image
                      src={item.url || "/placeholder.svg"}
                      alt={item.publicId || "Media"}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : isVideo(item) ? (
                  <div className="aspect-video relative bg-muted">
                    <video
                      src={item.url}
                      controls={false}
                      muted
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <FileImage className="h-8 w-8 text-white" />
                    </div>
                  </div>
                ) : isPdf(item) ? (
                  <div className="aspect-square flex items-center justify-center bg-muted">
                    <div className="text-center p-4">
                      <FileImage className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-xs truncate max-w-full">
                        PDF Document
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-square flex items-center justify-center bg-muted">
                    <div className="text-center p-4">
                      <FileImage className="h-8 w-8 mx-auto mb-2" />
                      <p
                        className="text-xs truncate max-w-full"
                        title={item.publicId || item.format || "File"}
                      >
                        {truncateText(item.publicId || item.format || "File")}
                      </p>
                    </div>
                  </div>
                )}

                <div className="absolute bottom-0 left-0 right-0 p-1 bg-background/80 backdrop-blur-sm flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    asChild
                  >
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    asChild
                  >
                    <a
                      href={item.url}
                      download
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUploader} onOpenChange={setShowUploader}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Media</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <MediaUploader
              projectId={projectId}
              taskId={taskId}
              onUploadComplete={handleUploadComplete}
              allowedFileTypes={[
                "jpg",
                "jpeg",
                "png",
                "gif",
                "webp",
                "pdf",
                "mp4",
                "webm",
              ]}
              maxFileSize={10 * 1024 * 1024} // 10MB
              multiple
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Media Preview Dialog */}
      <MediaPreviewDialog
        media={selectedMedia}
        open={showMediaPreview}
        onOpenChange={setShowMediaPreview}
      />
    </div>
  );
}
