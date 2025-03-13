"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ref, get, query, orderByChild, equalTo } from "firebase/database"
import { database } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import {
  Plus,
  Users,
  Settings,
  ChevronDown,
  Search,
  Filter,
  Calendar,
  ArrowUpDown,
  List,
  Grid,
  Layers,
} from "lucide-react"
import { formatDate, getStatusColor, getPriorityColor, getTypeColor, getStatusLabel } from "@/lib/utils"
import Header from "@/components/layout/header"
import { PageHeader } from "@/components/layout/page-header"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { EmptyState } from "@/components/ui/empty-state"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import type { Project, Task, User } from "@/types"

export default function ProjectDetailPage() {
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<Record<string, User>>({})
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [showStatusFilter, setShowStatusFilter] = useState(false)
  const [showTypeFilter, setShowTypeFilter] = useState(false)
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  const { user } = useAuth()
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

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

        // Check if user is a member of this project
        if (!projectData.members || !projectData.members[user.uid]) {
          router.push("/projects")
          return
        }

        setProject(projectData)

        // Fetch tasks for this project
        const tasksRef = ref(database, "tasks")
        const tasksQuery = query(tasksRef, orderByChild("projectId"), equalTo(projectId))
        const tasksSnapshot = await get(tasksQuery)

        if (tasksSnapshot.exists()) {
          const tasksData = tasksSnapshot.val()
          const tasksList = Object.entries(tasksData).map(([id, data]: [string, any]) => ({
            id,
            ...data,
          }))

          setTasks(tasksList)
        }

        // Fetch all users who are members of this project
        const userIds = Object.keys(projectData.members)
        const usersData: Record<string, User> = {}

        for (const userId of userIds) {
          const userRef = ref(database, `users/${userId}`)
          const userSnapshot = await get(userRef)

          if (userSnapshot.exists()) {
            usersData[userId] = {
              id: userId,
              ...userSnapshot.val(),
            }
          }
        }

        setUsers(usersData)
      } catch (error) {
        console.error("Error fetching project data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProjectData()
  }, [user, projectId, router])

  const filteredTasks = tasks.filter((task) => {
    // Apply status filter
    if (statusFilter && task.status !== statusFilter) {
      return false
    }

    // Apply type filter
    if (typeFilter && task.type !== typeFilter) {
      return false
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return task.title.toLowerCase().includes(query) || task.description.toLowerCase().includes(query)
    }

    return true
  })

  const userRoles = user && project?.members && project.members[user.uid] ? project.members[user.uid].roles : []

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <EmptyState
            icon={<Settings className="h-8 w-8 text-primary" />}
            title="Project not found"
            description="The project you're looking for doesn't exist or you don't have access to it."
            action={
              <Link href="/projects">
                <Button className="rounded-lg">Go to Projects</Button>
              </Link>
            }
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <PageHeader title={project.name} description={project.description || "No description provided"}>
          <div className="flex gap-2">
            <Link href={`/projects/${projectId}/members`}>
              <Button variant="outline" size="sm" className="rounded-lg shadow-sm">
                <Users className="h-4 w-4 mr-2" /> Members
              </Button>
            </Link>
            {userRoles.includes("admin") && (
              <Link href={`/projects/${projectId}/settings`}>
                <Button variant="outline" size="sm" className="rounded-lg shadow-sm">
                  <Settings className="h-4 w-4 mr-2" /> Settings
                </Button>
              </Link>
            )}
          </div>
        </PageHeader>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <div className="relative">
              <Button
                variant="outline"
                className="w-full sm:w-auto rounded-lg shadow-sm"
                onClick={() => {
                  setShowStatusFilter(!showStatusFilter)
                  setShowTypeFilter(false)
                }}
              >
                <Filter className="h-4 w-4 mr-2" />
                {statusFilter ? getStatusLabel(statusFilter) : "Status"} <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
              {showStatusFilter && (
                <Card className="absolute top-full left-0 mt-1 w-48 z-10 animate-fadeIn shadow-modern">
                  <div className="p-1">
                    <button
                      className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                      onClick={() => {
                        setStatusFilter(null)
                        setShowStatusFilter(false)
                      }}
                    >
                      All Statuses
                    </button>
                    <button
                      className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                      onClick={() => {
                        setStatusFilter("todo")
                        setShowStatusFilter(false)
                      }}
                    >
                      To Do
                    </button>
                    <button
                      className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                      onClick={() => {
                        setStatusFilter("in_progress")
                        setShowStatusFilter(false)
                      }}
                    >
                      In Progress
                    </button>
                    <button
                      className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                      onClick={() => {
                        setStatusFilter("resolved")
                        setShowStatusFilter(false)
                      }}
                    >
                      Resolved
                    </button>
                    <button
                      className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                      onClick={() => {
                        setStatusFilter("closed")
                        setShowStatusFilter(false)
                      }}
                    >
                      Closed
                    </button>
                  </div>
                </Card>
              )}
            </div>

            <div className="relative">
              <Button
                variant="outline"
                className="w-full sm:w-auto rounded-lg shadow-sm"
                onClick={() => {
                  setShowTypeFilter(!showTypeFilter)
                  setShowStatusFilter(false)
                }}
              >
                <Layers className="h-4 w-4 mr-2" />
                {typeFilter ? typeFilter.charAt(0).toUpperCase() + typeFilter.slice(1) : "Type"}{" "}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
              {showTypeFilter && (
                <Card className="absolute top-full left-0 mt-1 w-48 z-10 animate-fadeIn shadow-modern">
                  <div className="p-1">
                    <button
                      className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                      onClick={() => {
                        setTypeFilter(null)
                        setShowTypeFilter(false)
                      }}
                    >
                      All Types
                    </button>
                    <button
                      className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                      onClick={() => {
                        setTypeFilter("bug")
                        setShowTypeFilter(false)
                      }}
                    >
                      Bug
                    </button>
                    <button
                      className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                      onClick={() => {
                        setTypeFilter("feature")
                        setShowTypeFilter(false)
                      }}
                    >
                      Feature
                    </button>
                    <button
                      className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                      onClick={() => {
                        setTypeFilter("enhancement")
                        setShowTypeFilter(false)
                      }}
                    >
                      Enhancement
                    </button>
                    <button
                      className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                      onClick={() => {
                        setTypeFilter("documentation")
                        setShowTypeFilter(false)
                      }}
                    >
                      Documentation
                    </button>
                  </div>
                </Card>
              )}
            </div>

            <div className="relative flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg shadow-sm bg-background focus:ring-2 focus:ring-primary/10 transition-colors"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center border border-border/10 rounded-lg overflow-hidden shadow-sm">
              <button
                className={`p-2 ${viewMode === "list" ? "bg-muted" : "hover:bg-muted/50"} transition-colors`}
                onClick={() => setViewMode("list")}
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                className={`p-2 ${viewMode === "grid" ? "bg-muted" : "hover:bg-muted/50"} transition-colors`}
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
              >
                <Grid className="h-4 w-4" />
              </button>
            </div>

            <Link href={`/projects/${projectId}/tasks/create`}>
              <Button className="rounded-lg shadow-sm">
                <Plus className="mr-2 h-4 w-4" /> Create Task
              </Button>
            </Link>
          </div>
        </div>

        {filteredTasks.length === 0 ? (
          <EmptyState
            icon={<Plus className="h-8 w-8 text-primary" />}
            title="No tasks found"
            description={
              tasks.length === 0 ? "This project doesn't have any tasks yet" : "No tasks match your current filters"
            }
            action={
              <Link href={`/projects/${projectId}/tasks/create`}>
                <Button className="rounded-lg">
                  <Plus className="mr-2 h-4 w-4" /> Create Task
                </Button>
              </Link>
            }
          />
        ) : viewMode === "list" ? (
          <Card className="shadow-modern animate-fadeIn overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full table-vercel">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      <div className="flex items-center">
                        Title <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Priority</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Assigned To</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Due Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/10">
                  {filteredTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/projects/${projectId}/tasks/${task.id}`}
                          className="hover:text-primary transition-colors"
                        >
                          {task.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={getTypeColor(task.type)}>
                          {task.type.charAt(0).toUpperCase() + task.type.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={getStatusColor(task.status)}>{getStatusLabel(task.status)}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={getPriorityColor(task.priority)}>
                          {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex -space-x-2">
                          {task.assignedTo && task.assignedTo.length > 0 ? (
                            task.assignedTo.map((userId) => (
                              <div
                                key={userId}
                                className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium ring-2 ring-background"
                                title={users[userId]?.displayName || "Unknown user"}
                              >
                                {users[userId]?.displayName?.charAt(0) || "?"}
                              </div>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">Unassigned</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {task.dueDate ? (
                          <div className="flex items-center">
                            <Calendar className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                            {formatDate(task.dueDate)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTasks.map((task) => (
              <Link key={task.id} href={`/projects/${projectId}/tasks/${task.id}`}>
                <Card className="h-full shadow-modern card-hover transition-all animate-fadeIn">
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium line-clamp-1">{task.title}</h3>
                      <Badge className={getStatusColor(task.status)}>{getStatusLabel(task.status)}</Badge>
                    </div>

                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {task.description || "No description provided"}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge className={getTypeColor(task.type)}>
                        {task.type.charAt(0).toUpperCase() + task.type.slice(1)}
                      </Badge>

                      <Badge className={getPriorityColor(task.priority)}>
                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                      </Badge>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex -space-x-2">
                        {task.assignedTo && task.assignedTo.length > 0 ? (
                          task.assignedTo.map((userId) => (
                            <div
                              key={userId}
                              className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium ring-2 ring-background"
                              title={users[userId]?.displayName || "Unknown user"}
                            >
                              {users[userId]?.displayName?.charAt(0) || "?"}
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">Unassigned</span>
                        )}
                      </div>

                      {task.dueDate && (
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDate(task.dueDate)}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

