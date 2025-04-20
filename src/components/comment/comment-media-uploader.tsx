"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MediaUploader } from "@/components/cloudinary/media-uploader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PaperclipIcon as PaperClip } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useCloudinaryUpload } from "@/hooks/use-cloudinary-upload";

interface CommentMediaUploaderProps {
  projectId: string;
  taskId: string;
  commentId?: string;
  onUploadComplete?: (result: {
    url: string;
    publicId: string;
    resourceType: string;
    format: string;
  }) => void;
}

export function CommentMediaUploader({
  projectId,
  taskId,
  commentId,
  onUploadComplete,
}: CommentMediaUploaderProps) {
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [pasteEnabled, setPasteEnabled] = useState(true);
  const [pasteLoading, setPasteLoading] = useState(false);
  const { toast } = useToast();

  const handleUploadComplete = (result: any) => {
    onUploadComplete?.(result);
    setShowUploadDialog(false);
  };

  // Handle paste functionality directly in the comment uploader
  const handlePaste = useCallback(
    async (e: ClipboardEvent) => {
      if (!pasteEnabled || !e.clipboardData || !e.clipboardData.files.length)
        return;

      // Only handle image files
      const file = e.clipboardData.files[0];
      if (!file.type.startsWith("image/")) return;

      e.preventDefault();
      setPasteLoading(true);

      try {
        // Create a simple uploader instance
        const { uploadFile } = useCloudinaryUpload();

        const result = await uploadFile(file, {
          projectId,
          taskId,
          commentId,
          maxFileSize: 5 * 1024 * 1024, // 5MB
          allowedFileTypes: ["jpg", "jpeg", "png", "gif", "webp"],
          autoStore: true,
        });

        onUploadComplete?.(result);

        toast({
          title: "Image pasted",
          description: "Your pasted image has been uploaded.",
        });
      } catch (err: any) {
        toast({
          title: "Upload failed",
          description: err.message || "Failed to upload pasted image.",
          variant: "destructive",
        });
      } finally {
        setPasteLoading(false);
      }
    },
    [
      projectId,
      taskId,
      commentId,
      onUploadComplete,
      pasteEnabled,
      toast,
      useCloudinaryUpload,
    ]
  );

  // Add event listener for paste
  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => {
      document.removeEventListener("paste", handlePaste);
    };
  }, [handlePaste]);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setShowUploadDialog(true)}
        className="text-muted-foreground hover:text-foreground"
        disabled={pasteLoading}
      >
        {pasteLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            Pasting...
          </>
        ) : (
          <>
            <PaperClip className="h-4 w-4 mr-1" />
            Attach
          </>
        )}
      </Button>

      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attach Media</DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            <p className="text-sm text-muted-foreground mb-4">
              You can also paste images directly into the comment box.
            </p>
            <MediaUploader
              projectId={projectId}
              taskId={taskId}
              commentId={commentId}
              onUploadComplete={handleUploadComplete}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
