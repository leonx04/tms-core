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
import { DatePicker } from "@/components/ui/date-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ArrowLeft,
  BarChart3,
  ChevronRight,
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
import type { Project, Task, TaskHistory, Comment, User as UserType } from "@/types"
import { TASK_STATUS } from "@/types"

// Define event types
const EVENT_TYPES = {
  COMMIT: "Commit",
  TASK_CREATE: "Task Creation",
  TASK_UPDATE: "Task Update",
  TASK_COMMENT: "Task Comment",
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
  closed: "#8884d8",
  open: "#82ca9d",
  new: "#ffc658",
  inProgress: "#ff8042",
  resolved: "#8dd1e1",
  reopened: "#a4de6c",
  overdue: "#d0ed57",
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
  const [commits, setCommits] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState("overview")
  const [taskStats, setTaskStats] = useState({
    total: 0,
    closed: 0,
    open: 0,
    new: 0,
    inProgress: 0,
    resolved: 0,
    reopened: 0,
    overdue: 0,
    byUser: {},
  })

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

    return events
  }, [commits, tasks, taskHistory, comments, projectId])

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

  useEffect(() => {
    if (!tasks.length) return;

    const filteredTasks = tasks.filter((task) => {
      const taskDate = new Date(task.createdAt);
      const isInDateRange = taskDate >= dateRange.from && taskDate <= dateRange.to;
      const isCorrectUser = !userFilter || task.assignedTo.includes(userFilter);
      const isCorrectEventType = !eventTypeFilter || task.status === eventTypeFilter;

      return isInDateRange && isCorrectUser && isCorrectEventType;
    });

    const stats = {
      total: filteredTasks.length,
      closed: 0,
      open: 0,
      new: 0,
      inProgress: 0,
      resolved: 0,
      reopened: 0,
      overdue: 0,
      byUser: {} as Record<string, number>,
    };

    const now = new Date();

    filteredTasks.forEach((task) => {
      if (task.status === TASK_STATUS.CLOSED) stats.closed++;
      else stats.open++;

      if (task.status === TASK_STATUS.TODO) stats.new++;
      if (task.status === TASK_STATUS.IN_PROGRESS) stats.inProgress++;
      if (task.status === TASK_STATUS.RESOLVED) stats.resolved++;
      if (task.status === TASK_STATUS.REOPENED) stats.reopened++;

      if (task.dueDate && new Date(task.dueDate) < now && task.status !== TASK_STATUS.CLOSED) {
        stats.overdue++;
      }

      task.assignedTo.forEach((userId) => {
        if (!stats.byUser[userId]) stats.byUser[userId] = 0;
        stats.byUser[userId]++;
      });
    });

    setTaskStats(stats);
  }, [tasks, dateRange, userFilter, eventTypeFilter]);

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
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">From Date</label>
                        <DatePicker
                          date={dateRange.from}
                          setDate={(date) => setDateRange((prev) => ({ ...prev, from: date || prev.from }))}
                          placeholder="Start date"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">To Date</label>
                        <DatePicker
                          date={dateRange.to}
                          setDate={(date) => setDateRange((prev) => ({ ...prev, to: date || prev.to }))}
                          placeholder="End date"
                        />
                      </div>
                    </div>
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
          <div className="flex justify-center w-full">
            <TabsList className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground overflow-x-auto no-scrollbar flex-nowrap gap-1 px-1 w-auto">
              <TabsTrigger value="overview" className="flex-shrink-0 min-w-fit px-3 py-1.5">
                Overview
              </TabsTrigger>
              <TabsTrigger value="timeline" className="flex-shrink-0 min-w-fit px-3 py-1.5">
                Timeline
              </TabsTrigger>
              <TabsTrigger value="distribution" className="flex-shrink-0 min-w-fit px-3 py-1.5">
                Distribution
              </TabsTrigger>
              <TabsTrigger value="details" className="flex-shrink-0 min-w-fit px-3 py-1.5">
                Details
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="animate-in fade-in-50">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
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

              <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
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

              <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardHeader>
                  <CardTitle className="text-lg">Recent Events</CardTitle>
                  <CardDescription>The 10 Most Recent Events In The Project</CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="relative rounded-md border">
                    <div className="overflow-x-auto" style={{ maxWidth: "100%" }}>
                      <table className="w-full min-w-[600px]">
                        <thead className="bg-muted/50 sticky top-0 z-10">
                          <tr>
                            <th className="h-10 px-4 text-left align-middle font-medium">User</th>
                            <th className="h-10 px-4 text-left align-middle font-medium">Type</th>
                            <th className="h-10 px-4 text-left align-middle font-medium">Time</th>
                            <th className="h-10 px-4 text-left align-middle font-medium">Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {recentEvents.map((event) => (
                            <tr key={event.id} className="hover:bg-muted/30 transition-colors">
                              <td className="p-2 align-middle">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-8 w-8 flex-shrink-0">
                                    <AvatarImage src={getUserPhotoURL(event.userId)} />
                                    <AvatarFallback>{getUserDisplayName(event.userId).charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <span className="truncate max-w-[100px]">{getUserDisplayName(event.userId)}</span>
                                </div>
                              </td>
                              <td className="p-2 align-middle">
                                <Badge variant="outline" className="whitespace-nowrap">
                                  {EVENT_TYPES[event.type as keyof typeof EVENT_TYPES] || event.type}
                                </Badge>
                              </td>
                              <td className="p-2 align-middle whitespace-nowrap">
                                {format(new Date(event.timestamp), "dd/MM/yyyy HH:mm")}
                              </td>
                              <td className="p-2 align-middle max-w-[200px] truncate">
                                {capitalizeWords(getEventDescription(event))}
                              </td>
                            </tr>
                          ))}
                          {recentEvents.length === 0 && (
                            <tr>
                              <td colSpan={4} className="h-24 text-center text-muted-foreground">
                                <Info className="h-10 w-10 mx-auto mb-2 opacity-20" />
                                <p>No Events Found Within The Selected Time Range</p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="absolute right-3 bottom-3">
                      <div className="flex items-center justify-center h-6 w-6 rounded-full bg-muted/80 text-muted-foreground">
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardHeader>
                  <CardTitle className="text-lg">Most Active Users</CardTitle>
                  <CardDescription>Top 5 Users With The Most Activities</CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="relative rounded-md border">
                    <div className="overflow-x-auto" style={{ maxWidth: "100%" }}>
                      <table className="w-full min-w-[400px]">
                        <thead className="bg-muted/50 sticky top-0 z-10">
                          <tr>
                            <th className="h-10 px-4 text-left align-middle font-medium">User</th>
                            <th className="h-10 px-4 text-left align-middle font-medium">Activities</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {topUsers.map((item) => (
                            <tr key={item.userId} className="hover:bg-muted/30 transition-colors">
                              <td className="p-2 align-middle">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-8 w-8 flex-shrink-0">
                                    <AvatarImage src={getUserPhotoURL(item.userId)} />
                                    <AvatarFallback>{item.user?.displayName?.charAt(0) || "U"}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium">{item.user?.displayName || "Unknown User"}</p>
                                    <p className="text-xs text-muted-foreground">{item.user?.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-2 align-middle">
                                <Badge variant="secondary">{item.count} Activities</Badge>
                              </td>
                            </tr>
                          ))}
                          {topUsers.length === 0 && (
                            <tr>
                              <td colSpan={2} className="h-24 text-center text-muted-foreground">
                                <User className="h-10 w-10 mx-auto mb-2 opacity-20" />
                                <p>No User Data Available</p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="absolute right-3 bottom-3">
                      <div className="flex items-center justify-center h-6 w-6 rounded-full bg-muted/80 text-muted-foreground">
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Timeline Chart Tab */}
          <TabsContent value="timeline" className="animate-in fade-in-50">
            <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
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
              <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
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

              <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
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
              <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
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

              <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardHeader>
                  <CardTitle className="text-lg">User Activity Distribution</CardTitle>
                  <CardDescription>Number Of Activities By Each User</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
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
            </div>

            {/* Task Status Distribution */}
            <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardHeader>
                <CardTitle className="text-lg">Task Status Distribution</CardTitle>
                <CardDescription>Proportion Of Tasks By Status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={Object.entries(taskStats).filter(([key, value]) =>
                          ["closed", "open", "new", "inProgress", "resolved", "reopened", "overdue"].includes(key) && typeof value === 'number' && value > 0
                        ).map(([key, value]) => ({
                          name: key,
                          value,
                        }))}
                        cx="50%"
                        cy="50%"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                        outerRadius={100}
                        innerRadius={60}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {Object.entries(taskStats).map(([key], index) => (
                          <Cell key={`cell-${index}`} fill={key in CHART_COLORS ? CHART_COLORS[key as keyof typeof CHART_COLORS] : "#8884d8"} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [value, name]} />
                      <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Task Count by Member */}
            <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardHeader>
                <CardTitle className="text-lg">Task Count by Member</CardTitle>
                <CardDescription>Number of Tasks Assigned to Each Member</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={Object.entries(taskStats.byUser).map(([userId, taskCount]) => ({
                        name: users[userId]?.displayName || "Unknown",
                        value: taskCount,
                      }))}
                      layout="vertical"
                      margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={150} />
                      <Tooltip formatter={(value) => [value, "Tasks"]} />
                      <Bar dataKey="value" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="animate-in fade-in-50">
            <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardHeader>
                <CardTitle className="text-lg">Event Details</CardTitle>
                <CardDescription>List Of All Filtered Events</CardDescription>
              </CardHeader>

              <CardContent>
                <div className="relative rounded-md border">
                  <div className="overflow-x-auto" style={{ maxWidth: "100%" }}>
                    <table className="w-full min-w-[800px]">
                      <thead className="bg-muted/50 sticky top-0 z-10">
                        <tr>
                          <th className="h-10 px-4 text-left align-middle font-medium w-[140px] whitespace-nowrap">
                            Event Type
                          </th>
                          <th className="h-10 px-4 text-left align-middle font-medium w-[180px]">User</th>
                          <th className="h-10 px-4 text-left align-middle font-medium w-[150px]">Time</th>
                          <th className="h-10 px-4 text-left align-middle font-medium">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredEvents
                          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                          .slice(0, 50)
                          .map((event) => (
                            <tr key={event.id} className="hover:bg-muted/30 transition-colors">
                              <td className="p-4 align-middle">
                                <Badge variant="outline" className="whitespace-nowrap">
                                  {EVENT_TYPES[event.type as keyof typeof EVENT_TYPES] || event.type}
                                </Badge>
                              </td>
                              <td className="p-4 align-middle">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6 flex-shrink-0">
                                    <AvatarImage src={getUserPhotoURL(event.userId)} />
                                    <AvatarFallback>{getUserDisplayName(event.userId).charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <span className="truncate max-w-[100px]">{getUserDisplayName(event.userId)}</span>
                                </div>
                              </td>
                              <td className="p-4 align-middle whitespace-nowrap">
                                {format(new Date(event.timestamp), "dd/MM/yyyy HH:mm")}
                              </td>
                              <td className="p-4 align-middle max-w-[400px] truncate">
                                {capitalizeWords(getEventDescription(event))}
                              </td>
                            </tr>
                          ))}
                        {filteredEvents.length === 0 && (
                          <tr>
                            <td colSpan={4} className="h-24 text-center text-muted-foreground">
                              <Info className="h-10 w-10 mx-auto mb-2 opacity-20" />
                              <p>No Events Match The Filters</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="absolute right-3 bottom-3">
                    <div className="flex items-center justify-center h-6 w-6 rounded-full bg-muted/80 text-muted-foreground">
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
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

