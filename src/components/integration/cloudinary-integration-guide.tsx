"use client"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, CheckCircle, Copy, ExternalLink, Info } from "lucide-react"
import { useState } from "react"

interface CloudinaryIntegrationGuideProps {
    webhookUrl: string
}

export function CloudinaryIntegrationGuide({ webhookUrl }: CloudinaryIntegrationGuideProps) {
    const [copied, setCopied] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState("setup")

    const handleCopy = (text: string, type: string) => {
        navigator.clipboard.writeText(text)
        setCopied(type)
        setTimeout(() => setCopied(null), 2000)
    }

    return (
        <Card className="mt-6">
            <CardHeader>
                <CardTitle className="text-xl">Cloudinary Integration Guide</CardTitle>
                <CardDescription>Learn how to set up and use Cloudinary with your project</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="setup">Setup</TabsTrigger>
                        <TabsTrigger value="usage">Usage</TabsTrigger>
                        <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
                    </TabsList>

                    <TabsContent value="setup" className="space-y-4 mt-4">
                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertTitle>Before you begin</AlertTitle>
                            <AlertDescription>
                                You'll need a Cloudinary account. If you don't have one, you can{" "}
                                <a
                                    href="https://cloudinary.com/users/register/free"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline inline-flex items-center"
                                >
                                    sign up for free
                                    <ExternalLink className="h-3 w-3 ml-1" />
                                </a>
                            </AlertDescription>
                        </Alert>

                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="step1">
                                <AccordionTrigger>Step 1: Get your Cloudinary credentials</AccordionTrigger>
                                <AccordionContent className="space-y-2">
                                    <p className="text-sm text-muted-foreground">
                                        Log in to your Cloudinary dashboard and find your Cloud Name, API Key, and API Secret.
                                    </p>
                                    <Button variant="outline" size="sm" asChild>
                                        <a
                                            href="https://console.cloudinary.com/console/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center"
                                        >
                                            Go to Cloudinary Dashboard
                                            <ExternalLink className="ml-2 h-3 w-3" />
                                        </a>
                                    </Button>
                                    <div className="bg-muted p-3 rounded-lg mt-2">
                                        <p className="text-xs text-muted-foreground">
                                            Your credentials can be found in the Dashboard under Account Details.
                                        </p>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="step2">
                                <AccordionTrigger>Step 2: Enter your credentials in project settings</AccordionTrigger>
                                <AccordionContent className="space-y-2">
                                    <p className="text-sm text-muted-foreground">
                                        Enter your Cloudinary credentials in the Cloudinary tab of your project settings:
                                    </p>
                                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                        <li>Cloud Name: Your Cloudinary cloud name</li>
                                        <li>API Key: Your Cloudinary API key</li>
                                        <li>API Secret: Your Cloudinary API secret</li>
                                        <li>Folder Name: A folder name to organize your project's media (optional)</li>
                                    </ul>
                                </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="step3">
                                <AccordionTrigger>Step 3: Test the connection</AccordionTrigger>
                                <AccordionContent className="space-y-2">
                                    <p className="text-sm text-muted-foreground">
                                        After saving your credentials, you can test the connection by uploading a file in your project. If
                                        the upload is successful, your Cloudinary integration is working correctly.
                                    </p>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </TabsContent>

                    <TabsContent value="usage" className="space-y-4 mt-4">
                        <p className="text-sm text-muted-foreground">
                            Once Cloudinary is configured, you can use it to store and manage media files for your project. Here are
                            some common use cases:
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="border border-border rounded-lg p-4">
                                <h3 className="font-medium mb-2">Image Uploads</h3>
                                <p className="text-sm text-muted-foreground">
                                    Upload images directly to Cloudinary from your application. Images are automatically optimized and can
                                    be transformed on-the-fly.
                                </p>
                            </div>

                            <div className="border border-border rounded-lg p-4">
                                <h3 className="font-medium mb-2">Video Management</h3>
                                <p className="text-sm text-muted-foreground">
                                    Store, transcode, and stream videos. Cloudinary handles adaptive streaming and video optimization.
                                </p>
                            </div>

                            <div className="border border-border rounded-lg p-4">
                                <h3 className="font-medium mb-2">File Storage</h3>
                                <p className="text-sm text-muted-foreground">
                                    Store project documents, PDFs, and other files securely in the cloud with easy access controls.
                                </p>
                            </div>

                            <div className="border border-border rounded-lg p-4">
                                <h3 className="font-medium mb-2">Image Transformations</h3>
                                <p className="text-sm text-muted-foreground">
                                    Resize, crop, and apply filters to images on-the-fly using URL parameters.
                                </p>
                            </div>
                        </div>

                        <div className="bg-muted p-4 rounded-lg mt-2">
                            <h3 className="font-medium mb-2">Code Example: Uploading an Image</h3>
                            <pre className="text-xs overflow-x-auto p-2 bg-background rounded border border-border">
                                {`// Client-side upload using a signed upload
const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', '${"{YOUR_API_KEY}"}');
  formData.append('timestamp', '${"{TIMESTAMP}"}');
  formData.append('signature', '${"{GENERATED_SIGNATURE}"}');
  formData.append('folder', '${"{YOUR_FOLDER_NAME}"}');

  const response = await fetch('https://api.cloudinary.com/v1_1/${"{YOUR_CLOUD_NAME}"}/image/upload', {
    method: 'POST',
    body: formData
  });

  return await response.json();
};`}
                            </pre>
                        </div>

                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertTitle>Learn More</AlertTitle>
                            <AlertDescription>
                                For more information on using Cloudinary, check the{" "}
                                <a
                                    href="https://cloudinary.com/documentation"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline inline-flex items-center"
                                >
                                    Cloudinary Documentation
                                    <ExternalLink className="h-3 w-3 ml-1" />
                                </a>
                            </AlertDescription>
                        </Alert>
                    </TabsContent>

                    <TabsContent value="webhooks" className="space-y-4 mt-4">
                        <p className="text-sm text-muted-foreground">
                            Cloudinary webhooks allow you to receive notifications when media is uploaded, updated, or deleted. This
                            is useful for tracking changes and triggering workflows.
                        </p>

                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="webhook1">
                                <AccordionTrigger>Setting up Cloudinary Webhooks</AccordionTrigger>
                                <AccordionContent className="space-y-4">
                                    <p className="text-sm text-muted-foreground">To set up webhooks in Cloudinary:</p>
                                    <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                                        <li>Go to your Cloudinary Console</li>
                                        <li>Navigate to Settings &gt; Notifications</li>
                                        <li>Click on "Add Notification URL"</li>
                                        <li>Enter the webhook URL below</li>
                                        <li>Select the events you want to be notified about</li>
                                        <li>Save your changes</li>
                                    </ol>

                                    <div className="space-y-2 mt-2">
                                        <p className="text-sm font-medium">Webhook URL</p>
                                        <div className="flex items-center gap-2">
                                            <code className="bg-muted p-2 rounded text-xs flex-1 overflow-x-auto">{webhookUrl}</code>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleCopy(webhookUrl, "webhook-url")}
                                                className="shrink-0"
                                            >
                                                {copied === "webhook-url" ? (
                                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                                ) : (
                                                    <Copy className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>

                                    <Button variant="outline" size="sm" asChild>
                                        <a
                                            href="https://console.cloudinary.com/settings/notifications"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center"
                                        >
                                            Go to Cloudinary Notifications
                                            <ExternalLink className="ml-2 h-3 w-3" />
                                        </a>
                                    </Button>
                                </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="webhook2">
                                <AccordionTrigger>Supported Webhook Events</AccordionTrigger>
                                <AccordionContent className="space-y-2">
                                    <p className="text-sm text-muted-foreground">
                                        Our integration supports the following Cloudinary webhook events:
                                    </p>
                                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                        <li>
                                            <strong>Upload</strong> - Triggered when a new resource is uploaded
                                        </li>
                                        <li>
                                            <strong>Update</strong> - Triggered when a resource is updated
                                        </li>
                                        <li>
                                            <strong>Delete</strong> - Triggered when a resource is deleted
                                        </li>
                                    </ul>
                                </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="webhook3">
                                <AccordionTrigger>Viewing Webhook Events</AccordionTrigger>
                                <AccordionContent className="space-y-2">
                                    <p className="text-sm text-muted-foreground">
                                        After setting up webhooks, you can view all received events in the{" "}
                                        <a href="./webhooks" className="text-primary hover:underline">
                                            Webhooks page
                                        </a>{" "}
                                        of your project.
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        This page shows a history of all media uploads, updates, and deletions, allowing you to track
                                        changes to your project's media.
                                    </p>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>

                        <Alert variant="destructive" className="mt-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Troubleshooting</AlertTitle>
                            <AlertDescription>
                                <p className="mb-2">If you're not receiving webhook events:</p>
                                <ul className="list-disc list-inside text-sm space-y-1">
                                    <li>Verify the webhook URL is correctly entered in Cloudinary</li>
                                    <li>Check that you've selected the appropriate events</li>
                                    <li>Ensure your Cloudinary plan supports webhooks</li>
                                    <li>Test by uploading a new file to your Cloudinary account</li>
                                </ul>
                            </AlertDescription>
                        </Alert>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    )
}

