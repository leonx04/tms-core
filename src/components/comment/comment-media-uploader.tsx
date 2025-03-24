"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { MediaUploader } from "@/components/cloudinary/media-uploader"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PaperclipIcon as PaperClip } from "lucide-react"

interface CommentMediaUploaderProps {
    projectId: string
    taskId: string
    commentId?: string
    onUploadComplete?: (result: {
        url: string
        publicId: string
        resourceType: string
        format: string
    }) => void
}

export function CommentMediaUploader({ projectId, taskId, commentId, onUploadComplete }: CommentMediaUploaderProps) {
    const [showUploadDialog, setShowUploadDialog] = useState(false)

    const handleUploadComplete = (result: any) => {
        onUploadComplete?.(result)
        setShowUploadDialog(false)
    }

    return (
        <>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowUploadDialog(true)}
                className="text-muted-foreground hover:text-foreground"
            >
                <PaperClip className="h-4 w-4 mr-1" />
                Attach
            </Button>

            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Attach Media</DialogTitle>
                    </DialogHeader>
                    <MediaUploader
                        projectId={projectId}
                        taskId={taskId}
                        commentId={commentId}
                        onUploadComplete={handleUploadComplete}
                    />
                </DialogContent>
            </Dialog>
        </>
    )
}

