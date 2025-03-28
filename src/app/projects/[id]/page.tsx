"use client"

import { ImportExportToolbar } from "@/components/excel/import-export-toolbar"
import { PageHeader } from "@/components/layout/page-header"
import { AssigneeGroup } from "@/components/ui/assignee-group"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { database } from "@/config/firebase"
import { useAuth } from "@/contexts/auth-context"
import { useMediaQuery } from "@/hooks/use-media-query"
import type { Project, Task, User } from "@/types"
import { formatDate, getPriorityColor, getStatusColor, getStatusLabel, getTypeColor } from "@/utils/utils"
import { equalTo, get, orderByChild, query, ref } from "firebase/database"
import {
    Calendar,
    ChevronDown,
    ChevronRight,
    Clock,
    Filter,
    Grid,
    Layers,
    List,
    Plus,
    Search,
    Settings,
    Users,
    Webhook
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import React, { type JSX, useEffect, useState } from "react"

export default function ProjectDetailPage() {
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<Record<string, User>>({})
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [memberFilter, setMemberFilter] = useState<string | null>(null)
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 9
  const { user } = useAuth()
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({})

  const isMobile = useMediaQuery("(max-width: 768px)")
  const isSmallScreen = useMediaQuery("(max-width: 1024px)")

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

        // Check if user is a member of the project
        if (!projectData.members || !projectData.members[user.uid]) {
          router.push("/projects")
          return
        }

        setProject(projectData)

        // Fetch tasks for the project
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

        // Fetch all users of the project
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

  // Reset page when filter or view mode changes
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, typeFilter, memberFilter, priorityFilter, searchQuery, viewMode])

  // Filter tasks by status, type, member, priority and search (title, description, tags)
  const filteredTasks = tasks.filter((task) => {
    if (statusFilter && task.status !== statusFilter) return false
    if (typeFilter && task.type !== typeFilter) return false
    if (memberFilter && (!task.assignedTo || !task.assignedTo.includes(memberFilter))) return false
    if (priorityFilter && task.priority !== priorityFilter) return false
    if (searchQuery.trim() !== "") {
      const queryLower = searchQuery.trim().toLowerCase()
      if (
        !task.title.toLowerCase().includes(queryLower) &&
        !task.description.toLowerCase().includes(queryLower) &&
        !(task.tags && task.tags.some((tag) => tag.toLowerCase().includes(queryLower)))
      ) {
        return false
      }
    }
    return true
  })

  const userRoles = user && project?.members && project.members[user.uid] ? project.members[user.uid].roles : []

  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }))
  }

  // Group tasks by parent (used for list view)
  const groupTasksByParent = () => {
    const taskMap: Record<string, Task> = {}
    const rootTasks: Task[] = []

    filteredTasks.forEach((task) => {
      taskMap[task.id] = task
    })
    filteredTasks.forEach((task) => {
      if (!task.parentTaskId || !taskMap[task.parentTaskId]) {
        rootTasks.push(task)
      }
    })
    return { taskMap, rootTasks }
  }

  const findChildTasks = (taskId: string) => {
    return filteredTasks.filter((task) => task.parentTaskId === taskId)
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
          <EmptyState
            icon={<Settings className="h-8 w-8 text-primary" />}
            title="Project not found"
            description="The project you're looking for doesn't exist or you don't have access to it."
            action={
              <Link href="/projects">
                <Button className="rounded-lg shadow-sm">Go to Projects</Button>
              </Link>
            }
          />
        </div>
      </div>
    )
  }

  const { rootTasks } = groupTasksByParent()
  const autoExpand = searchQuery.trim() !== ""

  // Pagination: for list view paginate by rootTasks, for grid view paginate by filteredTasks
  let paginatedData: Task[] = []
  let totalPages = 0
  let totalItems = 0

  if (viewMode === "list") {
    totalItems = rootTasks.length
    totalPages = Math.ceil(totalItems / itemsPerPage)
    paginatedData = rootTasks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  } else {
    totalItems = filteredTasks.length
    totalPages = Math.ceil(totalItems / itemsPerPage)
    paginatedData = filteredTasks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  }

  // Calculate pagination info
  const startItem = Math.min(totalItems, (currentPage - 1) * itemsPerPage + 1)
  const endItem = Math.min(totalItems, currentPage * itemsPerPage)

  return (
    <div className="min-h-screen bg-background">
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
            {userRoles.includes("admin") && (
              <Link href={`/projects/${projectId}/webhooks`}>
                <Button variant="outline" size="sm" className="rounded-lg shadow-sm">
                  <Webhook className="h-4 w-4 mr-2" /> Webhook Log
                </Button>
              </Link>
            )}
          </div>
        </PageHeader>

        <div className="mb-6">
          <ImportExportToolbar
            projectId={projectId}
            tasks={tasks}
            userId={user?.uid || ""}
            onImportComplete={() => {
              // Refresh tasks when import is complete
              const fetchProjectData = async () => {
                if (!user || !projectId) return

                try {
                  setLoading(true)
                  // Fetch tasks for the project
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
                } catch (error) {
                  console.error("Error fetching tasks:", error)
                } finally {
                  setLoading(false)
                }
              }

              fetchProjectData()
            }}
          />
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:flex gap-2 w-full md:w-auto">
            {/* Status Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full h-10 rounded-lg shadow-sm justify-between">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Filter className="h-4 w-4 flex-shrink-0" />
                    <span className="block truncate">{statusFilter ? getStatusLabel(statusFilter) : "Status"}</span>
                  </div>
                  <ChevronDown className="h-4 w-4 flex-shrink-0 ml-2" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-1">
                <button
                  className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                  onClick={() => setStatusFilter(null)}
                >
                  All Statuses
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                  onClick={() => setStatusFilter("todo")}
                >
                  To Do
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                  onClick={() => setStatusFilter("in_progress")}
                >
                  In Progress
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                  onClick={() => setStatusFilter("resolved")}
                >
                  Resolved
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                  onClick={() => setStatusFilter("closed")}
                >
                  Closed
                </button>
              </PopoverContent>
            </Popover>

            {/* Type Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full h-10 rounded-lg shadow-sm justify-between">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Layers className="h-4 w-4 flex-shrink-0" />
                    <span className="block truncate">
                      {typeFilter ? typeFilter.charAt(0).toUpperCase() + typeFilter.slice(1) : "Type"}
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 flex-shrink-0 ml-2" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-1">
                <button
                  className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                  onClick={() => setTypeFilter(null)}
                >
                  All Types
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                  onClick={() => setTypeFilter("bug")}
                >
                  Bug
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                  onClick={() => setTypeFilter("feature")}
                >
                  Feature
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                  onClick={() => setTypeFilter("enhancement")}
                >
                  Enhancement
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                  onClick={() => setTypeFilter("documentation")}
                >
                  Documentation
                </button>
              </PopoverContent>
            </Popover>

            {/* Member Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full h-10 rounded-lg shadow-sm justify-between">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Users className="h-4 w-4 flex-shrink-0" />
                    <span className="block truncate">
                      {memberFilter ? users[memberFilter]?.displayName || "Member" : "Assigned To"}
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 flex-shrink-0 ml-2" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-1">
                <button
                  className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                  onClick={() => setMemberFilter(null)}
                >
                  All Members
                </button>
                {Object.values(users).map((member) => (
                  <button
                    key={member.id}
                    className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                    onClick={() => setMemberFilter(member.id)}
                  >
                    {member.displayName || "Unknown"}
                  </button>
                ))}
              </PopoverContent>
            </Popover>

            {/* Priority Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full h-10 rounded-lg shadow-sm justify-between">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="block truncate">
                      {priorityFilter ? priorityFilter.charAt(0).toUpperCase() + priorityFilter.slice(1) : "Priority"}
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 flex-shrink-0 ml-2" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-1">
                <button
                  className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                  onClick={() => setPriorityFilter(null)}
                >
                  All Priorities
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                  onClick={() => setPriorityFilter("low")}
                >
                  Low
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                  onClick={() => setPriorityFilter("medium")}
                >
                  Medium
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                  onClick={() => setPriorityFilter("high")}
                >
                  High
                </button>
              </PopoverContent>
            </Popover>
          </div>

          {/* Search input - make it full width on mobile */}
          <div className="relative w-full md:w-auto md:flex-1 md:min-w-[200px] mb-4 md:mb-0">
            <div className="relative h-10">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search tasks..."
                className="w-full h-10 pl-10 pr-4 py-2 rounded-lg border border-input shadow-sm bg-background focus:ring-2 focus:ring-primary/10 focus:border-primary transition-colors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center border border-border rounded-lg overflow-hidden shadow-sm h-10">
              <button
                className={`p-2 h-full ${viewMode === "list" ? "bg-muted" : "hover:bg-muted/50"} transition-colors`}
                onClick={() => setViewMode("list")}
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                className={`p-2 h-full ${viewMode === "grid" ? "bg-muted" : "hover:bg-muted/50"} transition-colors`}
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
              >
                <Grid className="h-4 w-4" />
              </button>
            </div>

            <Link href={`/projects/${projectId}/tasks/create`} className="w-full sm:w-auto">
              <Button className="rounded-lg shadow-sm h-10 w-full">
                <Plus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Create Task</span>
                <span className="sm:hidden">Create</span>
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
                <Button className="rounded-lg shadow-sm">
                  <Plus className="mr-2 h-4 w-4" /> Create Task
                </Button>
              </Link>
            }
          />
        ) : viewMode === "list" ? (
          <Card className="shadow-sm border-border/60 animate-fadeIn overflow-hidden">
            <div className="overflow-x-auto">
              <table className={`w-full table-auto ${isMobile ? "min-w-[600px]" : "min-w-[900px]"}`}>
                <thead>
                  <tr className="bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium w-[250px] max-w-[250px]">Title</th>
                    <th className="px-4 py-3 text-left text-sm font-medium w-[120px]">Type</th>
                    <th className="px-4 py-3 text-left text-sm font-medium w-[140px]">Status</th>
                    {!isMobile && <th className="px-4 py-3 text-left text-sm font-medium w-[120px]">Priority</th>}
                    <th className="px-4 py-3 text-left text-sm font-medium w-[140px]">Assigned</th>
                    {!isSmallScreen && <th className="px-4 py-3 text-left text-sm font-medium w-[150px]">Due Date</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/10">
                  {paginatedData.map((task) => {
                    const renderTaskRow = (task: Task, level = 0): JSX.Element => {
                      const childTasks = findChildTasks(task.id)
                      const hasChildren = childTasks.length > 0
                      const isExpanded = autoExpand || expandedTasks[task.id]

                      // Get assigned users
                      const assignedUsers =
                        task.assignedTo && task.assignedTo.length > 0
                          ? task.assignedTo.map((userId) => users[userId]).filter(Boolean)
                          : []

                      return (
                        <React.Fragment key={task.id}>
                          <tr className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 w-[250px] max-w-[250px]">
                              <div className="flex items-center">
                                {Array.from({ length: level }).map((_, index) => (
                                  <div key={index} className="flex items-center justify-center w-6">
                                    <div className="w-0.5 h-6 bg-border/50"></div>
                                  </div>
                                ))}
                                {hasChildren ? (
                                  <button
                                    onClick={(e) => {
                                      if (!autoExpand) {
                                        e.preventDefault()
                                        toggleTaskExpansion(task.id)
                                      }
                                    }}
                                    className="mr-2 focus:outline-none flex-shrink-0"
                                    aria-label={isExpanded ? "Collapse" : "Expand"}
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    )}
                                  </button>
                                ) : (
                                  <div className="w-6 mr-2"></div>
                                )}
                                <Link
                                  href={`/projects/${projectId}/tasks/${task.id}`}
                                  className="hover:text-primary transition-colors block truncate max-w-[180px]"
                                  title={task.title}
                                >
                                  {task.title}
                                </Link>
                              </div>
                            </td>
                            <td className="px-4 py-3 w-[120px]">
                              <Badge
                                variant="type"
                                className={`${getTypeColor(task.type)} whitespace-nowrap`}
                                animation="fade"
                              >
                                {task.type.charAt(0).toUpperCase() + task.type.slice(1)}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 w-[140px]">
                              <Badge
                                variant="status"
                                className={`${getStatusColor(task.status)} whitespace-nowrap`}
                                animation={task.status === "todo" || task.status === "in_progress" ? "pulse" : "fade"}
                              >
                                {getStatusLabel(task.status)}
                              </Badge>
                            </td>
                            {!isMobile && (
                              <td className="px-4 py-3 w-[120px]">
                                <Badge
                                  variant="priority"
                                  className={`${getPriorityColor(task.priority)} whitespace-nowrap`}
                                  animation={
                                    task.priority === "high" || task.priority === "critical" ? "pulse" : "fade"
                                  }
                                >
                                  {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                </Badge>
                              </td>
                            )}
                            <td className="px-4 py-3 w-[140px]">
                              <AssigneeGroup
                                users={assignedUsers}
                                maxVisible={isMobile ? 2 : 3}
                                size={isMobile ? "sm" : "md"}
                              />
                            </td>
                            {!isSmallScreen && (
                              <td className="px-4 py-3 text-sm w-[150px]">
                                {task.dueDate ? (
                                  <div className="flex items-center">
                                    <Calendar className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                                    <span>{formatDate(task.dueDate)}</span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </td>
                            )}
                          </tr>
                          {hasChildren &&
                            isExpanded &&
                            childTasks.map((childTask) => renderTaskRow(childTask, level + 1))}
                        </React.Fragment>
                      )
                    }
                    return renderTaskRow(task)
                  })}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="py-4 px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
                <div className="text-sm text-muted-foreground">
                  Showing {startItem} to {endItem} of {totalItems} tasks
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={currentPage === 1 ? undefined : () => setCurrentPage(currentPage - 1)}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                    {currentPage > 2 && (
                      <>
                        <PaginationItem className="hidden sm:inline-block">
                          <PaginationLink onClick={() => setCurrentPage(1)}>1</PaginationLink>
                        </PaginationItem>
                        {currentPage > 3 && (
                          <PaginationItem className="hidden sm:inline-block">
                            <PaginationEllipsis />
                          </PaginationItem>
                        )}
                      </>
                    )}
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((page) => {
                        if (isMobile) {
                          // On mobile, show only current page and adjacent pages
                          return page >= currentPage - 1 && page <= currentPage + 1
                        }
                        // On desktop, show more pages
                        return page >= currentPage - 2 && page <= currentPage + 2
                      })
                      .map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink isActive={page === currentPage} onClick={() => setCurrentPage(page)}>
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                    {currentPage < totalPages - 1 && (
                      <>
                        {currentPage < totalPages - 2 && (
                          <PaginationItem className="hidden sm:inline-block">
                            <PaginationEllipsis />
                          </PaginationItem>
                        )}
                        <PaginationItem className="hidden sm:inline-block">
                          <PaginationLink onClick={() => setCurrentPage(totalPages)}>{totalPages}</PaginationLink>
                        </PaginationItem>
                      </>
                    )}
                    <PaginationItem>
                      <PaginationNext
                        onClick={currentPage < totalPages ? () => setCurrentPage(currentPage + 1) : undefined}
                        className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedData.map((task) => {
                // Get assigned users
                const assignedUsers =
                  task.assignedTo && task.assignedTo.length > 0
                    ? task.assignedTo.map((userId) => users[userId]).filter(Boolean)
                    : []

                return (
                  <Link key={task.id} href={`/projects/${projectId}/tasks/${task.id}`}>
                    <Card className="h-full shadow-sm hover:shadow-md border-border/60 hover:border-border transition-all duration-200 animate-fadeIn">
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2 gap-2">
                          <h3 className="font-medium truncate max-w-[65%]" title={task.title}>
                            {task.title}
                          </h3>
                          <Badge
                            variant="status"
                            className={`${getStatusColor(task.status)} whitespace-nowrap flex-shrink-0`}
                            animation={task.status === "todo" || task.status === "in_progress" ? "pulse" : "fade"}
                          >
                            {getStatusLabel(task.status)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {task.description || "No description provided"}
                        </p>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <Badge
                            variant="type"
                            className={`${getTypeColor(task.type)} whitespace-nowrap`}
                            animation="fade"
                          >
                            {task.type.charAt(0).toUpperCase() + task.type.slice(1)}
                          </Badge>
                          <Badge
                            variant="priority"
                            className={`${getPriorityColor(task.priority)} whitespace-nowrap`}
                            animation={task.priority === "high" || task.priority === "critical" ? "pulse" : "fade"}
                          >
                            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <AssigneeGroup users={assignedUsers} maxVisible={2} size="sm" />
                          <div className="flex items-center gap-2">
                            {task.dueDate && (
                              <div className="flex items-center text-xs text-muted-foreground whitespace-nowrap">
                                <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
                                {formatDate(task.dueDate)}
                              </div>
                            )}
                            {task.percentDone !== undefined && (
                              <div className="flex items-center">
                                <Clock className="h-3 w-3 text-muted-foreground mr-1 flex-shrink-0" />
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {task.percentDone}%
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                )
              })}
            </div>
            {totalPages > 1 && (
              <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-2">
                <div className="text-sm text-muted-foreground">
                  Showing {startItem} to {endItem} of {totalItems} tasks
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={currentPage === 1 ? undefined : () => setCurrentPage(currentPage - 1)}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                    {currentPage > 3 && (
                      <>
                        <PaginationItem>
                          <PaginationLink onClick={() => setCurrentPage(1)}>1</PaginationLink>
                        </PaginationItem>
                        <PaginationEllipsis />
                      </>
                    )}
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((page) => page >= currentPage - 2 && page <= currentPage + 2)
                      .map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink isActive={page === currentPage} onClick={() => setCurrentPage(page)}>
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                    {currentPage < totalPages - 2 && (
                      <>
                        <PaginationEllipsis />
                        <PaginationItem>
                          <PaginationLink onClick={() => setCurrentPage(totalPages)}>{totalPages}</PaginationLink>
                        </PaginationItem>
                      </>
                    )}
                    <PaginationItem>
                      <PaginationNext
                        onClick={currentPage < totalPages ? () => setCurrentPage(currentPage + 1) : undefined}
                        className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

