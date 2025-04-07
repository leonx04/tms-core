"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { format, subDays, isAfter, parseISO, startOfDay, endOfDay } from "date-fns"
import { vi } from "date-fns/locale"
import { database } from "@/config/firebase"
import { ref, get, query, orderByChild, equalTo } from "firebase/database"
import { useAuth } from "@/contexts/auth-context"
import { useMediaQuery } from "@/hooks/use-media-query"
import { PageHeader } from "@/components/layout/page-header"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  ArrowLeft,
  BarChart3,
  Clock,
  Download,
  Filter,
  GitCommit,
  GitPullRequest,
  Info,
  RefreshCw,
  User,
} from "lucide-react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts"
import type { Project, Task, TaskHistory, Comment, Notification, User as UserType } from "@/types"

// Define event types
const EVENT_TYPES = {
  COMMIT: "Commit",
  TASK_CREATE: "Task Creation",
  TASK_UPDATE: "Task Update",
  TASK_COMMENT: "Task Comment",
  NOTIFICATION: "Notification",
}

// Define time ranges
const TIME_RANGES = {
  TODAY: "Today",
  YESTERDAY: "Yesterday",
  LAST_7_DAYS: "Last 7 Days",
  LAST_30_DAYS: "Last 30 Days",
  CUSTOM: "Custom",
}

// Define chart colors
const CHART_COLORS = {
  commits: "#8884d8",
  taskCreates: "#82ca9d",
  taskUpdates: "#ffc658",
  comments: "#ff8042",
  notifications: "#0088fe",
  read: "#82ca9d",
  unread: "#ff8042",
}

// Define event data type
type Event = {
  id: string
  type: string
  userId: string
  timestamp: string
  projectId: string
  data: any
}

// Define stats data type
type Stats = {
  commits: number
  taskCreates: number
  taskUpdates: number
  comments: number
  notifications: number
  notificationsRead: number
  notificationsUnread: number
}

