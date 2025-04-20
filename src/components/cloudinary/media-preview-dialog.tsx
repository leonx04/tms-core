"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, Download, ImageIcon } from "lucide-react";
import Image from "next/image";

interface MediaPreviewDialogProps {
  media: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MediaPreviewDialog({
  media,
  open,
  onOpenChange,
}: MediaPreviewDialogProps) {
  if (!media) return null;

  const isImage = (item: any) => {
    return (
      item?.resourceType === "image" ||
      (item?.format &&
        ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(
          item.format.toLowerCase()
        ))
    );
  };

  const isVideo = (item: any) => {
    return (
      item?.resourceType === "video" ||
      (item?.format &&
        ["mp4", "webm", "ogv"].includes(item.format.toLowerCase()))
    );
  };

  const isPdf = (item: any) => {
    return item?.format && item.format.toLowerCase() === "pdf";
  };

  // Add the truncateText utility function at the top of the component
  const truncateText = (text: string, maxLength = 30) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength)}...`;
  };

  // Get truncated filename or URL
  const getTruncatedText = (text: string, maxLength = 30) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;

    return `${text.substring(0, maxLength)}...`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Media Preview</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          {isImage(media) ? (
            <div className="relative w-full max-h-[70vh] flex items-center justify-center">
              <Image
                src={media.url || "/placeholder.svg"}
                alt={media.publicId || "Image"}
                width={800}
                height={600}
                className="max-h-[70vh] object-contain"
              />
            </div>
          ) : isVideo(media) ? (
            <div className="w-full">
              <video src={media.url} controls className="w-full max-h-[70vh]" />
            </div>
          ) : isPdf(media) ? (
            <div className="w-full h-[70vh]">
              <iframe
                src={media.url}
                className="w-full h-full"
                title="PDF Viewer"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8">
              <ImageIcon className="h-16 w-16 mb-4 text-muted-foreground" />
              <p className="text-center">
                This file type cannot be previewed.
                <a
                  href={media.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline ml-1"
                >
                  Open in new tab
                </a>
              </p>
            </div>
          )}

          <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
            <div className="w-full sm:max-w-[70%]">
              <p
                className="text-sm font-medium truncate"
                title={media.publicId}
              >
                {getTruncatedText(media.publicId)}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {media.resourceType}/{media.format}
                {media.width &&
                  media.height &&
                  ` • ${media.width}×${media.height}`}
              </p>
              <div
                className="text-xs text-muted-foreground overflow-hidden"
                title={media.url}
              >
                <p className="truncate max-w-full">
                  {truncateText(media.url, 50)}
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="flex-1 sm:flex-initial"
              >
                <a href={media.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open
                </a>
              </Button>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="flex-1 sm:flex-initial"
              >
                <a href={media.url} download>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </a>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
