"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  getProjectCloudinaryUploads,
  getTaskCloudinaryUploads,
  getCommentCloudinaryUploads,
} from "@/services/cloudinary-service";
import { FileImage, ExternalLink, Download } from "lucide-react";
import Image from "next/image";

interface MediaGalleryProps {
  projectId: string;
  taskId?: string;
  commentId?: string;
  onSelect?: (media: any) => void;
  showControls?: boolean;
  className?: string;
}

export function MediaGallery({
  projectId,
  taskId,
  commentId,
  onSelect,
  showControls = true,
  className = "",
}: MediaGalleryProps) {
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMedia = async () => {
      try {
        setLoading(true);
        let mediaItems: any[] = [];

        if (commentId) {
          // Fetch media for a specific comment
          mediaItems = await getCommentCloudinaryUploads(projectId, commentId);
        } else if (taskId) {
          // Fetch media for a specific task
          mediaItems = await getTaskCloudinaryUploads(projectId, taskId);
        } else {
          // Fetch all media for the project
          mediaItems = await getProjectCloudinaryUploads(projectId);
        }

        setMedia(mediaItems);
      } catch (err) {
        console.error("Error fetching media:", err);
        setError("Failed to load media");
      } finally {
        setLoading(false);
      }
    };

    fetchMedia();
  }, [projectId, taskId, commentId]);

  const handleSelect = (item: any) => {
    if (onSelect) {
      onSelect(item);
    }
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

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <LoadingSpinner size="sm" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 text-center text-destructive ${className}`}>
        <p>{error}</p>
      </div>
    );
  }

  if (media.length === 0) {
    return (
      <div className={`p-4 text-center text-muted-foreground ${className}`}>
        <FileImage className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No media found</p>
      </div>
    );
  }

  return (
    <div
      className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 ${className}`}
    >
      {media.map((item) => (
        <Card
          key={item.id}
          className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
          onClick={() => handleSelect(item)}
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
                  <p className="text-xs truncate max-w-full">PDF Document</p>
                </div>
              </div>
            ) : (
              <div className="aspect-square flex items-center justify-center bg-muted">
                <div className="text-center p-4">
                  <FileImage className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-xs truncate max-w-full">
                    {item.format || "File"}
                  </p>
                </div>
              </div>
            )}

            {showControls && (
              <div className="absolute bottom-0 left-0 right-0 p-1 bg-background/80 backdrop-blur-sm flex justify-end gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                  <a
                    href={item.url}
                    download
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
