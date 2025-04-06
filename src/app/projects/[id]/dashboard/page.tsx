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
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
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
  XAxis,
  YAxis,
} from "recharts"
import type { Project, Task, TaskHistory, Comment, Notification, User as UserType } from "@/types"

// Định nghĩa các loại sự kiện
const EVENT_TYPES = {
  COMMIT: "Commit",
  TASK_CREATE: "Tạo task",
  TASK_UPDATE: "Cập nhật task",
  TASK_COMMENT: "Bình luận task",
  NOTIFICATION: "Thông báo",
}

// Định nghĩa các khoảng thời gian
const TIME_RANGES = {
  TODAY: "Hôm nay",
  YESTERDAY: "Hôm qua",
  LAST_7_DAYS: "7 ngày qua",
  LAST_30_DAYS: "30 ngày qua",
  CUSTOM: "Tùy chỉnh",
}

// Định nghĩa các màu cho biểu đồ
const CHART_COLORS = {
  commits: "#8884d8",
  taskCreates: "#82ca9d",
  taskUpdates: "#ffc658",
  comments: "#ff8042",
  notifications: "#0088fe",
  read: "#82ca9d",
  unread: "#ff8042",
}

// Định nghĩa kiểu dữ liệu cho sự kiện
type Event = {
  id: string
  type: string
  userId: string
  timestamp: string
  projectId: string
  data: any
}

