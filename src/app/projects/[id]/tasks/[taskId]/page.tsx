"use client"

import type React from "react"

import Header from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useAuth } from "@/contexts/auth-context"
import { database } from "@/lib/firebase"
import { formatTextWithLinks } from "@/lib/format-text-with-links"
import {
  formatDate,
  formatDateTime,
  getPriorityColor,
  getStatusColor,
  getStatusLabel,
  getTypeColor,
  TASK_STATUS,
} from "@/lib/utils"
import type { Comment, User as FirebaseUser, Task, TaskHistory } from "@/types"
import { equalTo, get, orderByChild, push, query, ref, set, update } from "firebase/database"
import { ArrowLeft, Calendar, ChevronDown, ChevronRight, ChevronUp, Clock, Edit, ExternalLink, GitCommit, MessageSquare, User } from 'lucide-react'
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function TaskDetailPage() {
  const [task, setTask] = useState<Task | null>(null)
  const [users, setUsers] = useState<Record<string, FirebaseUser>>({})
  const [comments, setComments] = useState<Comment[]>([])
  const [history, setHistory] = useState<TaskHistory[]>([])
  const [parentTask, setParentTask] = useState<Task | null>(null)
  const [childTasks, setChildTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState("")
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [commitId, setCommitId] = useState("")
  const [showChildTasks, setShowChildTasks] = useState(true)
  const [projectData, setProjectData] = useState<any>(null)
  const { user } = useAuth()
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const taskId = params.taskId as string
  const [usersLoading, setUsersLoading] = useState<Record<string, boolean>>({});

  // Thêm hàm tính toán percentDone dựa trên task con
  const calculatePercentDone = (tasks: Task[]) => {
    if (!tasks || tasks.length === 0) return 0;

    const totalPercent = tasks.reduce((sum, task) => {
      return sum + (task.percentDone || 0);
    }, 0);

    return Math.round(totalPercent / tasks.length);
  };

  // Thêm hàm cập nhật percentDone cho task cha
  const updateParentTaskProgress = async (parentTaskId: string, childTasks: Task[]) => {
    if (!parentTaskId || childTasks.length === 0) return;

    try {
      const newPercentDone = calculatePercentDone(childTasks);

      // Cập nhật task cha trong database
      const parentTaskRef = ref(database, `tasks/${parentTaskId}`);
      await update(parentTaskRef, {
        percentDone: newPercentDone,
        updatedAt: new Date().toISOString(),
      });

      // Nếu đang xem task cha, cập nhật state
      if (task && task.id === parentTaskId) {
        setTask(prev => prev ? { ...prev, percentDone: newPercentDone, updatedAt: new Date().toISOString() } : prev);
      }

      // Tạo history entry
      if (user) {
        const historyRef = push(ref(database, "taskHistory"));
        const historyEntry = {
          taskId: parentTaskId,
          userId: user.uid,
          timestamp: new Date().toISOString(),
          changes: [
            {
              field: "percentDone",
              oldValue: task?.percentDone?.toString() || "0",
              newValue: newPercentDone.toString(),
            },
          ],
          comment: "Progress updated automatically based on subtasks",
        };

        await set(historyRef, historyEntry);

        // Cập nhật history state nếu đang xem task cha
        if (task && task.id === parentTaskId) {
          setHistory([
            {
              id: historyRef.key as string,
              ...historyEntry,
            },
            ...history,
          ]);
        }
      }
    } catch (error) {
      console.error("Error updating parent task progress:", error);
    }
  };

  useEffect(() => {
    const fetchTaskData = async () => {
      if (!user || !projectId || !taskId) return

      try {
        // Fetch task details
        const taskRef = ref(database, `tasks/${taskId}`)
        const taskSnapshot = await get(taskRef)

        if (!taskSnapshot.exists()) {
          router.push(`/projects/${projectId}`)
          return
        }

        const taskData = {
          id: taskId,
          ...taskSnapshot.val(),
        }

        // Check if task belongs to this project
        if (taskData.projectId !== projectId) {
          router.push(`/projects/${projectId}`)
          return
        }

        setTask(taskData)

        // Fetch project to check if user is a member
        const projectRef = ref(database, `projects/${projectId}`)
        const projectSnapshot = await get(projectRef)

        if (!projectSnapshot.exists()) {
          router.push("/projects")
          return
        }

        const projectData = projectSnapshot.val()
        setProjectData(projectData)

        // Check if user is a member of this project
        if (!projectData.members || !projectData.members[user.uid]) {
          router.push("/projects")
          return
        }

        // Fetch all users involved in this task
        const userIds = new Set<string>()
        userIds.add(taskData.createdBy)

        if (taskData.assignedTo) {
          taskData.assignedTo.forEach((id: string) => userIds.add(id))
        }

        const usersData: Record<string, FirebaseUser> = {}

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

        // Fetch comments for this task
        const commentsRef = ref(database, "comments")
        const commentsQuery = query(commentsRef, orderByChild("taskId"), equalTo(taskId))
        const commentsSnapshot = await get(commentsQuery)

        if (commentsSnapshot.exists()) {
          const commentsData = commentsSnapshot.val()
          const commentsList = Object.entries(commentsData)
            .map(([id, data]: [string, any]) => ({
              id,
              ...data,
            }))
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

          setComments(commentsList)

          // Add comment authors to users
          for (const comment of commentsList) {
            if (!usersData[comment.userId]) {
              const userRef = ref(database, `users/${comment.userId}`)
              const userSnapshot = await get(userRef)

              if (userSnapshot.exists()) {
                usersData[comment.userId] = {
                  id: comment.userId,
                  ...userSnapshot.val(),
                }
              }
            }
          }
        }

        // Fetch task history
        const historyRef = ref(database, "taskHistory")
        const historyQuery = query(historyRef, orderByChild("taskId"), equalTo(taskId))
        const historySnapshot = await get(historyQuery)

        if (historySnapshot.exists()) {
          const historyData = historySnapshot.val()
          const historyList = Object.entries(historyData)
            .map(([id, data]: [string, any]) => ({
              id,
              ...data,
            }))
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

          setHistory(historyList)

          // Add history authors to users
          for (const entry of historyList) {
            if (!usersData[entry.userId]) {
              const userRef = ref(database, `users/${entry.userId}`)
              const userSnapshot = await get(userRef)

              if (userSnapshot.exists()) {
                usersData[entry.userId] = {
                  id: entry.userId,
                  ...userSnapshot.val(),
                }
              }
            }
          }
        }

        // Fetch parent task if exists
        if (taskData.parentTaskId) {
          const parentTaskRef = ref(database, `tasks/${taskData.parentTaskId}`)
          const parentTaskSnapshot = await get(parentTaskRef)

          if (parentTaskSnapshot.exists()) {
            setParentTask({
              id: taskData.parentTaskId,
              ...parentTaskSnapshot.val(),
            })
          }
        }

        // Fetch child tasks
        const tasksRef = ref(database, "tasks")
        const childTasksQuery = query(tasksRef, orderByChild("parentTaskId"), equalTo(taskId))
        const childTasksSnapshot = await get(childTasksQuery)

        if (childTasksSnapshot.exists()) {
          const childTasksData = childTasksSnapshot.val()
          const childTasksList = Object.entries(childTasksData).map(([id, data]: [string, any]) => ({
            id,
            ...data,
          }))

          setChildTasks(childTasksList)

          // Kiểm tra nếu task này không có percentDone được thiết lập từ trước
          // hoặc nếu có percentDone khác với giá trị tính toán từ các task con
          // thì cập nhật percentDone dựa trên task con
          if (childTasksList.length > 0) {
            const calculatedPercent = calculatePercentDone(childTasksList);
            if (taskData.percentDone === undefined || taskData.percentDone !== calculatedPercent) {
              const taskRef = ref(database, `tasks/${taskId}`);
              await update(taskRef, {
                percentDone: calculatedPercent,
                updatedAt: new Date().toISOString()
              });

              // Cập nhật task trong state
              setTask({
                ...taskData,
                percentDone: calculatedPercent,
                updatedAt: new Date().toISOString()
              });
            }
          }
        }

        setUsers(usersData)
      } catch (error) {
        console.error("Error fetching task data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchTaskData()
  }, [user, projectId, taskId, router])

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !taskId || !commentText.trim()) return

    setIsSubmittingComment(true)

    try {
      // Create new comment
      const newCommentRef = push(ref(database, "comments"))

      const newComment = {
        taskId,
        userId: user.uid,
        content: commentText.trim(),
        createdAt: new Date().toISOString(),
      }

      await set(newCommentRef, newComment)

      // Create notification for task assignees
      if (task?.assignedTo) {
        for (const assignedUserId of task.assignedTo) {
          if (assignedUserId !== user.uid) {
            // Don't notify the commenter
            const notificationRef = push(ref(database, "notifications"))
            const notification = {
              userId: assignedUserId,
              eventType: "ADD_COMMENT",
              referenceId: taskId,
              message: `New comment on task "${task.title}"`,
              status: "unread",
              createdAt: new Date().toISOString(),
            }

            await set(notificationRef, notification)
          }
        }
      }

      // Add comment to local state
      setComments([
        ...comments,
        {
          id: newCommentRef.key as string,
          ...newComment,
        },
      ])

      setCommentText("")
    } catch (error) {
      console.error("Error submitting comment:", error)
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const handleStatusUpdate = async (newStatus: string) => {
    if (!user || !task) return

    setIsUpdatingStatus(true)

    try {
      const oldStatus = task.status

      // Update task status
      const taskRef = ref(database, `tasks/${taskId}`)

      const updates: { status: string; updatedAt: string; gitCommitId?: string } = {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      }

      // If resolving and there's a commit ID, link it
      if (newStatus === TASK_STATUS.RESOLVED && commitId.trim()) {
        updates.gitCommitId = commitId.trim()
      }

      await update(taskRef, updates)

      // Create task history entry
      const historyRef = push(ref(database, "taskHistory"))
      const historyEntry = {
        taskId,
        userId: user.uid,
        timestamp: new Date().toISOString(),
        changes: [
          {
            field: "status",
            oldValue: oldStatus,
            newValue: newStatus,
          },
        ],
        comment: commitId.trim() ? `Status updated with commit: ${commitId.trim()}` : "Status updated",
      }

      await set(historyRef, historyEntry)

      // Create notifications for task assignees
      if (task.assignedTo) {
        for (const assignedUserId of task.assignedTo) {
          if (assignedUserId !== user.uid) {
            // Don't notify the updater
            const notificationRef = push(ref(database, "notifications"))
            const notification = {
              userId: assignedUserId,
              eventType: "UPDATE_TASK",
              referenceId: taskId,
              message: `Task "${task.title}" status changed to ${getStatusLabel(newStatus)}`,
              status: "unread",
              createdAt: new Date().toISOString(),
            }

            await set(notificationRef, notification)
          }
        }
      }

      // Update local state
      setTask({
        ...task,
        status: newStatus,
        updatedAt: new Date().toISOString(),
        gitCommitId: newStatus === TASK_STATUS.RESOLVED && commitId.trim() ? commitId.trim() : task.gitCommitId,
      })

      setHistory([
        {
          id: historyRef.key as string,
          ...historyEntry,
        },
        ...history,
      ])

      setCommitId("")
    } catch (error) {
      console.error("Error updating status:", error)
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const canUpdateStatus = () => {
    if (!user || !task || !projectData) return false

    // Get user roles in this project
    const roles = projectData.members?.[user.uid]?.roles || []

    // Check if user can update based on current status and role
    switch (task.status) {
      case TASK_STATUS.TODO:
        // Anyone assigned to the task or developers can move from Todo to In Progress
        return task.assignedTo?.includes(user.uid) || roles.includes("dev")
      case TASK_STATUS.IN_PROGRESS:
        // Only developers can move from In Progress to Resolved
        return roles.includes("dev")
      case TASK_STATUS.RESOLVED:
        // Only testers can move from Resolved to Closed
        return roles.includes("tester")
      case TASK_STATUS.CLOSED:
        // Only testers can reopen a closed task
        return roles.includes("tester")
      default:
        return false
    }
  }

  const getNextStatus = () => {
    switch (task?.status) {
      case TASK_STATUS.TODO:
        return TASK_STATUS.IN_PROGRESS
      case TASK_STATUS.IN_PROGRESS:
        return TASK_STATUS.RESOLVED
      case TASK_STATUS.RESOLVED:
        return TASK_STATUS.CLOSED
      case TASK_STATUS.CLOSED:
        return TASK_STATUS.TODO // Reopen
      default:
        return null
    }
  }

  const getNextStatusLabel = () => {
    switch (task?.status) {
      case TASK_STATUS.TODO:
        return "Start Progress"
      case TASK_STATUS.IN_PROGRESS:
        return "Resolve"
      case TASK_STATUS.RESOLVED:
        return "Close"
      case TASK_STATUS.CLOSED:
        return "Reopen"
      default:
        return ""
    }
  }

  const fetchUserData = async (userId: string) => {
    setUsersLoading(prev => ({ ...prev, [userId]: true }));
    try {
      const userRef = ref(database, `users/${userId}`);
      const userSnapshot = await get(userRef);
      if (userSnapshot.exists()) {
        setUsers(prev => ({
          ...prev,
          [userId]: {
            id: userId,
            ...userSnapshot.val()
          }
        }));
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setUsersLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

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

  if (!task) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Task not found</h2>
            <p className="text-muted-foreground mb-6">
              The task you're looking for doesn't exist or you don't have access to it.
            </p>
            <Link href={`/projects/${projectId}`}>
              <Button className="rounded-lg">Go to Project</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <Link
          href={`/projects/${projectId}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Project
        </Link>

        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm mb-8 animate-fadeIn">
          <div className="p-4 md:p-6 border-b border-border bg-muted/50">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
              <h1 className="text-xl md:text-2xl font-bold break-words">{task.title}</h1>

              <div className="flex items-center space-x-2 self-start">
                <Link href={`/projects/${projectId}/tasks/${taskId}/edit`}>
                  <Button variant="outline" size="sm" className="rounded-lg">
                    <Edit className="mr-2 h-4 w-4" /> Edit
                  </Button>
                </Link>

                {canUpdateStatus() && (
                  <Button
                    onClick={() => handleStatusUpdate(getNextStatus() as string)}
                    disabled={isUpdatingStatus}
                    size="sm"
                    className="rounded-lg"
                  >
                    {getNextStatusLabel()}
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <Badge className={getTypeColor(task.type)}>
                {task.type.charAt(0).toUpperCase() + task.type.slice(1)}
              </Badge>

              <Badge className={getStatusColor(task.status)}>{getStatusLabel(task.status)}</Badge>

              <Badge className={getPriorityColor(task.priority)}>
                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
              </Badge>
            </div>

            {parentTask && (
              <div className="mb-4 p-3 bg-muted rounded-lg">
                <p className="text-sm flex items-center">
                  <span className="text-muted-foreground mr-2">Parent Task:</span>
                  <Link
                    href={`/projects/${projectId}/tasks/${parentTask.id}`}
                    className="text-primary hover:underline flex items-center"
                  >
                    {parentTask.title}
                    <ChevronRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </p>
              </div>
            )}

            <div className="prose dark:prose-invert max-w-none mb-6">
              {task.description ? (
                <div
                  className="break-words"
                  dangerouslySetInnerHTML={{
                    __html: formatTextWithLinks(task.description, projectData?.githubRepo),
                  }}
                />
              ) : (
                <p className="text-muted-foreground italic">No description provided</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="flex items-center">
                <User className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                <span className="text-sm text-muted-foreground">Created by:</span>
                <span className="text-sm ml-2 font-medium truncate">
                  {users[task.createdBy]?.displayName || "Unknown user"}
                </span>
              </div>

              <div className="flex items-center">
                <Calendar className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                <span className="text-sm text-muted-foreground">Created:</span>
                <span className="text-sm ml-2">{formatDate(task.createdAt)}</span>
              </div>

              <div className="flex items-center">
                <User className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                <span className="text-sm text-muted-foreground">Assigned to:</span>
                <div className="flex ml-2 flex-wrap">
                  {task.assignedTo && task.assignedTo.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {task.assignedTo.map((userId) => (
                        <div
                          key={userId}
                          className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium ring-2 ring-card"
                          title={users[userId]?.displayName || "Unknown user"}
                        >
                          {users[userId]?.displayName?.charAt(0) || "?"}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground italic">Unassigned</span>
                  )}
                </div>
              </div>

              {task.dueDate && (
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">Due date:</span>
                  <span className="text-sm ml-2">{formatDate(task.dueDate)}</span>
                </div>
              )}

              {task.estimatedTime && (
                <div className="flex items-center">
                  <Clock className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">Estimated time:</span>
                  <span className="text-sm ml-2">{task.estimatedTime} hours</span>
                </div>
              )}
              {task.percentDone !== undefined && (
                <div className="flex items-center col-span-1 sm:col-span-2">
                  <Clock className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">Progress:</span>
                  <div className="ml-2 w-full max-w-xs bg-muted rounded-full h-2.5 dark:bg-muted overflow-hidden">
                    <div
                      className="bg-primary h-2.5 rounded-full"
                      style={{ width: `${task.percentDone}%` }}
                      title={`${task.percentDone}% complete`}
                    ></div>
                  </div>
                  <span className="text-xs ml-2">{task.percentDone}%</span>
                </div>
              )}

              {task.tags && task.tags.length > 0 && (
                <div className="flex items-center col-span-1 sm:col-span-2">
                  <span className="text-sm text-muted-foreground mr-2">Tags:</span>
                  <div className="flex flex-wrap gap-1">
                    {task.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {task.gitCommitId && (
                <div className="flex items-center col-span-1 sm:col-span-2">
                  <GitCommit className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">Commit ID:</span>
                  {projectData?.githubRepo ? (
                    <a
                      href={`https://github.com/${projectData.githubRepo}/commit/${task.gitCommitId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm ml-2 font-mono text-primary hover:underline flex items-center"
                    >
                      {task.gitCommitId}
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-sm ml-2 font-mono">{task.gitCommitId}</span>
                  )}
                </div>
              )}
            </div>

            {task.status === TASK_STATUS.IN_PROGRESS && user && (
              <div className="mb-6 p-4 border border-border rounded-lg bg-card">
                <h3 className="text-sm font-medium mb-2">Link a commit when resolving</h3>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Enter commit ID or hash"
                    value={commitId}
                    onChange={(e) => setCommitId(e.target.value)}
                    className="flex-1 p-2 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  />
                  <Button
                    onClick={() => handleStatusUpdate(TASK_STATUS.RESOLVED)}
                    disabled={isUpdatingStatus}
                    size="sm"
                    className="rounded-lg"
                  >
                    Resolve with Commit
                  </Button>
                </div>
              </div>
            )}

            {childTasks.length > 0 && (
              <div className="mb-6">
                <div
                  className="flex items-center justify-between cursor-pointer mb-2"
                  onClick={() => setShowChildTasks(!showChildTasks)}
                >
                  <h3 className="text-lg font-medium">Subtasks ({childTasks.length})</h3>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-full">
                    {showChildTasks ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>

                {showChildTasks && (
                  <div className="bg-muted rounded-lg overflow-hidden overflow-x-auto">
                    <table className="w-full min-w-[500px]">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="px-4 py-2 text-left text-sm font-medium">Title</th>
                          <th className="px-4 py-2 text-left text-sm font-medium">Status</th>
                          <th className="px-4 py-2 text-left text-sm font-medium">Assigned To</th>
                          <th className="px-4 py-2 text-left text-sm font-medium">Progress</th>
                        </tr>
                      </thead>
                      <tbody>
                        {childTasks.map((childTask) => (
                          <tr
                            key={childTask.id}
                            className="border-b border-border last:border-0 hover:bg-muted/70 transition-colors"
                          >
                            <td className="px-4 py-2">
                              <Link
                                href={`/projects/${projectId}/tasks/${childTask.id}`}
                                className="text-primary hover:underline"
                              >
                                {childTask.title}
                              </Link>
                            </td>
                            <td className="px-4 py-2">
                              <Badge className={getStatusColor(childTask.status)}>
                                {getStatusLabel(childTask.status)}
                              </Badge>
                            </td>
                            <td className="px-4 py-2">
                              {childTask.assignedTo && childTask.assignedTo.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {childTask.assignedTo.map((userId) => {
                                    if (!users[userId] && !usersLoading[userId]) {
                                      fetchUserData(userId);
                                    }

                                    return (
                                      <div key={userId} className="flex items-center gap-2">
                                        <div
                                          className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium ring-2 ring-muted"
                                          title={users[userId]?.displayName || "Loading user..."}
                                        >
                                          {users[userId]?.displayName?.charAt(0) || "?"}
                                        </div>
                                        <span className="text-sm font-medium">
                                          {users[userId]?.displayName || "Loading user..."}
                                        </span>
                                      </div>
                                    );
                                  })}

                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground italic">Unassigned</span>
                              )}
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                {childTask.percentDone !== undefined && (
                                  <div className="flex items-center col-span-1 sm:col-span-2">
                                    <Clock className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                                    <span className="text-xs ml-2">{childTask.percentDone}%</span>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Comments</h2>

            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm mb-6 animate-fadeIn">
              <div className="p-4">
                <form onSubmit={handleCommentSubmit}>
                  <textarea
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="w-full p-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors min-h-[100px] resize-y"
                    disabled={isSubmittingComment}
                  />
                  <div className="flex justify-end mt-2">
                    <Button type="submit" disabled={isSubmittingComment || !commentText.trim()} className="rounded-lg">
                      {isSubmittingComment ? "Submitting..." : "Add Comment"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>

            {comments.length === 0 ? (
              <div className="text-center py-12 bg-card border border-border rounded-xl shadow-sm animate-fadeIn">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <h3 className="text-lg font-medium mb-1">No comments yet</h3>
                <p className="text-muted-foreground">Be the first to comment on this task</p>
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="bg-card border border-border rounded-xl overflow-hidden shadow-sm animate-fadeIn"
                  >
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center">
                          <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium mr-3">
                            {users[comment.userId]?.displayName?.charAt(0) || "?"}
                          </div>
                          <div>
                            <p className="font-medium">{users[comment.userId]?.displayName || "Unknown user"}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDateTime(comment.createdAt)}
                              {comment.updatedAt && " (edited)"}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="prose dark:prose-invert max-w-none pl-12">
                        <div
                          dangerouslySetInnerHTML={{
                            __html: formatTextWithLinks(comment.content, projectData?.githubRepo),
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">History</h2>

            {history.length === 0 ? (
              <div className="text-center py-12 bg-card border border-border rounded-xl shadow-sm animate-fadeIn">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <h3 className="text-lg font-medium mb-1">No history yet</h3>
                <p className="text-muted-foreground">Task history will appear here</p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm animate-fadeIn">
                <div className="p-4">
                  <ul className="space-y-4">
                    {history.map((entry) => (
                      <li key={entry.id} className="border-b border-border last:border-0 pb-4 last:pb-0">
                        <div className="flex items-start mb-1">
                          <div className="h-7 w-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-medium mr-2 mt-0.5">
                            {users[entry.userId]?.displayName?.charAt(0) || "?"}
                          </div>
                          <div>
                            <p className="text-sm">
                              <span className="font-medium">{users[entry.userId]?.displayName || "Unknown user"}</span>{" "}
                              {entry.changes.map((change, index) => (
                                <span key={index}>
                                  {index > 0 && ", "}
                                  changed {change.field} from{" "}
                                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                                    {change.oldValue || "none"}
                                  </span>{" "}
                                  to{" "}
                                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                                    {change.newValue}
                                  </span>
                                </span>
                              ))}
                            </p>
                            <p className="text-xs text-muted-foreground">{formatDateTime(entry.timestamp)}</p>
                          </div>
                        </div>
                        {entry.comment && (
                          <div
                            className="text-sm ml-9 mt-1 text-muted-foreground"
                            dangerouslySetInnerHTML={{
                              __html: formatTextWithLinks(entry.comment, projectData?.githubRepo),
                            }}
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
