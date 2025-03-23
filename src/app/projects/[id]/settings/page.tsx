"use client"

import type React from "react"

import { GitHubWebhookGuide } from "@/components/integration/github-webhook-guide"
import { CloudinaryIntegrationGuide } from "@/components/integration/cloudinary-integration-guide"
import { PageHeader } from "@/components/layout/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/contexts/auth-context"
import { database } from "@/config/firebase"
import type { CloudinaryConfig, Project, WebhookConfig } from "@/types"
import { equalTo, get, orderByChild, push, query, ref, remove, set, update } from "firebase/database"
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Cloud,
  Eye,
  EyeOff,
  GitBranch,
  Key,
  Lock,
  Save,
  Settings,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function ProjectSettingsPage() {
  const [project, setProject] = useState<Project | null>(null)
  const [cloudinaryConfig, setCloudinaryConfig] = useState<CloudinaryConfig | null>(null)
  const [webhookConfig, setWebhookConfig] = useState<WebhookConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showIntegrationGuide, setShowIntegrationGuide] = useState(false)
  const { user } = useAuth()
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  // Project form state
  const [projectName, setProjectName] = useState("")
  const [projectDescription, setProjectDescription] = useState("")
  const [githubRepo, setGithubRepo] = useState("")

  // Cloudinary form state
  const [cloudName, setCloudName] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [apiSecret, setApiSecret] = useState("")
  const [folderName, setFolderName] = useState("")

  // Webhook form state
  const [webhookUrl, setWebhookUrl] = useState("")
  const [webhookType, setWebhookType] = useState("COMMIT")
  const [webhookSecret, setWebhookSecret] = useState("")
  const [showWebhookSecret, setShowWebhookSecret] = useState(false)

  useEffect(() => {
    const fetchProjectData = async () => {
      if (!user || !projectId) return

      try {
        // Fetch project details
        const projectRef = ref(database, `projects/${projectId}`)
        const projectSnapshot = await get(projectRef)

        if (!projectSnapshot.exists()) {
          router.push("/projects")
          return
        }

        const projectData = {
          id: projectId,
          ...projectSnapshot.val(),
        }

        // Check if user is an admin of this project
        if (
          !projectData.members ||
          !projectData.members[user.uid] ||
          !projectData.members[user.uid].roles.includes("admin")
        ) {
          router.push(`/projects/${projectId}`)
          return
        }

        setProject(projectData)
        setProjectName(projectData.name)
        setProjectDescription(projectData.description || "")
        setGithubRepo(projectData.githubRepo || "")

        // Fetch Cloudinary config
        const cloudinaryRef = ref(database, "projectCloudinary")
        const cloudinaryQuery = query(cloudinaryRef, orderByChild("projectId"), equalTo(projectId))
        const cloudinarySnapshot = await get(cloudinaryQuery)

        if (cloudinarySnapshot.exists()) {
          const cloudinaryData = cloudinarySnapshot.val()
          const configId = Object.keys(cloudinaryData)[0]
          const config = {
            id: configId,
            ...cloudinaryData[configId],
          }

          setCloudinaryConfig(config)
          setCloudName(config.cloudName)
          setApiKey(config.apiKey)
          setApiSecret(config.apiSecret)
          setFolderName(config.folderName)
        }

        // Fetch Webhook config
        const webhookRef = ref(database, "projectWebhook")
        const webhookQuery = query(webhookRef, orderByChild("projectId"), equalTo(projectId))
        const webhookSnapshot = await get(webhookQuery)

        if (webhookSnapshot.exists()) {
          const webhookData = webhookSnapshot.val()
          const configId = Object.keys(webhookData)[0]
          const config = {
            id: configId,
            ...webhookData[configId],
          }

          setWebhookConfig(config)
          setWebhookUrl(config.webhookUrl)
          setWebhookType(config.webhookType)
          setWebhookSecret(config.webhookSecret || "")
        }
      } catch (error) {
        console.error("Error fetching project data:", error)
        setError("Failed to load project data")
      } finally {
        setLoading(false)
      }
    }

    fetchProjectData()
  }, [user, projectId, router])

  const handleProjectUpdate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !project) return

    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      // Update project details
      const projectRef = ref(database, `projects/${projectId}`)

      const updates = {
        name: projectName.trim(),
        description: projectDescription.trim(),
        githubRepo: githubRepo.trim(),
      }

      await update(projectRef, updates)

      // Update local state
      setProject({
        ...project,
        ...updates,
      })

      setSuccess("Project settings updated successfully")
    } catch (error) {
      console.error("Error updating project:", error)
      setError("An error occurred while updating project settings")
    } finally {
      setIsSaving(false)
    }
  }

  const handleCloudinaryUpdate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !project) return

    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const now = new Date().toISOString()

      if (cloudinaryConfig) {
        // Update existing config
        const configRef = ref(database, `projectCloudinary/${cloudinaryConfig.id}`)

        const updates = {
          cloudName: cloudName.trim(),
          apiKey: apiKey.trim(),
          apiSecret: apiSecret.trim(),
          folderName: folderName.trim(),
          updatedAt: now,
          updatedBy: user.uid,
        }

        await update(configRef, updates)

        // Update local state
        setCloudinaryConfig({
          ...cloudinaryConfig,
          ...updates,
        })
      } else {
        // Create new config
        const newConfigRef = push(ref(database, "projectCloudinary"))

        const newConfig = {
          projectId,
          cloudName: cloudName.trim(),
          apiKey: apiKey.trim(),
          apiSecret: apiSecret.trim(),
          folderName: folderName.trim(),
          createdAt: now,
          updatedAt: now,
          createdBy: user.uid,
          updatedBy: user.uid,
        }

        await set(newConfigRef, newConfig)

        // Update local state
        setCloudinaryConfig({
          id: newConfigRef.key as string,
          ...newConfig,
        })
      }

      setSuccess("Cloudinary configuration updated successfully")
    } catch (error) {
      console.error("Error updating Cloudinary config:", error)
      setError("An error occurred while updating Cloudinary configuration")
    } finally {
      setIsSaving(false)
    }
  }

  const handleWebhookUpdate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !project) return

    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const now = new Date().toISOString()

      if (webhookConfig) {
        // Update existing config
        const configRef = ref(database, `projectWebhook/${webhookConfig.id}`)

        const updates = {
          webhookUrl: webhookUrl.trim(),
          webhookType: webhookType,
          webhookSecret: webhookSecret.trim(),
          updatedAt: now,
          updatedBy: user.uid,
        }

        await update(configRef, updates)

        // Update local state
        setWebhookConfig({
          ...webhookConfig,
          ...updates,
        })
      } else {
        // Create new config
        const newConfigRef = push(ref(database, "projectWebhook"))

        const newConfig = {
          projectId,
          webhookUrl: webhookUrl.trim(),
          webhookType: webhookType,
          webhookSecret: webhookSecret.trim(),
          createdAt: now,
          updatedAt: now,
          createdBy: user.uid,
          updatedBy: user.uid,
        }

        await set(newConfigRef, newConfig)

        // Update local state
        setWebhookConfig({
          id: newConfigRef.key as string,
          ...newConfig,
        })
      }

      setSuccess("Webhook configuration updated successfully")
      setShowIntegrationGuide(true)
    } catch (error) {
      console.error("Error updating webhook config:", error)
      setError("An error occurred while updating webhook configuration")
    } finally {
      setIsSaving(false)
    }
  }

  const generateWebhookSecret = () => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    let result = ""
    const charactersLength = characters.length
    for (let i = 0; i < 32; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength))
    }
    setWebhookSecret(result)
  }

  const handleDeleteProject = async () => {
    if (!user || !project) return

    try {
      // Delete project
      const projectRef = ref(database, `projects/${projectId}`)
      await remove(projectRef)

      // Delete Cloudinary config if exists
      if (cloudinaryConfig) {
        const cloudinaryRef = ref(database, `projectCloudinary/${cloudinaryConfig.id}`)
        await remove(cloudinaryRef)
      }

      // Delete Webhook config if exists
      if (webhookConfig) {
        const webhookRef = ref(database, `projectWebhook/${webhookConfig.id}`)
        await remove(webhookRef)
      }

      // Delete all tasks associated with this project
      const tasksRef = ref(database, "tasks")
      const tasksQuery = query(tasksRef, orderByChild("projectId"), equalTo(projectId))
      const tasksSnapshot = await get(tasksQuery)

      if (tasksSnapshot.exists()) {
        const tasksData = tasksSnapshot.val()

        for (const taskId in tasksData) {
          const taskRef = ref(database, `tasks/${taskId}`)
          await remove(taskRef)
        }
      }

      router.push("/projects")
    } catch (error) {
      console.error("Error deleting project:", error)
      setError("An error occurred while deleting the project")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Project not found</h2>
            <p className="text-muted-foreground mb-6">
              The project you're looking for doesn't exist or you don't have access to it.
            </p>
            <Link href="/projects">
              <Button className="rounded-lg shadow-sm">Go to Projects</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <Link
          href={`/projects/${projectId}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Project
        </Link>

        <PageHeader title="Project Settings" description={`Configure settings for ${project.name}`} />

        {error && (
          <Alert variant="destructive" className="mb-6 animate-fadeIn">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert
            variant="default"
            className="mb-6 bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300 border-green-200 dark:border-green-800/30 animate-fadeIn"
          >
            <CheckCircle className="h-5 w-5" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="cloudinary">Cloudinary</TabsTrigger>
            <TabsTrigger value="webhook">Webhook</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6 animate-in fade-in-50">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2 text-primary" />
                  Project Information
                </CardTitle>
                <CardDescription>Update your project's basic information</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProjectUpdate} className="space-y-5">
                  <div>
                    <label htmlFor="projectName" className="block text-sm font-medium mb-1">
                      Project Name <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="projectName"
                      type="text"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      className="w-full p-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                      disabled={isSaving}
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="projectDescription" className="block text-sm font-medium mb-1">
                      Description
                    </label>
                    <textarea
                      id="projectDescription"
                      rows={4}
                      value={projectDescription}
                      onChange={(e) => setProjectDescription(e.target.value)}
                      className="w-full p-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-y"
                      disabled={isSaving}
                      placeholder="Describe your project..."
                    />
                  </div>

                  <div>
                    <label htmlFor="githubRepo" className="block text-sm font-medium mb-1">
                      GitHub Repository URL (optional)
                    </label>
                    <div className="relative">
                      <GitBranch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        id="githubRepo"
                        type="text"
                        placeholder="https://github.com/username/repo"
                        value={githubRepo}
                        onChange={(e) => setGithubRepo(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                        disabled={isSaving}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={isSaving} className="rounded-lg shadow-sm">
                      <Save className="mr-2 h-4 w-4" />
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="border-destructive/50">
              <CardHeader className="bg-destructive/5 border-b border-destructive/20">
                <CardTitle className="flex items-center text-destructive">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Danger Zone
                </CardTitle>
                <CardDescription>Once you delete a project, there is no going back. Please be certain.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {!showDeleteConfirm ? (
                  <div>
                    <p className="text-muted-foreground mb-4">
                      Deleting this project will remove all associated tasks, comments, and configurations.
                    </p>
                    <Button
                      variant="destructive"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="rounded-lg shadow-sm"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Project
                    </Button>
                  </div>
                ) : (
                  <div>
                    <div className="bg-destructive/10 p-4 rounded-lg mb-4 flex items-start">
                      <AlertTriangle className="h-5 w-5 text-destructive mr-2 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-destructive">Are you absolutely sure?</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          This action cannot be undone. This will permanently delete the project, all its tasks, and
                          remove all associated data.
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-4">
                      <Button
                        variant="outline"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="rounded-lg shadow-sm"
                      >
                        Cancel
                      </Button>
                      <Button variant="destructive" onClick={handleDeleteProject} className="rounded-lg shadow-sm">
                        Yes, Delete Project
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cloudinary" className="space-y-6 animate-in fade-in-50">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Cloud className="h-5 w-5 mr-2 text-primary" />
                  Cloudinary Configuration
                </CardTitle>
                <CardDescription>
                  Configure Cloudinary settings for this project to store media files separately.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCloudinaryUpdate} className="space-y-5">
                  <div>
                    <label htmlFor="cloudName" className="block text-sm font-medium mb-1">
                      Cloud Name <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="cloudName"
                      type="text"
                      value={cloudName}
                      onChange={(e) => setCloudName(e.target.value)}
                      className="w-full p-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                      disabled={isSaving}
                      required
                      placeholder="your-cloud-name"
                    />
                  </div>

                  <div>
                    <label htmlFor="apiKey" className="block text-sm font-medium mb-1">
                      API Key <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="apiKey"
                      type="text"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="w-full p-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                      disabled={isSaving}
                      required
                      placeholder="your-api-key"
                    />
                  </div>

                  <div>
                    <label htmlFor="apiSecret" className="block text-sm font-medium mb-1">
                      API Secret <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="apiSecret"
                      type="password"
                      value={apiSecret}
                      onChange={(e) => setApiSecret(e.target.value)}
                      className="w-full p-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                      disabled={isSaving}
                      required
                      placeholder="••••••••••••••••"
                    />
                  </div>

                  <div>
                    <label htmlFor="folderName" className="block text-sm font-medium mb-1">
                      Folder Name <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="folderName"
                      type="text"
                      value={folderName}
                      onChange={(e) => setFolderName(e.target.value)}
                      className="w-full p-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                      disabled={isSaving}
                      required
                      placeholder="project-folder"
                    />
                  </div>

                  <div className="bg-muted/30 p-4 rounded-lg">
                    <h4 className="text-sm font-medium mb-2">Webhook Configuration</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      To receive notifications when media is uploaded, updated, or deleted, add this webhook URL to your
                      Cloudinary notification settings:
                    </p>
                    <div className="bg-muted p-3 rounded-md font-mono text-xs break-all">
                      {`${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/cloudinary`}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={isSaving} className="rounded-lg shadow-sm">
                      <Save className="mr-2 h-4 w-4" />
                      {isSaving ? "Saving..." : "Save Configuration"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {cloudinaryConfig && (
              <CloudinaryIntegrationGuide webhookUrl={`${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/cloudinary`} />
            )}
          </TabsContent>

          <TabsContent value="webhook" className="space-y-6 animate-in fade-in-50">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <GitBranch className="h-5 w-5 mr-2 text-primary" />
                  GitHub Webhook
                </CardTitle>
                <CardDescription>
                  Configure a webhook to receive notifications from GitHub when events occur.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleWebhookUpdate} className="space-y-5">
                  <div>
                    <label htmlFor="webhookUrl" className="block text-sm font-medium mb-1">
                      Webhook URL <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="webhookUrl"
                      type="text"
                      placeholder="https://api.example.com/webhook"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      className="w-full p-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                      disabled={isSaving}
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="webhookType" className="block text-sm font-medium mb-1">
                      Event Type <span className="text-destructive">*</span>
                    </label>
                    <select
                      id="webhookType"
                      value={webhookType}
                      onChange={(e) => setWebhookType(e.target.value)}
                      className="w-full p-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors appearance-none"
                      disabled={isSaving}
                    >
                      <option value="COMMIT">Commit</option>
                      <option value="PULL_REQUEST">Pull Request</option>
                      <option value="ISSUE">Issue</option>
                      <option value="RELEASE">Release</option>
                      <option value="ALL">All Events</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="webhookSecret" className="block text-sm font-medium mb-1">
                      Webhook Secret
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        id="webhookSecret"
                        type={showWebhookSecret ? "text" : "password"}
                        value={webhookSecret}
                        onChange={(e) => setWebhookSecret(e.target.value)}
                        className="w-full pl-10 pr-10 py-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                        disabled={isSaving}
                        placeholder="Optional: For verifying webhook payloads"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                        aria-label={showWebhookSecret ? "Hide secret" : "Show secret"}
                      >
                        {showWebhookSecret ? <Eye size={18} /> : <EyeOff size={18} />}
                      </button>
                    </div>
                    <div className="flex justify-end mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={generateWebhookSecret}
                        className="text-xs"
                      >
                        <Key className="h-3 w-3 mr-1" /> Generate Secret
                      </Button>
                    </div>
                  </div>

                  <div className="bg-muted/30 p-4 rounded-lg">
                    <h4 className="text-sm font-medium mb-2">GitHub Webhook Setup</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      To set up a webhook in your GitHub repository, go to Settings &gt; Webhooks &gt; Add webhook and
                      use this URL:
                    </p>
                    <div className="bg-muted p-3 rounded-md font-mono text-xs break-all">
                      {`${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/github`}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={isSaving} className="rounded-lg shadow-sm">
                      <Save className="mr-2 h-4 w-4" />
                      {isSaving ? "Saving..." : "Save Webhook"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {(webhookConfig || showIntegrationGuide) && (
              <GitHubWebhookGuide
                webhookUrl={`${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/github`}
                webhookSecret={webhookSecret}
                repoUrl={githubRepo}
              />
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