export default function ProjectDashboardPage() {
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [timeRange, setTimeRange] = useState("LAST_7_DAYS")
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 7),
    to: new Date(),
  })
  const [eventTypeFilter, setEventTypeFilter] = useState<string | null>(null)
  const [userFilter, setUserFilter] = useState<string | null>(null)
  const [users, setUsers] = useState<Record<string, UserType>>({})
  const [tasks, setTasks] = useState<Task[]>([])
  const [taskHistory, setTaskHistory] = useState<TaskHistory[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [commits, setCommits] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState("overview")

  const { user } = useAuth()
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const isMobile = useMediaQuery("(max-width: 768px)")

  // Calculate date range based on selection
  useEffect(() => {
    if (timeRange === "CUSTOM") return // Do not change if custom

    const now = new Date()
    let fromDate: Date

    switch (timeRange) {
      case "TODAY":
        fromDate = startOfDay(now)
        break
      case "YESTERDAY":
        fromDate = startOfDay(subDays(now, 1))
        break
      case "LAST_7_DAYS":
        fromDate = subDays(now, 7)
        break
      case "LAST_30_DAYS":
        fromDate = subDays(now, 30)
        break
      default:
        fromDate = subDays(now, 7)
    }

    setDateRange({ from: fromDate, to: now })
  }, [timeRange])

  // Add this at the beginning of the component to ensure loading state is cleared if component unmounts
  useEffect(() => {
    return () => {
      setLoading(false)
    }
  }, [])

  // Fetch project data and related data
  useEffect(() => {
    const fetchProjectData = async () => {
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
        } as Project

        // Check if user is a member of this project
        if (!projectData.members || !projectData.members[user.uid]) {
          router.push("/projects")
          return
        }

        setProject(projectData)

        // Fetch all users who are members of this project
        const userIds = Object.keys(projectData.members)
        const usersData: Record<string, UserType> = {}

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

        // Fetch tasks for the project
        const tasksRef = ref(database, "tasks")
        const tasksQuery = query(tasksRef, orderByChild("projectId"), equalTo(projectId))
        const tasksSnapshot = await get(tasksQuery)

        let tasksList: Task[] = []
        if (tasksSnapshot.exists()) {
          const tasksData = tasksSnapshot.val()
          tasksList = Object.entries(tasksData).map(([id, data]: [string, any]) => ({
            id,
            ...data,
          }))
          setTasks(tasksList)
        }

        // Fetch task history
        const historyRef = ref(database, "taskHistory")
        const historySnapshot = await get(historyRef)

        if (historySnapshot.exists()) {
          const historyData = historySnapshot.val()
          const historyList = Object.entries(historyData)
            .map(([id, data]: [string, any]) => ({
              id,
              ...data,
            }))
            .filter((history) => {
              // Filter history items related to this project's tasks
              const task = tasksList.find((t) => t.id === history.taskId)
              return task && task.projectId === projectId
            })
          setTaskHistory(historyList)
        }

        // Fetch comments
        const commentsRef = ref(database, "comments")
        const commentsSnapshot = await get(commentsRef)

        if (commentsSnapshot.exists()) {
          const commentsData = commentsSnapshot.val()
          const commentsList = Object.entries(commentsData)
            .map(([id, data]: [string, any]) => ({
              id,
              ...data,
            }))
            .filter((comment) => {
              // Filter comments related to this project's tasks
              const task = tasksList.find((t) => t.id === comment.taskId)
              return task && task.projectId === projectId
            })
          setComments(commentsList)
        }

        // Fetch notifications
        const notificationsRef = ref(database, "notifications")
        const notificationsSnapshot = await get(notificationsRef)

        if (notificationsSnapshot.exists()) {
          const notificationsData = notificationsSnapshot.val()
          const notificationsList = Object.entries(notificationsData)
            .map(([id, data]: [string, any]) => ({
              id,
              ...data,
            }))
            .filter((notification) => {
              // Filter notifications related to this project
              return notification.referenceId === projectId || tasksList.some((t) => t.id === notification.referenceId)
            })
          setNotifications(notificationsList)
        }

        // Simulate commit data (in a real app, this would come from GitHub API or webhook data)
        // For demo purposes, we'll generate some random commit data
        const simulatedCommits = generateSimulatedCommits(projectId, userIds, 30)
        setCommits(simulatedCommits)
      } catch (error) {
        console.error("Error fetching project data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProjectData()
  }, [user, projectId, router]) // Remove 'tasks' from the dependency array

  // Function to generate simulated commit data for demo
  const generateSimulatedCommits = (projectId: string, userIds: string[], days: number) => {
    const commits = []
    const now = new Date()

    for (let i = 0; i < days; i++) {
      const date = subDays(now, i)
      const numCommits = Math.floor(Math.random() * 5) + 1 // 1-5 commits per day

      for (let j = 0; j < numCommits; j++) {
        const hours = Math.floor(Math.random() * 24)
        const minutes = Math.floor(Math.random() * 60)
        const timestamp = new Date(date)
        timestamp.setHours(hours, minutes)

        commits.push({
          id: `commit-${i}-${j}`,
          projectId,
          userId: userIds[Math.floor(Math.random() * userIds.length)],
          message: `Commit message ${i}-${j}`,
          sha: Math.random().toString(36).substring(2, 10),
          timestamp: timestamp.toISOString(),
        })
      }
    }

    return commits
  }

  // Refresh data
  const refreshData = () => {
    setRefreshing(true)
    // In a real application, you would call APIs again to fetch new data
    // Here we simulate by waiting a bit and then turning off the refreshing state
    setTimeout(() => {
      setRefreshing(false)
    }, 1000)
  }

  // Create a list of all events
  const allEvents = useMemo(() => {
    const events: Event[] = []

    // Add commits
    commits.forEach((commit) => {
      events.push({
        id: commit.id,
        type: "COMMIT",
        userId: commit.userId,
        timestamp: commit.timestamp,
        projectId,
        data: commit,
      })
    })

    // Add task creations
    tasks.forEach((task) => {
      events.push({
        id: `task-create-${task.id}`,
        type: "TASK_CREATE",
        userId: task.createdBy,
        timestamp: task.createdAt,
        projectId,
        data: task,
      })
    })

    // Add task updates from history
    taskHistory.forEach((history) => {
      events.push({
        id: history.id,
        type: "TASK_UPDATE",
        userId: history.userId,
        timestamp: history.timestamp,
        projectId,
        data: history,
      })
    })

    // Add comments
    comments.forEach((comment) => {
      events.push({
        id: comment.id,
        type: "TASK_COMMENT",
        userId: comment.userId,
        timestamp: comment.createdAt,
        projectId,
        data: comment,
      })
    })

    // Add notifications
    notifications.forEach((notification) => {
      events.push({
        id: notification.id,
        type: "NOTIFICATION",
        userId: notification.userId,
        timestamp: notification.createdAt,
        projectId,
        data: notification,
      })
    })

    return events
  }, [commits, tasks, taskHistory, comments, notifications, projectId])

  // Filter events based on selected filters
  const filteredEvents = useMemo(() => {
    return allEvents.filter((event) => {
      const date = parseISO(event.timestamp)
      const isInDateRange = isAfter(date, dateRange.from) && isAfter(endOfDay(dateRange.to), date)
      const isCorrectUser = !userFilter || event.userId === userFilter
      const isCorrectEventType = !eventTypeFilter || event.type === eventTypeFilter

      return isInDateRange && isCorrectUser && isCorrectEventType
    })
  }, [allEvents, dateRange, userFilter, eventTypeFilter])

  // Calculate overall statistics
  const stats = useMemo(() => {
    const result: Stats = {
      commits: 0,
      taskCreates: 0,
      taskUpdates: 0,
      comments: 0,
      notifications: 0,
      notificationsRead: 0,
      notificationsUnread: 0,
    }

    filteredEvents.forEach((event) => {
      switch (event.type) {
        case "COMMIT":
          result.commits++
          break
        case "TASK_CREATE":
          result.taskCreates++
          break
        case "TASK_UPDATE":
          result.taskUpdates++
          break
        case "TASK_COMMENT":
          result.comments++
          break
        case "NOTIFICATION":
          result.notifications++
          if (event.data.status === "read") {
            result.notificationsRead++
          } else {
            result.notificationsUnread++
          }
          break
      }
    })

    return result
  }, [filteredEvents])

  // Data for timeline chart
  const timelineData = useMemo(() => {
    const data: Record<string, any>[] = []
    const dateMap: Record<string, any> = {}

    // Create an array of dates within the range
    let currentDate = new Date(dateRange.from)
    const endDate = new Date(dateRange.to)

    while (currentDate <= endDate) {
      const dateStr = format(currentDate, "yyyy-MM-dd")
      dateMap[dateStr] = {
        date: dateStr,
        displayDate: format(currentDate, "dd/MM", { locale: vi }),
        commits: 0,
        taskCreates: 0,
        taskUpdates: 0,
        comments: 0,
      }
      currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1))
    }

    // Count events by date
    filteredEvents.forEach((event) => {
      const dateStr = format(new Date(event.timestamp), "yyyy-MM-dd")
      if (dateMap[dateStr]) {
        switch (event.type) {
          case "COMMIT":
            dateMap[dateStr].commits++
            break
          case "TASK_CREATE":
            dateMap[dateStr].taskCreates++
            break
          case "TASK_UPDATE":
            dateMap[dateStr].taskUpdates++
            break
          case "TASK_COMMENT":
            dateMap[dateStr].comments++
            break
        }
      }
    })

    // Convert to array for use with Recharts
    Object.values(dateMap).forEach((item) => {
      data.push(item)
    })

    return data
  }, [filteredEvents, dateRange])

  // Data for event type distribution chart
  const eventDistributionData = useMemo(() => {
    return [
      { name: "Commits", value: stats.commits, color: CHART_COLORS.commits },
      { name: "Task Creation", value: stats.taskCreates, color: CHART_COLORS.taskCreates },
      { name: "Task Update", value: stats.taskUpdates, color: CHART_COLORS.taskUpdates },
      { name: "Comments", value: stats.comments, color: CHART_COLORS.comments },
    ].filter((item) => item.value > 0) // Only include items with values > 0
  }, [stats])

  // Data for notification chart
  const notificationData = useMemo(() => {
    return [
      { name: "Read", value: stats.notificationsRead, color: CHART_COLORS.read },
      { name: "Unread", value: stats.notificationsUnread, color: CHART_COLORS.unread },
    ].filter((item) => item.value > 0) // Only include items with values > 0
  }, [stats])

  // Data for recent events table
  const recentEvents = useMemo(() => {
    return filteredEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10)
  }, [filteredEvents])

  // Data for most active users table
  const topUsers = useMemo(() => {
    const userCounts: Record<string, number> = {}

    filteredEvents.forEach((event) => {
      if (!userCounts[event.userId]) {
        userCounts[event.userId] = 0
      }
      userCounts[event.userId]++
    })

    return Object.entries(userCounts)
      .map(([userId, count]) => ({
        userId,
        count,
        user: users[userId],
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [filteredEvents, users])

  // Function to get user's display name
  const getUserDisplayName = (userId: string) => {
    return users[userId]?.displayName || "Unknown User"
  }

  // Function to get user's photo URL
  const getUserPhotoURL = (userId: string) => {
    return users[userId]?.photoURL
  }

  // Function to get event description
  const getEventDescription = (event: Event) => {
    switch (event.type) {
      case "COMMIT":
        return `Commit: ${event.data.message}`
      case "TASK_CREATE":
        return `Task Created: ${event.data.title}`
      case "TASK_UPDATE":
        if (event.data.changes && event.data.changes.length > 0) {
          const change = event.data.changes[0]
          return `Task Updated: ${change.field} from ${change.oldValue} to ${change.newValue}`
        }
        return "Task Updated"
      case "TASK_COMMENT":
        return `Comment: ${event.data.content.substring(0, 30)}${event.data.content.length > 30 ? "..." : ""}`
      case "NOTIFICATION":
        return `Notification: ${event.data.message}`
      default:
        return "Unknown Event"
    }
  }

  // Function to capitalize first letter of each word
  const capitalizeWords = (text: string) => {
    return text.replace(/\b\w/g, (char) => char.toUpperCase())
  }

  // Function to export data to CSV
  const exportToCSV = () => {
    // Create CSV header
    let csvContent = "Type,User,Time,Description\n"

    // Add data from filtered events
    filteredEvents.forEach((event) => {
      const eventType = EVENT_TYPES[event.type as keyof typeof EVENT_TYPES] || event.type
      const userName = getUserDisplayName(event.userId)
      const timestamp = format(new Date(event.timestamp), "dd/MM/yyyy HH:mm")
      const description = getEventDescription(event).replace(/,/g, ";") // Replace commas to avoid CSV errors

      csvContent += `${eventType},${userName},${timestamp},"${description}"\n`
    })

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `Dashboard-Export-${format(new Date(), "yyyy-MM-dd")}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
            <h2 className="text-xl font-semibold mb-2">Project Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The Project You Are Looking For Does Not Exist Or You Do Not Have Access To It.
            </p>
            <Link href="/projects">
              <Button className="rounded-lg shadow-sm">Back To Project List</Button>
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
          <ArrowLeft className="mr-2 h-4 w-4" /> Back To Project
        </Link>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <PageHeader title="Dashboard" description={`Activity Statistics For Project ${project.name}`} />

          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={refreshing}
            className="rounded-lg shadow-sm"
          >
            {refreshing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Data
              </>
            )}
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6 shadow-sm border-border animate-fadeIn">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Filter className="h-5 w-5 mr-2 text-primary" />
              Filters
            </CardTitle>
            <CardDescription>Filter Data By Time Range, Event Type, And User</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Time Range</label>
                <div className="flex flex-col space-y-2">
                  <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Time Range" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TIME_RANGES).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {timeRange === "CUSTOM" && (
                    <DatePickerWithRange
                      date={dateRange}
                      setDate={(date) => {
                        setDateRange({
                          from: date.from || new Date(),
                          to: date.to || new Date(),
                        })
                      }}
                    />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Event Type</label>
                <Select
                  value={eventTypeFilter || "all"}
                  onValueChange={(value) => setEventTypeFilter(value === "all" ? null : value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Event Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Event Types</SelectItem>
                    {Object.entries(EVENT_TYPES).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">User</label>
                <Select
                  value={userFilter || "all"}
                  onValueChange={(value) => setUserFilter(value === "all" ? null : value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {Object.entries(users).map(([userId, userData]) => (
                      <SelectItem key={userId} value={userId}>
                        {userData.displayName || userData.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setTimeRange("LAST_7_DAYS")
                setEventTypeFilter(null)
                setUserFilter(null)
              }}
            >
              Reset Filters
            </Button>
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export Data
            </Button>
          </CardFooter>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="inline-flex h-12 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground overflow-x-auto no-scrollbar flex-nowrap w-full gap-1 px-1 max-w-3xl">
            <TabsTrigger value="overview" className="flex-shrink-0 min-w-fit">
              Overview
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex-shrink-0 min-w-fit">
              Timeline Chart
            </TabsTrigger>
            <TabsTrigger value="distribution" className="flex-shrink-0 min-w-fit">
              Event Distribution
            </TabsTrigger>
            <TabsTrigger value="details" className="flex-shrink-0 min-w-fit">
              Details
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="animate-in fade-in-50">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Commits</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold">{stats.commits}</div>
                    <GitCommit className="h-8 w-8 text-primary/20" />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold">{stats.taskCreates}</div>
                    <GitPullRequest className="h-8 w-8 text-primary/20" />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Task Updates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold">{stats.taskUpdates}</div>
                    <BarChart3 className="h-8 w-8 text-primary/20" />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Notifications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold">{stats.notifications}</div>
                    <div className="flex flex-col items-end">
                      <div className="text-xs text-muted-foreground flex items-center">
                        <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span>
                        Read: {stats.notificationsRead}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center">
                        <span className="inline-block w-2 h-2 rounded-full bg-orange-500 mr-1"></span>
                        Unread: {stats.notificationsUnread}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Recent Events</CardTitle>
                  <CardDescription>The 10 Most Recent Events In The Project</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-4 min-w-[300px]">
                      {recentEvents.map((event) => (
                        <div
                          key={event.id}
                          className="flex items-start gap-3 pb-3 border-b border-border last:border-0"
                        >
                          <Avatar className="h-8 w-8 mt-0.5 flex-shrink-0">
                            <AvatarImage src={getUserPhotoURL(event.userId)} />
                            <AvatarFallback>{getUserDisplayName(event.userId).charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="space-y-1 min-w-0">
                            <p className="text-sm font-medium">{getUserDisplayName(event.userId)}</p>
                            <p className="text-sm text-muted-foreground">
                              {capitalizeWords(getEventDescription(event))}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs whitespace-nowrap">
                                {EVENT_TYPES[event.type as keyof typeof EVENT_TYPES] || event.type}
                              </Badge>
                              <span className="text-xs text-muted-foreground flex items-center whitespace-nowrap">
                                <Clock className="h-3 w-3 mr-1" />
                                {format(new Date(event.timestamp), "dd/MM/yyyy HH:mm")}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                      {recentEvents.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <Info className="h-10 w-10 mx-auto mb-2 opacity-20" />
                          <p>No Events Found Within The Selected Time Range</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Most Active Users</CardTitle>
                  <CardDescription>Top 5 Users With The Most Activities</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {topUsers.map((item) => (
                      <div key={item.userId} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={getUserPhotoURL(item.userId)} />
                            <AvatarFallback>{item.user?.displayName?.charAt(0) || "U"}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{item.user?.displayName || "Unknown User"}</p>
                            <p className="text-xs text-muted-foreground">{item.user?.email}</p>
                          </div>
                        </div>
                        <Badge variant="secondary">{item.count} Activities</Badge>
                      </div>
                    ))}
                    {topUsers.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <User className="h-10 w-10 mx-auto mb-2 opacity-20" />
                        <p>No User Data Available</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Timeline Chart Tab */}
          <TabsContent value="timeline" className="animate-in fade-in-50">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Activity Timeline Chart</CardTitle>
                <CardDescription>Number Of Activities Over Time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timelineData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="displayDate" />
                      <YAxis />
                      <Tooltip
                        formatter={(value, name) => [
                          value,
                          name === "commits"
                            ? "Commits"
                            : name === "taskCreates"
                              ? "Task Creation"
                              : name === "taskUpdates"
                                ? "Task Update"
                                : name === "comments"
                                  ? "Comments"
                                  : name,
                        ]}
                        labelFormatter={(value) => {
                          if (typeof value === "string") {
                            const parts = value.split("-")
                            if (parts.length === 3) {
                              return format(new Date(value), "dd/MM/yyyy")
                            }
                          }
                          return value
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="commits"
                        stroke={CHART_COLORS.commits}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="taskCreates"
                        stroke={CHART_COLORS.taskCreates}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="taskUpdates"
                        stroke={CHART_COLORS.taskUpdates}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="comments"
                        stroke={CHART_COLORS.comments}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Bar Chart Of Activities</CardTitle>
                  <CardDescription>Number Of Activities Over Time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={timelineData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="displayDate" />
                        <YAxis />
                        <Tooltip
                          formatter={(value, name) => [
                            value,
                            name === "commits"
                              ? "Commits"
                              : name === "taskCreates"
                                ? "Task Creation"
                                : name === "taskUpdates"
                                  ? "Task Update"
                                  : name === "comments"
                                    ? "Comments"
                                    : name,
                          ]}
                          labelFormatter={(value) => {
                            if (typeof value === "string") {
                              const parts = value.split("-")
                              if (parts.length === 3) {
                                return format(new Date(value), "dd/MM/yyyy")
                              }
                            }
                            return value
                          }}
                        />
                        <Legend />
                        <Bar dataKey="commits" fill={CHART_COLORS.commits} />
                        <Bar dataKey="taskCreates" fill={CHART_COLORS.taskCreates} />
                        <Bar dataKey="taskUpdates" fill={CHART_COLORS.taskUpdates} />
                        <Bar dataKey="comments" fill={CHART_COLORS.comments} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Area Chart</CardTitle>
                  <CardDescription>Activity Trends Over Time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={timelineData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="displayDate" />
                        <YAxis />
                        <Tooltip
                          formatter={(value, name) => [
                            value,
                            name === "commits"
                              ? "Commits"
                              : name === "taskCreates"
                                ? "Task Creation"
                                : name === "taskUpdates"
                                  ? "Task Update"
                                  : name === "comments"
                                    ? "Comments"
                                    : name,
                          ]}
                          labelFormatter={(value) => {
                            if (typeof value === "string") {
                              const parts = value.split("-")
                              if (parts.length === 3) {
                                return format(new Date(value), "dd/MM/yyyy")
                              }
                            }
                            return value
                          }}
                        />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="commits"
                          stackId="1"
                          stroke={CHART_COLORS.commits}
                          fill={CHART_COLORS.commits}
                          fillOpacity={0.6}
                        />
                        <Area
                          type="monotone"
                          dataKey="taskCreates"
                          stackId="1"
                          stroke={CHART_COLORS.taskCreates}
                          fill={CHART_COLORS.taskCreates}
                          fillOpacity={0.6}
                        />
                        <Area
                          type="monotone"
                          dataKey="taskUpdates"
                          stackId="1"
                          stroke={CHART_COLORS.taskUpdates}
                          fill={CHART_COLORS.taskUpdates}
                          fillOpacity={0.6}
                        />
                        <Area
                          type="monotone"
                          dataKey="comments"
                          stackId="1"
                          stroke={CHART_COLORS.comments}
                          fill={CHART_COLORS.comments}
                          fillOpacity={0.6}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Event Distribution Tab */}
          <TabsContent value="distribution" className="animate-in fade-in-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Event Type Distribution</CardTitle>
                  <CardDescription>Proportion Of Event Types In The Project</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    {eventDistributionData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={eventDistributionData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {eventDistributionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value, name) => [value, name]} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">No Data Available For The Selected Filters</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Notification Status</CardTitle>
                  <CardDescription>Proportion Of Read And Unread Notifications</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    {notificationData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={notificationData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {notificationData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value, name) => [value, name]} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">No Notification Data Available</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-sm mt-6">
              <CardHeader>
                <CardTitle className="text-lg">User Activity Distribution</CardTitle>
                <CardDescription>Number Of Activities By Each User</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] w-full">
                  {topUsers.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={topUsers.map((user) => ({
                          name: user.user?.displayName || "Unknown",
                          value: user.count,
                        }))}
                        layout="vertical"
                        margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={80} />
                        <Tooltip formatter={(value) => [value, "Activities"]} />
                        <Bar dataKey="value" fill={CHART_COLORS.commits} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">No User Activity Data Available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="animate-in fade-in-50">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Event Details</CardTitle>
                <CardDescription>List Of All Filtered Events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <ScrollArea className="h-[400px]">
                    <div className="overflow-x-auto">
                      <div className="min-w-[800px]">
                        <Table>
                          <TableHeader className="sticky top-0 bg-background z-10">
                            <TableRow>
                              <TableHead className="w-[140px] whitespace-nowrap">Event Type</TableHead>
                              <TableHead className="w-[180px]">User</TableHead>
                              <TableHead className="w-[150px]">Time</TableHead>
                              <TableHead>Description</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredEvents
                              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                              .slice(0, 50)
                              .map((event) => (
                                <TableRow key={event.id}>
                                  <TableCell>
                                    <Badge variant="outline" className="whitespace-nowrap">
                                      {EVENT_TYPES[event.type as keyof typeof EVENT_TYPES] || event.type}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-6 w-6">
                                        <AvatarImage src={getUserPhotoURL(event.userId)} />
                                        <AvatarFallback>{getUserDisplayName(event.userId).charAt(0)}</AvatarFallback>
                                      </Avatar>
                                      <span className="truncate max-w-[100px]">{getUserDisplayName(event.userId)}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>{format(new Date(event.timestamp), "dd/MM/yyyy HH:mm")}</TableCell>
                                  <TableCell className="max-w-[400px] truncate">
                                    {capitalizeWords(getEventDescription(event))}
                                  </TableCell>
                                </TableRow>
                              ))}
                            {filteredEvents.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                  No Events Match The Filters
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </ScrollArea>
                </div>
                {filteredEvents.length > 50 && (
                  <div className="text-center text-sm text-muted-foreground mt-4">
                    Displaying The 50 Most Recent Events Out Of {filteredEvents.length} Events
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

