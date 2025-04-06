"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
  List,
  Plus,
  Search,
  Settings,
  Users,
  Webhook,
  X,
  ChartAreaIcon
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import React, { type JSX, useEffect, useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
  SheetFooter,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

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
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)

  const isMobile = useMediaQuery("(max-width: 768px)")
  const isSmallScreen = useMediaQuery("(max-width: 1024px)")
  const isSmallHeight = useMediaQuery("(max-height: 700px)")

  // Function to clear all filters
  const clearAllFilters = () => {
    setStatusFilter(null)
    setTypeFilter(null)
    setMemberFilter(null)
    setPriorityFilter(null)
  }

  // Count active filters
  const activeFilterCount = [statusFilter, typeFilter, memberFilter, priorityFilter].filter(Boolean).length

  // Đảm bảo URL ảnh của người dùng hiện tại cũng được lấy đúng
  useEffect(() => {
    if (user && users[user.uid]) {
      // Cập nhật thông tin người dùng hiện tại nếu cần
      const currentUserData = users[user.uid]
      if (!currentUserData.photoURL && user.photoURL) {
        setUsers((prev) => ({
          ...prev,
          [user.uid]: {
            ...prev[user.uid],
            photoURL: user.photoURL,
          },
        }))
      }
    }
  }, [user, users])

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

  // Helper function to get user photo URL
  const getUserPhotoURL = (userId: string) => {
    const userData = users[userId]
    if (!userData) return undefined

    // Check for different possible property names for the photo URL
    return userData.photoURL || userData.photoUrl || userData.avatarUrl || userData.avatar || undefined
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

  // Filter components for desktop
  const DesktopFilters = () => (
    <div className="hidden md:flex gap-2 flex-wrap">
      {/* Status Filter */}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="h-10 rounded-lg shadow-sm">
            <div className="flex items-center gap-2">
              <span>{statusFilter ? getStatusLabel(statusFilter) : "Status"}</span>
              {statusFilter && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  <X
                    className="h-3 w-3"
                    onClick={(e) => {
                      e.stopPropagation()
                      setStatusFilter(null)
                    }}
                  />
                </Badge>
              )}
            </div>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px] flex flex-col max-h-[80vh]">
          <DialogHeader className="sticky top-0 bg-background z-10 pb-2">
            <DialogTitle>Filter by Status</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4">
            <RadioGroup value={statusFilter || ""} onValueChange={(value) => setStatusFilter(value || null)}>
              <div className="flex items-center space-x-2 py-1">
                <RadioGroupItem value="" id="status-all" />
                <Label htmlFor="status-all">All Statuses</Label>
              </div>
              <div className="flex items-center space-x-2 py-1">
                <RadioGroupItem value="todo" id="status-todo" />
                <Label htmlFor="status-todo">To Do</Label>
              </div>
              <div className="flex items-center space-x-2 py-1">
                <RadioGroupItem value="in_progress" id="status-in-progress" />
                <Label htmlFor="status-in-progress">In Progress</Label>
              </div>
              <div className="flex items-center space-x-2 py-1">
                <RadioGroupItem value="resolved" id="status-resolved" />
                <Label htmlFor="status-resolved">Resolved</Label>
              </div>
              <div className="flex items-center space-x-2 py-1">
                <RadioGroupItem value="closed" id="status-closed" />
                <Label htmlFor="status-closed">Closed</Label>
              </div>
            </RadioGroup>
          </div>
        </DialogContent>
      </Dialog>

      {/* Type Filter */}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="h-10 rounded-lg shadow-sm">
            <div className="flex items-center gap-2">
              <span>{typeFilter ? typeFilter.charAt(0).toUpperCase() + typeFilter.slice(1) : "Type"}</span>
              {typeFilter && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  <X
                    className="h-3 w-3"
                    onClick={(e) => {
                      e.stopPropagation()
                      setTypeFilter(null)
                    }}
                  />
                </Badge>
              )}
            </div>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px] flex flex-col max-h-[80vh]">
          <DialogHeader className="sticky top-0 bg-background z-10 pb-2">
            <DialogTitle>Filter by Type</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4">
            <RadioGroup value={typeFilter || ""} onValueChange={(value) => setTypeFilter(value || null)}>
              <div className="flex items-center space-x-2 py-1">
                <RadioGroupItem value="" id="type-all" />
                <Label htmlFor="type-all">All Types</Label>
              </div>
              <div className="flex items-center space-x-2 py-1">
                <RadioGroupItem value="bug" id="type-bug" />
                <Label htmlFor="type-bug">Bug</Label>
              </div>
              <div className="flex items-center space-x-2 py-1">
                <RadioGroupItem value="feature" id="type-feature" />
                <Label htmlFor="type-feature">Feature</Label>
              </div>
              <div className="flex items-center space-x-2 py-1">
                <RadioGroupItem value="enhancement" id="type-enhancement" />
                <Label htmlFor="type-enhancement">Enhancement</Label>
              </div>
              <div className="flex items-center space-x-2 py-1">
                <RadioGroupItem value="documentation" id="type-documentation" />
                <Label htmlFor="type-documentation">Documentation</Label>
              </div>
            </RadioGroup>
          </div>
        </DialogContent>
      </Dialog>

      {/* Member Filter */}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="h-10 rounded-lg shadow-sm">
            <div className="flex items-center gap-2">
              <span>{memberFilter ? users[memberFilter]?.displayName || "Member" : "Assigned To"}</span>
              {memberFilter && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  <X
                    className="h-3 w-3"
                    onClick={(e) => {
                      e.stopPropagation()
                      setMemberFilter(null)
                    }}
                  />
                </Badge>
              )}
            </div>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px] flex flex-col max-h-[80vh]">
          <DialogHeader className="sticky top-0 bg-background z-10 pb-2">
            <DialogTitle>Filter by Member</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4">
            <RadioGroup value={memberFilter || ""} onValueChange={(value) => setMemberFilter(value || null)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="" id="member-all" />
                <Label htmlFor="member-all">All Members</Label>
              </div>
              {Object.values(users).map((member) => (
                <div key={member.id} className="flex items-center space-x-2 py-1">
                  <RadioGroupItem value={member.id} id={`member-${member.id}`} />
                  <Label htmlFor={`member-${member.id}`} className="flex items-center gap-2">
                    <Avatar className="h-6 w-6 flex-shrink-0">
                      <AvatarImage src={getUserPhotoURL(member.id)} alt={member.displayName || "User"} />
                      <AvatarFallback>{member.displayName?.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>
                    <span className="truncate max-w-[200px]">{member.displayName || "Unknown"}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </DialogContent>
      </Dialog>

      {/* Priority Filter */}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="h-10 rounded-lg shadow-sm">
            <div className="flex items-center gap-2">
              <span>
                {priorityFilter ? priorityFilter.charAt(0).toUpperCase() + priorityFilter.slice(1) : "Priority"}
              </span>
              {priorityFilter && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  <X
                    className="h-3 w-3"
                    onClick={(e) => {
                      e.stopPropagation()
                      setPriorityFilter(null)
                    }}
                  />
                </Badge>
              )}
            </div>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px] flex flex-col max-h-[80vh]">
          <DialogHeader className="sticky top-0 bg-background z-10 pb-2">
            <DialogTitle>Filter by Priority</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4">
            <RadioGroup value={priorityFilter || ""} onValueChange={(value) => setPriorityFilter(value || null)}>
              <div className="flex items-center space-x-2 py-1">
                <RadioGroupItem value="" id="priority-all" />
                <Label htmlFor="priority-all">All Priorities</Label>
              </div>
              <div className="flex items-center space-x-2 py-1">
                <RadioGroupItem value="low" id="priority-low" />
                <Label htmlFor="priority-low">Low</Label>
              </div>
              <div className="flex items-center space-x-2 py-1">
                <RadioGroupItem value="medium" id="priority-medium" />
                <Label htmlFor="priority-medium">Medium</Label>
              </div>
              <div className="flex items-center space-x-2 py-1">
                <RadioGroupItem value="high" id="priority-high" />
                <Label htmlFor="priority-high">High</Label>
              </div>
              <div className="flex items-center space-x-2 py-1">
                <RadioGroupItem value="critical" id="priority-critical" />
                <Label htmlFor="priority-critical">Critical</Label>
              </div>
            </RadioGroup>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-4 md:py-8">
        <PageHeader
          title={project.name}
          description={isSmallHeight && isMobile ? undefined : project.description || "No description provided"}
        >
          <div className="flex gap-2">
            {!isMobile && (
              <>
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
                  <Link href={`/projects/${projectId}/dashboard`}>
                    <Button variant="outline" size="sm" className="rounded-lg shadow-sm">
                      <ChartAreaIcon className="h-4 w-4 mr-2" /> Dashboard
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
              </>
            )}
            {isMobile && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-lg shadow-sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Project Options</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <Link href={`/projects/${projectId}/members`}>
                      <Button variant="outline" className="w-full justify-start">
                        <Users className="h-4 w-4 mr-2" /> Members
                      </Button>
                    </Link>
                    {userRoles.includes("admin") && (
                      <Link href={`/projects/${projectId}/settings`}>
                        <Button variant="outline" className="w-full justify-start">
                          <Settings className="h-4 w-4 mr-2" /> Settings
                        </Button>
                      </Link>
                    )}
                    {userRoles.includes("admin") && (
                      <Link href={`/projects/${projectId}/webhooks`}>
                        <Button variant="outline" className="w-full justify-start">
                          <Webhook className="h-4 w-4 mr-2" /> Webhook Log
                        </Button>
                      </Link>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </PageHeader>

        {!isSmallHeight && (
          <div className="mb-4 md:mb-6">
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
        )}

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 md:mb-6 gap-2 md:gap-4">
          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Mobile Filter Button */}
            <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="md:hidden h-10 rounded-lg shadow-sm flex-1">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  {activeFilterCount > 0 && <Badge className="ml-2">{activeFilterCount}</Badge>}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] sm:w-[400px] p-0 flex flex-col">
                <SheetHeader className="px-4 py-3 border-b border-border sticky top-0 bg-background z-10">
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto">
                  <div className="py-4 px-4 space-y-6">
                    {/* Status Filter */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium">Status</h3>
                      <RadioGroup value={statusFilter || ""} onValueChange={(value) => setStatusFilter(value || null)}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="" id="m-status-all" />
                          <Label htmlFor="m-status-all">All Statuses</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="todo" id="m-status-todo" />
                          <Label htmlFor="m-status-todo">To Do</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="in_progress" id="m-status-in-progress" />
                          <Label htmlFor="m-status-in-progress">In Progress</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="resolved" id="m-status-resolved" />
                          <Label htmlFor="m-status-resolved">Resolved</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="closed" id="m-status-closed" />
                          <Label htmlFor="m-status-closed">Closed</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <Separator />

                    {/* Type Filter */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium">Type</h3>
                      <RadioGroup value={typeFilter || ""} onValueChange={(value) => setTypeFilter(value || null)}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="" id="m-type-all" />
                          <Label htmlFor="m-type-all">All Types</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="bug" id="m-type-bug" />
                          <Label htmlFor="m-type-bug">Bug</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="feature" id="m-type-feature" />
                          <Label htmlFor="m-type-feature">Feature</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="enhancement" id="m-type-enhancement" />
                          <Label htmlFor="m-type-enhancement">Enhancement</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="documentation" id="m-type-documentation" />
                          <Label htmlFor="m-type-documentation">Documentation</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <Separator />

                    {/* Priority Filter */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium">Priority</h3>
                      <RadioGroup
                        value={priorityFilter || ""}
                        onValueChange={(value) => setPriorityFilter(value || null)}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="" id="m-priority-all" />
                          <Label htmlFor="m-priority-all">All Priorities</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="low" id="m-priority-low" />
                          <Label htmlFor="m-priority-low">Low</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="medium" id="m-priority-medium" />
                          <Label htmlFor="m-priority-medium">Medium</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="high" id="m-priority-high" />
                          <Label htmlFor="m-priority-high">High</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="critical" id="m-priority-critical" />
                          <Label htmlFor="m-priority-critical">Critical</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <Separator />

                    {/* Member Filter */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium">Assigned To</h3>
                      <RadioGroup value={memberFilter || ""} onValueChange={(value) => setMemberFilter(value || null)}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="" id="m-member-all" />
                          <Label htmlFor="m-member-all">All Members</Label>
                        </div>
                        {Object.values(users).map((member) => (
                          <div key={member.id} className="flex items-center space-x-2">
                            <RadioGroupItem value={member.id} id={`m-member-${member.id}`} />
                            <Label htmlFor={`m-member-${member.id}`} className="flex items-center gap-2">
                              <Avatar className="h-6 w-6 flex-shrink-0">
                                <AvatarImage src={getUserPhotoURL(member.id)} alt={member.displayName || "User"} />
                                <AvatarFallback>{member.displayName?.charAt(0) || "U"}</AvatarFallback>
                              </Avatar>
                              <span className="truncate max-w-[180px]">{member.displayName || "Unknown"}</span>
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  </div>
                </div>
                <SheetFooter className="p-4 border-t border-border sticky bottom-0 bg-background z-10">
                  <div className="flex flex-row gap-2 w-full">
                    <Button variant="outline" onClick={clearAllFilters} className="flex-1">
                      Clear All
                    </Button>
                    <SheetClose asChild>
                      <Button className="flex-1">Apply Filters</Button>
                    </SheetClose>
                  </div>
                </SheetFooter>
              </SheetContent>
            </Sheet>

            {/* Desktop Filters */}
            <DesktopFilters />

            {/* View Mode Toggle */}
            <div className="flex items-center border border-border rounded-lg overflow-hidden shadow-sm h-10 ml-auto md:ml-0">
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
          </div>

          {/* Search and Create Task */}
          <div className="flex flex-col sm:flex-row w-full md:w-auto gap-2 mt-2 md:mt-0">
            <div className="relative w-full md:w-[250px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search tasks..."
                className="w-full h-10 pl-10 pr-4 py-2 rounded-lg border border-input shadow-sm bg-background focus:ring-2 focus:ring-primary/10 focus:border-primary transition-colors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
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

        {/* Active Filters Summary */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {statusFilter && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Status: {getStatusLabel(statusFilter)}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setStatusFilter(null)} />
              </Badge>
            )}
            {typeFilter && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Type: {typeFilter.charAt(0).toUpperCase() + typeFilter.slice(1)}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setTypeFilter(null)} />
              </Badge>
            )}
            {priorityFilter && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Priority: {priorityFilter.charAt(0).toUpperCase() + priorityFilter.slice(1)}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setPriorityFilter(null)} />
              </Badge>
            )}
            {memberFilter && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Assigned to: {users[memberFilter]?.displayName || "Unknown"}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setMemberFilter(null)} />
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-7 px-2 text-xs">
              Clear all
            </Button>
          </div>
        )}

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
              <table className="w-full table-auto">
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
                    // Thay thế phần renderTaskRow trong hàm map của paginatedData với đoạn code sau:

                    const renderTaskRow = (task: Task, level = 0): JSX.Element => {
                      // Giới hạn tối đa 4 cấp phân cấp
                      const currentLevel = Math.min(level, 3)
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
                                {/* Tạo một div cố định cho mỗi cấp phân cấp */}
                                <div
                                  className="flex items-center"
                                  style={{ width: `${currentLevel * 24}px`, minWidth: `${currentLevel * 24}px` }}
                                >
                                  {currentLevel > 0 && (
                                    <div className="h-full w-full flex items-center justify-end pr-2">
                                      <div className="w-0.5 h-6 bg-border/50"></div>
                                    </div>
                                  )}
                                </div>

                                {/* Nút mở rộng/thu gọn */}
                                <div className="w-6 flex-shrink-0">
                                  {hasChildren ? (
                                    <button
                                      onClick={(e) => {
                                        if (!autoExpand) {
                                          e.preventDefault()
                                          toggleTaskExpansion(task.id)
                                        }
                                      }}
                                      className="focus:outline-none"
                                      aria-label={isExpanded ? "Collapse" : "Expand"}
                                    >
                                      {isExpanded ? (
                                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                      )}
                                    </button>
                                  ) : null}
                                </div>

                                {/* Tiêu đề task */}
                                <Link
                                  href={`/projects/${projectId}/tasks/${task.id}`}
                                  className="hover:text-primary transition-colors block truncate max-w-[180px] ml-2"
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
                            childTasks.map((childTask) => renderTaskRow(childTask, currentLevel + 1))}
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