// Định nghĩa kiểu dữ liệu cho thống kê
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

  // Tính toán khoảng thời gian dựa trên lựa chọn
  useEffect(() => {
    if (timeRange === "CUSTOM") return // Không thay đổi nếu là tùy chỉnh

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

  // Tải dữ liệu dự án và các dữ liệu liên quan
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

        if (tasksSnapshot.exists()) {
          const tasksData = tasksSnapshot.val()
          const tasksList = Object.entries(tasksData).map(([id, data]: [string, any]) => ({
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
              const task = tasks.find((t) => t.id === history.taskId)
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
              const task = tasks.find((t) => t.id === comment.taskId)
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
              return notification.referenceId === projectId || tasks.some((t) => t.id === notification.referenceId)
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
  }, [user, projectId, router])

  // Hàm tạo dữ liệu commit giả lập cho demo
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

  // Làm mới dữ liệu
  const refreshData = () => {
    setRefreshing(true)
    // Trong ứng dụng thực tế, bạn sẽ gọi lại các API để lấy dữ liệu mới
    // Ở đây chúng ta sẽ giả lập bằng cách đợi một chút rồi tắt trạng thái refreshing
    setTimeout(() => {
      setRefreshing(false)
    }, 1000)
  }

  // Lọc dữ liệu theo khoảng thời gian
  const filterByDateRange = (timestamp: string) => {
    const date = parseISO(timestamp)
    return isAfter(date, dateRange.from) && isAfter(endOfDay(dateRange.to), date)
  }

  // Lọc dữ liệu theo người dùng
  const filterByUser = (userId: string) => {
    if (!userFilter) return true
    return userId === userFilter
  }

  // Lọc dữ liệu theo loại sự kiện
  const filterByEventType = (type: string) => {
    if (!eventTypeFilter) return true
    return type === eventTypeFilter
  }

  // Tạo danh sách tất cả các sự kiện
  const allEvents = useMemo(() => {
    const events: Event[] = []

    // Thêm commits
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

    // Thêm task creations
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

    // Thêm task updates từ history
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

    // Thêm comments
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

    // Thêm notifications
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

  // Lọc sự kiện theo các bộ lọc đã chọn
  const filteredEvents = useMemo(() => {
    return allEvents.filter(
      (event) => filterByDateRange(event.timestamp) && filterByUser(event.userId) && filterByEventType(event.type),
    )
  }, [allEvents, dateRange, userFilter, eventTypeFilter])

  // Tính toán thống kê tổng quan
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

  // Dữ liệu cho biểu đồ timeline
  const timelineData = useMemo(() => {
    const data: Record<string, any>[] = []
    const dateMap: Record<string, any> = {}

    // Tạo mảng các ngày trong khoảng thời gian
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

    // Đếm sự kiện theo ngày
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

    // Chuyển đổi thành mảng để sử dụng với Recharts
    Object.values(dateMap).forEach((item) => {
      data.push(item)
    })

    return data
  }, [filteredEvents, dateRange])

  // Dữ liệu cho biểu đồ phân bố loại sự kiện
  const eventDistributionData = useMemo(() => {
    return [
      { name: "Commits", value: stats.commits, color: CHART_COLORS.commits },
      { name: "Tạo task", value: stats.taskCreates, color: CHART_COLORS.taskCreates },
      { name: "Cập nhật task", value: stats.taskUpdates, color: CHART_COLORS.taskUpdates },
      { name: "Bình luận", value: stats.comments, color: CHART_COLORS.comments },
    ]
  }, [stats])

  // Dữ liệu cho biểu đồ thông báo
  const notificationData = useMemo(() => {
    return [
      { name: "Đã đọc", value: stats.notificationsRead, color: CHART_COLORS.read },
      { name: "Chưa đọc", value: stats.notificationsUnread, color: CHART_COLORS.unread },
    ]
  }, [stats])

  // Dữ liệu cho bảng sự kiện gần đây
  const recentEvents = useMemo(() => {
    return filteredEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10)
  }, [filteredEvents])

  // Dữ liệu cho bảng người dùng hoạt động nhất
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

  // Hàm lấy tên hiển thị của người dùng
  const getUserDisplayName = (userId: string) => {
    return users[userId]?.displayName || "Unknown User"
  }

  // Hàm lấy URL ảnh đại diện của người dùng
  const getUserPhotoURL = (userId: string) => {
    return users[userId]?.photoURL
  }

  // Hàm lấy mô tả cho sự kiện
  const getEventDescription = (event: Event) => {
    switch (event.type) {
      case "COMMIT":
        return `Commit: ${event.data.message}`
      case "TASK_CREATE":
        return `Tạo task: ${event.data.title}`
      case "TASK_UPDATE":
        if (event.data.changes && event.data.changes.length > 0) {
          const change = event.data.changes[0]
          return `Cập nhật task: ${change.field} từ ${change.oldValue} thành ${change.newValue}`
        }
        return "Cập nhật task"
      case "TASK_COMMENT":
        return `Bình luận: ${event.data.content.substring(0, 30)}${event.data.content.length > 30 ? "..." : ""}`
      case "NOTIFICATION":
        return `Thông báo: ${event.data.message}`
      default:
        return "Sự kiện không xác định"
    }
  }

  // Hàm xuất dữ liệu ra CSV
  const exportToCSV = () => {
    // Tạo header cho file CSV
    let csvContent = "Loại,Người dùng,Thời gian,Mô tả\n"

    // Thêm dữ liệu từ các sự kiện đã lọc
    filteredEvents.forEach((event) => {
      const eventType = EVENT_TYPES[event.type as keyof typeof EVENT_TYPES] || event.type
      const userName = getUserDisplayName(event.userId)
      const timestamp = format(new Date(event.timestamp), "dd/MM/yyyy HH:mm")
      const description = getEventDescription(event).replace(/,/g, ";") // Thay thế dấu phẩy để tránh lỗi CSV

      csvContent += `${eventType},${userName},${timestamp},"${description}"\n`
    })

    // Tạo blob và download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `dashboard-export-${format(new Date(), "yyyy-MM-dd")}.csv`)
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
            <h2 className="text-xl font-semibold mb-2">Không tìm thấy dự án</h2>
            <p className="text-muted-foreground mb-6">
              Dự án bạn đang tìm kiếm không tồn tại hoặc bạn không có quyền truy cập.
            </p>
            <Link href="/projects">
              <Button className="rounded-lg shadow-sm">Quay lại danh sách dự án</Button>
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
          <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại dự án
        </Link>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <PageHeader title="Dashboard" description={`Thống kê hoạt động cho dự án ${project.name}`} />

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
                Đang làm mới...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Làm mới dữ liệu
              </>
            )}
          </Button>
        </div>

        {/* Bộ lọc */}
        <Card className="mb-6 shadow-sm border-border animate-fadeIn">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Filter className="h-5 w-5 mr-2 text-primary" />
              Bộ lọc
            </CardTitle>
            <CardDescription>Lọc dữ liệu theo khoảng thời gian, loại sự kiện và người thực hiện</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Khoảng thời gian</label>
                <div className="flex flex-col space-y-2">
                  <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Chọn khoảng thời gian" />
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
                <label className="text-sm font-medium">Loại sự kiện</label>
                <Select
                  value={eventTypeFilter || "all"}
                  onValueChange={(value) => setEventTypeFilter(value === "all" ? null : value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Tất cả loại sự kiện" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả loại sự kiện</SelectItem>
                    {Object.entries(EVENT_TYPES).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Người thực hiện</label>
                <Select
                  value={userFilter || "all"}
                  onValueChange={(value) => setUserFilter(value === "all" ? null : value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Tất cả người dùng" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả người dùng</SelectItem>
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
              Đặt lại bộ lọc
            </Button>
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="mr-2 h-4 w-4" />
              Xuất dữ liệu
            </Button>
          </CardFooter>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full max-w-3xl">
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            <TabsTrigger value="timeline">Biểu đồ thời gian</TabsTrigger>
            <TabsTrigger value="distribution">Phân bố sự kiện</TabsTrigger>
            <TabsTrigger value="details">Chi tiết</TabsTrigger>
          </TabsList>

          {/* Tab Tổng quan */}
          <TabsContent value="overview" className="animate-in fade-in-50">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Tổng số commit</CardTitle>
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
                  <CardTitle className="text-sm font-medium text-muted-foreground">Tổng số task</CardTitle>
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
                  <CardTitle className="text-sm font-medium text-muted-foreground">Cập nhật task</CardTitle>
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
                  <CardTitle className="text-sm font-medium text-muted-foreground">Thông báo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold">{stats.notifications}</div>
                    <div className="flex flex-col items-end">
                      <div className="text-xs text-muted-foreground flex items-center">
                        <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span>
                        Đã đọc: {stats.notificationsRead}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center">
                        <span className="inline-block w-2 h-2 rounded-full bg-orange-500 mr-1"></span>
                        Chưa đọc: {stats.notificationsUnread}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Sự kiện gần đây</CardTitle>
                  <CardDescription>10 sự kiện gần đây nhất trong dự án</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-4">
                      {recentEvents.map((event) => (
                        <div
                          key={event.id}
                          className="flex items-start gap-3 pb-3 border-b border-border last:border-0"
                        >
                          <Avatar className="h-8 w-8 mt-0.5">
                            <AvatarImage src={getUserPhotoURL(event.userId)} />
                            <AvatarFallback>{getUserDisplayName(event.userId).charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="space-y-1">
                            <p className="text-sm font-medium">{getUserDisplayName(event.userId)}</p>
                            <p className="text-sm text-muted-foreground">{getEventDescription(event)}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {EVENT_TYPES[event.type as keyof typeof EVENT_TYPES] || event.type}
                              </Badge>
                              <span className="text-xs text-muted-foreground flex items-center">
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
                          <p>Không có sự kiện nào trong khoảng thời gian đã chọn</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Người dùng hoạt động nhất</CardTitle>
                  <CardDescription>Top 5 người dùng có nhiều hoạt động nhất</CardDescription>
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
                        <Badge variant="secondary">{item.count} hoạt động</Badge>
                      </div>
                    ))}
                    {topUsers.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <User className="h-10 w-10 mx-auto mb-2 opacity-20" />
                        <p>Không có dữ liệu người dùng</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab Biểu đồ thời gian */}
          <TabsContent value="timeline" className="animate-in fade-in-50">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Biểu đồ thời gian hoạt động</CardTitle>
                <CardDescription>Số lượng hoạt động theo thời gian</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ChartContainer
                    config={{
                      commits: { label: "Commits", color: CHART_COLORS.commits },
                      taskCreates: { label: "Tạo task", color: CHART_COLORS.taskCreates },
                      taskUpdates: { label: "Cập nhật task", color: CHART_COLORS.taskUpdates },
                      comments: { label: "Bình luận", color: CHART_COLORS.comments },
                    }}
                  >
                    <LineChart data={timelineData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="displayDate" />
                      <YAxis />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
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
                        }
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
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Biểu đồ cột hoạt động</CardTitle>
                  <CardDescription>Số lượng hoạt động theo thời gian</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ChartContainer
                      config={{
                        commits: { label: "Commits", color: CHART_COLORS.commits },
                        taskCreates: { label: "Tạo task", color: CHART_COLORS.taskCreates },
                        taskUpdates: { label: "Cập nhật task", color: CHART_COLORS.taskUpdates },
                        comments: { label: "Bình luận", color: CHART_COLORS.comments },
                      }}
                    >
                      <BarChart data={timelineData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="displayDate" />
                        <YAxis />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
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
                          }
                        />
                        <Legend />
                        <Bar dataKey="commits" fill={CHART_COLORS.commits} />
                        <Bar dataKey="taskCreates" fill={CHART_COLORS.taskCreates} />
                        <Bar dataKey="taskUpdates" fill={CHART_COLORS.taskUpdates} />
                        <Bar dataKey="comments" fill={CHART_COLORS.comments} />
                      </BarChart>
                    </ChartContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Biểu đồ diện tích</CardTitle>
                  <CardDescription>Xu hướng hoạt động theo thời gian</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ChartContainer
                      config={{
                        commits: { label: "Commits", color: CHART_COLORS.commits },
                        taskCreates: { label: "Tạo task", color: CHART_COLORS.taskCreates },
                        taskUpdates: { label: "Cập nhật task", color: CHART_COLORS.taskUpdates },
                        comments: { label: "Bình luận", color: CHART_COLORS.comments },
                      }}
                    >
                      <AreaChart data={timelineData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="displayDate" />
                        <YAxis />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
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
                          }
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
                    </ChartContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab Phân bố sự kiện */}
          <TabsContent value="distribution" className="animate-in fade-in-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Phân bố loại sự kiện</CardTitle>
                  <CardDescription>Tỷ lệ các loại sự kiện trong dự án</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ChartContainer
                      config={{
                        commits: { label: "Commits", color: CHART_COLORS.commits },
                        taskCreates: { label: "Tạo task", color: CHART_COLORS.taskCreates },
                        taskUpdates: { label: "Cập nhật task", color: CHART_COLORS.taskUpdates },
                        comments: { label: "Bình luận", color: CHART_COLORS.comments },
                      }}
                    >
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
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Legend />
                      </PieChart>
                    </ChartContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Trạng thái thông báo</CardTitle>
                  <CardDescription>Tỷ lệ thông báo đã đọc và chưa đọc</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ChartContainer
                      config={{
                        read: { label: "Đã đọc", color: CHART_COLORS.read },
                        unread: { label: "Chưa đọc", color: CHART_COLORS.unread },
                      }}
                    >
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
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Legend />
                      </PieChart>
                    </ChartContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-sm mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Phân bố hoạt động theo người dùng</CardTitle>
                <CardDescription>Số lượng hoạt động của từng người dùng</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ChartContainer config={{}}>
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
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="value" fill={CHART_COLORS.commits} />
                    </BarChart>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Chi tiết */}
          <TabsContent value="details" className="animate-in fade-in-50">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Chi tiết sự kiện</CardTitle>
                <CardDescription>Danh sách tất cả sự kiện đã lọc</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Loại sự kiện</TableHead>
                        <TableHead>Người thực hiện</TableHead>
                        <TableHead>Thời gian</TableHead>
                        <TableHead className="hidden md:table-cell">Mô tả</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEvents
                        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                        .slice(0, 50)
                        .map((event) => (
                          <TableRow key={event.id}>
                            <TableCell>
                              <Badge variant="outline">
                                {EVENT_TYPES[event.type as keyof typeof EVENT_TYPES] || event.type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={getUserPhotoURL(event.userId)} />
                                  <AvatarFallback>{getUserDisplayName(event.userId).charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span>{getUserDisplayName(event.userId)}</span>
                              </div>
                            </TableCell>
                            <TableCell>{format(new Date(event.timestamp), "dd/MM/yyyy HH:mm")}</TableCell>
                            <TableCell className="hidden md:table-cell max-w-[300px] truncate">
                              {getEventDescription(event)}
                            </TableCell>
                          </TableRow>
                        ))}
                      {filteredEvents.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center">
                            Không có sự kiện nào phù hợp với bộ lọc
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                {filteredEvents.length > 50 && (
                  <div className="text-center text-sm text-muted-foreground mt-4">
                    Hiển thị 50 sự kiện gần đây nhất trong tổng số {filteredEvents.length} sự kiện
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

