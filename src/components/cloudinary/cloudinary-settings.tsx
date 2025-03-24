"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { CloudinaryIntegrationGuide } from "@/components/cloudinary/cloudinary-integration-guide"
import { AlertCircle, Check, Info, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
    createCloudinaryConfig,
    getCloudinaryConfigByProjectId,
    updateCloudinaryConfig,
} from "@/services/cloudinary-service"

interface CloudinarySettingsProps {
    projectId: string
}

export function CloudinarySettings({ projectId }: CloudinarySettingsProps) {
    const { user } = useAuth()
    const { toast } = useToast()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [testing, setTesting] = useState(false)
    const [cloudinaryConfig, setCloudinaryConfig] = useState<any>(null)
    const [formData, setFormData] = useState({
        cloudName: "",
        apiKey: "",
        apiSecret: "",
        folderName: "",
        webhookEnabled: false,
    })
    const [error, setError] = useState<string | null>(null)
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

    // Webhook URL for this project
    const webhookUrl =
        typeof window !== "undefined" ? `${window.location.origin}/api/cloudinary/webhook` : "/api/cloudinary/webhook"

    useEffect(() => {
        const fetchCloudinaryConfig = async () => {
            if (!user || !projectId) return

            try {
                setLoading(true)
                const config = await getCloudinaryConfigByProjectId(projectId)

                if (config) {
                    setCloudinaryConfig(config)
                    setFormData({
                        cloudName: config.cloudName,
                        apiKey: config.apiKey,
                        apiSecret: config.apiSecret,
                        folderName: config.folderName,
                        webhookEnabled: config.webhookEnabled || false,
                    })
                } else {
                    // Set default folder name if no config exists
                    setFormData((prev) => ({
                        ...prev,
                        folderName: `project_${projectId}`,
                    }))
                }
            } catch (err) {
                console.error("Error fetching Cloudinary config:", err)
                setError("Failed to load Cloudinary configuration")
            } finally {
                setLoading(false)
            }
        }

        fetchCloudinaryConfig()
    }, [user, projectId])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }))
    }

    const handleSwitchChange = (checked: boolean) => {
        setFormData((prev) => ({
            ...prev,
            webhookEnabled: checked,
        }))
    }

    const handleSave = async () => {
        if (!user || !projectId) return

        try {
            setSaving(true)
            setError(null)

            // Validate required fields
            if (!formData.cloudName || !formData.apiKey || !formData.apiSecret) {
                setError("Cloud Name, API Key, and API Secret are required")
                return
            }

            // Create or update Cloudinary config
            if (cloudinaryConfig) {
                await updateCloudinaryConfig(cloudinaryConfig.id, user.uid, {
                    cloudName: formData.cloudName,
                    apiKey: formData.apiKey,
                    apiSecret: formData.apiSecret,
                    folderName: formData.folderName,
                    webhookEnabled: formData.webhookEnabled,
                    webhookUrl: formData.webhookEnabled ? webhookUrl : undefined,
                })
            } else {
                await createCloudinaryConfig(projectId, user.uid, {
                    cloudName: formData.cloudName,
                    apiKey: formData.apiKey,
                    apiSecret: formData.apiSecret,
                    folderName: formData.folderName,
                })
            }

            // Refresh the config
            const updatedConfig = await getCloudinaryConfigByProjectId(projectId)
            setCloudinaryConfig(updatedConfig)

            toast({
                title: "Cloudinary configuration saved",
                description: "Your Cloudinary settings have been updated successfully.",
            })
        } catch (err) {
            console.error("Error saving Cloudinary config:", err)
            setError("Failed to save Cloudinary configuration")
        } finally {
            setSaving(false)
        }
    }

    const testConnection = async () => {
        if (!user || !projectId) return

        try {
            setTesting(true)
            setTestResult(null)

            // Simple test to validate credentials
            const response = await fetch("https://api.cloudinary.com/v1_1/ping", {
                method: "GET",
                headers: {
                    Authorization: `Basic ${btoa(`${formData.apiKey}:${formData.apiSecret}`)}`,
                },
            })

            if (response.ok) {
                setTestResult({
                    success: true,
                    message: "Connection successful! Your Cloudinary credentials are valid.",
                })
            } else {
                setTestResult({
                    success: false,
                    message: "Connection failed. Please check your Cloudinary credentials.",
                })
            }
        } catch (err) {
            console.error("Error testing Cloudinary connection:", err)
            setTestResult({
                success: false,
                message: "Connection test failed. Please check your network connection and try again.",
            })
        } finally {
            setTesting(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <LoadingSpinner size="default" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <Tabs defaultValue="settings">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                    <TabsTrigger value="guide">Integration Guide</TabsTrigger>
                </TabsList>

                <TabsContent value="settings" className="space-y-4 mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Cloudinary Configuration</CardTitle>
                            <CardDescription>Configure Cloudinary for this project to enable image and media uploads</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {error && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Error</AlertTitle>
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            {testResult && (
                                <Alert variant={testResult.success ? "default" : "destructive"}>
                                    {testResult.success ? (
                                        <Check className="h-4 w-4 text-green-500" />
                                    ) : (
                                        <AlertCircle className="h-4 w-4" />
                                    )}
                                    <AlertTitle>{testResult.success ? "Success" : "Connection Failed"}</AlertTitle>
                                    <AlertDescription>{testResult.message}</AlertDescription>
                                </Alert>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="cloudName">Cloud Name</Label>
                                <Input
                                    id="cloudName"
                                    name="cloudName"
                                    value={formData.cloudName}
                                    onChange={handleInputChange}
                                    placeholder="your-cloud-name"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="apiKey">API Key</Label>
                                <Input
                                    id="apiKey"
                                    name="apiKey"
                                    value={formData.apiKey}
                                    onChange={handleInputChange}
                                    placeholder="123456789012345"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="apiSecret">API Secret</Label>
                                <Input
                                    id="apiSecret"
                                    name="apiSecret"
                                    value={formData.apiSecret}
                                    onChange={handleInputChange}
                                    type="password"
                                    placeholder="••••••••••••••••"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="folderName">Folder Name</Label>
                                <Input
                                    id="folderName"
                                    name="folderName"
                                    value={formData.folderName}
                                    onChange={handleInputChange}
                                    placeholder={`project_${projectId}`}
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    This folder will be used to organize your project's media in Cloudinary
                                </p>
                            </div>

                            <div className="flex items-center space-x-2 pt-4">
                                <Switch id="webhookEnabled" checked={formData.webhookEnabled} onCheckedChange={handleSwitchChange} />
                                <Label htmlFor="webhookEnabled">Enable Cloudinary Webhooks</Label>
                            </div>

                            {formData.webhookEnabled && (
                                <Alert>
                                    <Info className="h-4 w-4" />
                                    <AlertTitle>Webhook URL</AlertTitle>
                                    <AlertDescription>
                                        <p className="mb-2">Use this URL in your Cloudinary notification settings:</p>
                                        <code className="bg-muted p-2 rounded text-xs block overflow-x-auto">{webhookUrl}</code>
                                    </AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                        <CardFooter className="flex justify-between">
                            <Button
                                variant="outline"
                                onClick={testConnection}
                                disabled={testing || !formData.cloudName || !formData.apiKey || !formData.apiSecret}
                            >
                                {testing ? (
                                    <>
                                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                        Testing...
                                    </>
                                ) : (
                                    "Test Connection"
                                )}
                            </Button>
                            <Button onClick={handleSave} disabled={saving}>
                                {saving ? (
                                    <>
                                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    "Save Configuration"
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>

                <TabsContent value="guide">
                    <CloudinaryIntegrationGuide webhookUrl={webhookUrl} />
                </TabsContent>
            </Tabs>
        </div>
    )
}

