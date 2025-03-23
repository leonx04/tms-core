"use client"

import { PageHeader } from "@/components/layout/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/contexts/auth-context"
import { database } from "@/config/firebase"
import { formatDate, formatDateTime } from "@/utils/utils"
import { get, ref } from "firebase/database"
import {
    AlertCircle,
    ArrowLeft,
    Calendar,
    Cloud,
    Code,
    ExternalLink,
    FileText,
    GitBranch,
    GitCommit,
    GitPullRequest,
    Info,
    MessageSquare,
    RefreshCw,
    Bell,
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function ProjectWebhooksPage() {
    const [project, setProject] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState("github")
    const [githubEvents, setGithubEvents] = useState<any[]>([])
    const [cloudinaryEvents, setCloudinaryEvents] = useState<any[]>([])
    const [refreshing, setRefreshing] = useState(false)
    const { user } = useAuth()
    const params = useParams()
    const router = useRouter()
    const projectId = params.id as string

    useEffect(() => {
        const fetchData = async () => {
            if (!user || !projectId) return

            try {
                setLoading(true)
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

                // Check if user is a member of this project
                if (!projectData.members || !projectData.members[user.uid]) {
                    router.push("/projects")
                    return
                }

                setProject(projectData)

                // Fetch GitHub webhook events
                await fetchGithubEvents(projectId)

                // Fetch Cloudinary webhook events
                await fetchCloudinaryEvents(projectId)
            } catch (error) {
                console.error("Error fetching data:", error)
                setError("Failed to load webhook data. Please try again.")
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [user, projectId, router])

    const fetchGithubEvents = async (projectId: string) => {
        try {
            // Fetch all events first
            const eventsRef = ref(database, `projectEvents/${projectId}`)
            const eventsSnapshot = await get(eventsRef)

            let events = []
            if (eventsSnapshot.exists()) {
                events = Object.entries(eventsSnapshot.val()).map(([id, data]: [string, any]) => ({
                    id,
                    ...data,
                }))
            }

            // Fetch commits
            const commitsRef = ref(database, `projectCommits/${projectId}`)
            const commitsSnapshot = await get(commitsRef)

            let commits = []
            if (commitsSnapshot.exists()) {
                commits = Object.entries(commitsSnapshot.val()).map(([id, data]: [string, any]) => ({
                    id,
                    type: "commit",
                    ...data,
                }))
            }

            // Fetch pull requests
            const pullRequestsRef = ref(database, `projectPullRequests/${projectId}`)
            const pullRequestsSnapshot = await get(pullRequestsRef)

            let pullRequests = []
            if (pullRequestsSnapshot.exists()) {
                pullRequests = Object.entries(pullRequestsSnapshot.val()).map(([id, data]: [string, any]) => ({
                    id,
                    type: "pull_request",
                    ...data,
                }))
            }

            // Fetch issues
            const issuesRef = ref(database, `projectIssues/${projectId}`)
            const issuesSnapshot = await get(issuesRef)

            let issues = []
            if (issuesSnapshot.exists()) {
                issues = Object.entries(issuesSnapshot.val()).map(([id, data]: [string, any]) => ({
                    id,
                    type: "issue",
                    ...data,
                }))
            }

            // Combine all events and sort by timestamp (newest first)
            const allEvents = [...events, ...commits, ...pullRequests, ...issues].sort((a, b) => {
                const dateA = new Date(a.timestamp || a.updated_at || a.created_at)
                const dateB = new Date(b.timestamp || b.updated_at || b.created_at)
                return dateB.getTime() - dateA.getTime()
            })

            setGithubEvents(allEvents)
        } catch (error) {
            console.error("Error fetching GitHub events:", error)
            throw error
        }
    }

    const fetchCloudinaryEvents = async (projectId: string) => {
        try {
            const eventsRef = ref(database, `projectCloudinaryEvents/${projectId}`)
            const eventsSnapshot = await get(eventsRef)

            if (eventsSnapshot.exists()) {
                const events = Object.entries(eventsSnapshot.val()).map(([id, data]: [string, any]) => ({
                    id,
                    ...data,
                }))

                // Sort by timestamp (newest first)
                events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

                setCloudinaryEvents(events)
            } else {
                setCloudinaryEvents([])
            }
        } catch (error) {
            console.error("Error fetching Cloudinary events:", error)
            throw error
        }
    }

    const handleRefresh = async () => {
        if (refreshing) return

        setRefreshing(true)
        try {
            if (activeTab === "github") {
                await fetchGithubEvents(projectId)
            } else {
                await fetchCloudinaryEvents(projectId)
            }
        } catch (error) {
            console.error("Error refreshing data:", error)
            setError("Failed to refresh data. Please try again.")
        } finally {
            setRefreshing(false)
        }
    }

    const getEventIcon = (type: string) => {
        switch (type) {
            case "commit":
                return <GitCommit className="h-5 w-5 text-blue-500" />
            case "pull_request":
                return <GitPullRequest className="h-5 w-5 text-purple-500" />
            case "issue":
                return <MessageSquare className="h-5 w-5 text-green-500" />
            case "push":
                return <GitBranch className="h-5 w-5 text-blue-500" />
            case "ping":
                return <Bell className="h-5 w-5 text-yellow-500" />
            default:
                return <GitBranch className="h-5 w-5 text-gray-500" />
        }
    }

    const getCloudinaryEventIcon = (event: string) => {
        switch (event) {
            case "upload":
                return <FileText className="h-5 w-5 text-green-500" />
            case "update":
                return <Code className="h-5 w-5 text-blue-500" />
            case "delete":
                return <AlertCircle className="h-5 w-5 text-red-500" />
            default:
                return <Cloud className="h-5 w-5 text-gray-500" />
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

                <PageHeader title="Webhook Events" description={`View webhook events for ${project.name}`}>
                    <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg shadow-sm"
                        onClick={handleRefresh}
                        disabled={refreshing}
                    >
                        <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                </PageHeader>

                {error && (
                    <Alert variant="destructive" className="mb-6 animate-fadeIn">
                        <AlertCircle className="h-5 w-5" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="grid grid-cols-2 w-full max-w-md">
                        <TabsTrigger value="github">GitHub Events</TabsTrigger>
                        <TabsTrigger value="cloudinary">Cloudinary Events</TabsTrigger>
                    </TabsList>

                    <TabsContent value="github" className="animate-in fade-in-50">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <GitBranch className="h-5 w-5 mr-2 text-primary" />
                                    GitHub Webhook Events
                                </CardTitle>
                                <CardDescription>
                                    View commits, pull requests, and issues from your connected GitHub repository.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {!project.githubRepo ? (
                                    <Alert className="mb-6">
                                        <Info className="h-4 w-4" />
                                        <AlertTitle>No GitHub repository connected</AlertTitle>
                                        <AlertDescription>
                                            <p className="mb-2">
                                                Connect a GitHub repository in the project settings to start receiving webhook events.
                                            </p>
                                            <Link href={`/projects/${projectId}/settings`}>
                                                <Button variant="outline" size="sm" className="rounded-lg">
                                                    Go to Settings
                                                </Button>
                                            </Link>
                                        </AlertDescription>
                                    </Alert>
                                ) : githubEvents.length === 0 ? (
                                    <div className="text-center py-12 border border-dashed border-border rounded-lg">
                                        <GitBranch className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                        <h3 className="text-lg font-medium mb-2">No GitHub events yet</h3>
                                        <p className="text-muted-foreground mb-4">
                                            Once you set up the webhook, events from your GitHub repository will appear here.
                                        </p>
                                        <Link href={`/projects/${projectId}/settings`} className="inline-block">
                                            <Button variant="outline" className="rounded-lg">
                                                Configure Webhook
                                            </Button>
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {githubEvents.map((event) => (
                                            <div
                                                key={`${event.type}-${event.id}`}
                                                className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="mt-1">{getEventIcon(event.type)}</div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Badge
                                                                variant="outline"
                                                                className={`capitalize ${event.type === "commit" || event.type === "push"
                                                                        ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/30"
                                                                        : event.type === "pull_request"
                                                                            ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800/30"
                                                                            : event.type === "ping"
                                                                                ? "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800/30"
                                                                                : "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800/30"
                                                                    }`}
                                                            >
                                                                {event.type.replace("_", " ")}
                                                            </Badge>
                                                            {event.action && (
                                                                <Badge variant="outline" className="capitalize">
                                                                    {event.action}
                                                                </Badge>
                                                            )}
                                                            {event.state && (
                                                                <Badge
                                                                    variant="outline"
                                                                    className={`capitalize ${event.state === "open"
                                                                            ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800/30"
                                                                            : "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800/30"
                                                                        }`}
                                                                >
                                                                    {event.state}
                                                                </Badge>
                                                            )}
                                                        </div>

                                                        {event.type === "commit" ? (
                                                            <>
                                                                <h3 className="font-medium text-foreground break-words">
                                                                    {event.message?.split("\n")[0] || "No commit message"}
                                                                </h3>
                                                                <div className="flex items-center text-sm text-muted-foreground mt-1">
                                                                    <span className="font-mono">{event.id.substring(0, 7)}</span>
                                                                    <span className="mx-2">•</span>
                                                                    <span>{event.author?.name || "Unknown author"}</span>
                                                                    <span className="mx-2">•</span>
                                                                    <Calendar className="h-3.5 w-3.5 mr-1" />
                                                                    <span>{formatDate(event.timestamp)}</span>
                                                                </div>
                                                            </>
                                                        ) : event.type === "ping" ? (
                                                            <>
                                                                <h3 className="font-medium text-foreground break-words">
                                                                    Webhook successfully configured
                                                                </h3>
                                                                <div className="flex items-center text-sm text-muted-foreground mt-1">
                                                                    <span>{event.repository?.name || "Unknown repository"}</span>
                                                                    <span className="mx-2">•</span>
                                                                    <span>{event.sender?.login || "Unknown user"}</span>
                                                                    <span className="mx-2">•</span>
                                                                    <Calendar className="h-3.5 w-3.5 mr-1" />
                                                                    <span>{formatDate(event.timestamp)}</span>
                                                                </div>
                                                                {event.zen && (
                                                                    <p className="text-sm text-muted-foreground mt-2 italic">"{event.zen}"</p>
                                                                )}
                                                            </>
                                                        ) : event.type === "push" ? (
                                                            <>
                                                                <h3 className="font-medium text-foreground break-words">
                                                                    {event.commits_count} commit{event.commits_count !== 1 ? "s" : ""} to{" "}
                                                                    {event.ref.replace("refs/heads/", "")}
                                                                </h3>
                                                                <div className="flex items-center text-sm text-muted-foreground mt-1">
                                                                    <span>{event.repository?.name || "Unknown repository"}</span>
                                                                    <span className="mx-2">•</span>
                                                                    <span>{event.sender?.login || "Unknown user"}</span>
                                                                    <span className="mx-2">•</span>
                                                                    <Calendar className="h-3.5 w-3.5 mr-1" />
                                                                    <span>{formatDate(event.timestamp)}</span>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <h3 className="font-medium text-foreground break-words">
                                                                    {event.title || `#${event.id}`}
                                                                </h3>
                                                                <div className="flex items-center text-sm text-muted-foreground mt-1">
                                                                    <span>
                                                                        {event.type === "pull_request"
                                                                            ? `${event.base?.ref || "base"} ← ${event.head?.ref || "head"}`
                                                                            : `#${event.id}`}
                                                                    </span>
                                                                    <span className="mx-2">•</span>
                                                                    <span>{event.user?.login || "Unknown user"}</span>
                                                                    <span className="mx-2">•</span>
                                                                    <Calendar className="h-3.5 w-3.5 mr-1" />
                                                                    <span>{formatDate(event.updated_at || event.created_at)}</span>
                                                                </div>
                                                            </>
                                                        )}

                                                        {event.body && (
                                                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{event.body}</p>
                                                        )}

                                                        {event.url && (
                                                            <a
                                                                href={event.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-primary hover:underline text-sm mt-2 inline-flex items-center"
                                                            >
                                                                View on GitHub
                                                                <ExternalLink className="h-3 w-3 ml-1" />
                                                            </a>
                                                        )}

                                                        {event.html_url && (
                                                            <a
                                                                href={event.html_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-primary hover:underline text-sm mt-2 inline-flex items-center"
                                                            >
                                                                View on GitHub
                                                                <ExternalLink className="h-3 w-3 ml-1" />
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="cloudinary" className="animate-in fade-in-50">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Cloud className="h-5 w-5 mr-2 text-primary" />
                                    Cloudinary Webhook Events
                                </CardTitle>
                                <CardDescription>View media upload, update, and deletion events from Cloudinary.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {cloudinaryEvents.length === 0 ? (
                                    <div className="text-center py-12 border border-dashed border-border rounded-lg">
                                        <Cloud className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                        <h3 className="text-lg font-medium mb-2">No Cloudinary events yet</h3>
                                        <p className="text-muted-foreground mb-4">
                                            Once you set up the webhook, events from Cloudinary will appear here.
                                        </p>
                                        <Link href={`/projects/${projectId}/settings`} className="inline-block">
                                            <Button variant="outline" className="rounded-lg">
                                                Configure Cloudinary
                                            </Button>
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {cloudinaryEvents.map((event) => (
                                            <div
                                                key={event.id}
                                                className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="mt-1">{getCloudinaryEventIcon(event.event)}</div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Badge
                                                                variant="outline"
                                                                className={`capitalize ${event.event === "upload"
                                                                        ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800/30"
                                                                        : event.event === "update"
                                                                            ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/30"
                                                                            : "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800/30"
                                                                    }`}
                                                            >
                                                                {event.event}
                                                            </Badge>
                                                            <Badge variant="outline">{event.resource?.type || "unknown"}</Badge>
                                                        </div>

                                                        <h3 className="font-medium text-foreground break-words">
                                                            {event.resource?.publicId || "Unknown resource"}
                                                        </h3>

                                                        <div className="flex items-center text-sm text-muted-foreground mt-1">
                                                            <Calendar className="h-3.5 w-3.5 mr-1" />
                                                            <span>{formatDateTime(event.timestamp)}</span>
                                                        </div>

                                                        {event.resource?.url && (
                                                            <div className="mt-2">
                                                                <a
                                                                    href={event.resource.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-primary hover:underline text-sm inline-flex items-center"
                                                                >
                                                                    View Resource
                                                                    <ExternalLink className="h-3 w-3 ml-1" />
                                                                </a>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    )
}

