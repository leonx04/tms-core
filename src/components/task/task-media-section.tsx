"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MediaUploader } from "@/components/cloudinary/media-uploader"
import { MediaGallery } from "@/components/cloudinary/media-gallery"
import { FileImage, Upload } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import Image from "next/image"

interface TaskMediaSectionProps {
    projectId: string
    taskId: string
}

export function TaskMediaSection({ projectId, taskId }: TaskMediaSectionProps) {
    const [activeTab, setActiveTab] = useState("gallery")
    const [showUploadDialog, setShowUploadDialog] = useState(false)
    const [selectedMedia, setSelectedMedia] = useState<any | null>(null)
    const [showMediaPreview, setShowMediaPreview] = useState(false)

    const handleUploadComplete = () => {
        setActiveTab("gallery")
        setShowUploadDialog(false)
    }

    const handleMediaSelect = (media: any) => {
        setSelectedMedia(media)
        setShowMediaPreview(true)
    }

    const isImage = (item: any) => {
        return (
            item?.resourceType === "image" ||
            (item?.format && ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(item.format.toLowerCase()))
        )
    }

    const isVideo = (item: any) => {
        return (
            item?.resourceType === "video" || (item?.format && ["mp4", "webm", "ogv"].includes(item.format.toLowerCase()))
        )
    }

    const isPdf = (item: any) => {
        return item?.format && item.format.toLowerCase() === "pdf"
    }

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg">Media</CardTitle>
                    <Button variant="outline" size="sm" onClick={() => setShowUploadDialog(true)}>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                    </Button>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="gallery">Gallery</TabsTrigger>
                            <TabsTrigger value="upload">Upload</TabsTrigger>
                        </TabsList>
                        <TabsContent value="gallery" className="pt-4">
                            <MediaGallery projectId={projectId} taskId={taskId} onSelect={handleMediaSelect} />
                        </TabsContent>
                        <TabsContent value="upload" className="pt-4">
                            <MediaUploader projectId={projectId} taskId={taskId} onUploadComplete={handleUploadComplete} multiple />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Upload Dialog */}
            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Upload Media</DialogTitle>
                    </DialogHeader>
                    <MediaUploader projectId={projectId} taskId={taskId} onUploadComplete={handleUploadComplete} multiple />
                </DialogContent>
            </Dialog>

            {/* Media Preview Dialog */}
            <Dialog open={showMediaPreview} onOpenChange={setShowMediaPreview}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Media Preview</DialogTitle>
                    </DialogHeader>
                    {selectedMedia && (
                        <div className="mt-4">
                            {isImage(selectedMedia) ? (
                                <div className="relative w-full max-h-[70vh] flex items-center justify-center">
                                    <Image
                                        src={selectedMedia.url || "/placeholder.svg"}
                                        alt={selectedMedia.publicId || "Image"}
                                        width={800}
                                        height={600}
                                        className="max-h-[70vh] object-contain"
                                    />
                                </div>
                            ) : isVideo(selectedMedia) ? (
                                <div className="w-full">
                                    <video src={selectedMedia.url} controls className="w-full max-h-[70vh]" />
                                </div>
                            ) : isPdf(selectedMedia) ? (
                                <div className="w-full h-[70vh]">
                                    <iframe src={selectedMedia.url} className="w-full h-full" title="PDF Viewer" />
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center p-8">
                                    <FileImage className="h-16 w-16 mb-4 text-muted-foreground" />
                                    <p className="text-center">
                                        This file type cannot be previewed.
                                        <a
                                            href={selectedMedia.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary hover:underline ml-1"
                                        >
                                            Open in new tab
                                        </a>
                                    </p>
                                </div>
                            )}

                            <div className="mt-4 flex justify-between items-center">
                                <div>
                                    <p className="text-sm font-medium truncate">{selectedMedia.publicId}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {selectedMedia.resourceType}/{selectedMedia.format}
                                        {selectedMedia.width && selectedMedia.height && ` • ${selectedMedia.width}×${selectedMedia.height}`}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" asChild>
                                        <a href={selectedMedia.url} target="_blank" rel="noopener noreferrer">
                                            Open
                                        </a>
                                    </Button>
                                    <Button variant="outline" size="sm" asChild>
                                        <a href={selectedMedia.url} download>
                                            Download
                                        </a>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    )
}

