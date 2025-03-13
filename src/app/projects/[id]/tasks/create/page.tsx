"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { ref, get, push, set, query, orderByChild, equalTo } from "firebase/database"
import { database } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Save, Calendar, Clock, Users, GitBranch, Tag, ChevronDown, AlertCircle } from "lucide-react"
import { TASK_STATUS, TASK_PRIORITY, TASK_TYPE } from "@/lib/utils"
import Header from "@/components/layout/header"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import type { User } from "@/types"

type TaskFormValues = {
  title: string
  description: string
  type: string
  priority: string
  assignedTo: string[]
  dueDate: string
  estimatedTime?: number
  parentTaskId?: string
}

export default function CreateTaskPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [projectMembers, setProjectMembers] = useState<User[]>([])
  const [projectTasks, setProjectTasks] = useState<{ id: string; title: string }[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const router = useRouter()
  const { user } = useAuth()
  const params = useParams()
  const projectId = params.id as string

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<TaskFormValues>({
    defaultValues: {
      title: "",
      description: "",
      type: TASK_TYPE.FEATURE,
      priority: TASK_PRIORITY.MEDIUM,
      assignedTo: [],
      dueDate: "",
      estimatedTime: undefined,
      parentTaskId: "",
    },
  })

  const selectedType = watch("type")
  const selectedPriority = watch("priority")

  useEffect(() => {
    const fetchProjectData = async () => {
      if (!user || !projectId) return

      try {
        // Fetch project details to check if user is a member
        const projectRef = ref(database, `projects/${projectId}`)
        const projectSnapshot = await get(projectRef)

        if (!projectSnapshot.exists()) {
          router.push("/projects")
          return
        }

        const projectData = projectSnapshot.val()

        // Check if user is a member of this project
        if (!projectData.members || !projectData.members[user.uid]) {
          router.push("/projects")
          return
        }

        // Fetch all users who are members of this project
        const userIds = Object.keys(projectData.members)
        const membersData: User[] = []

        for (const userId of userIds) {
          const userRef = ref(database, `users/${userId}`)
          const userSnapshot = await get(userRef)

          if (userSnapshot.exists()) {
            membersData.push({
              id: userId,
              ...userSnapshot.val(),
            })
          }
        }

        setProjectMembers(membersData)

        // Fetch tasks for this project (for parent task selection)
        const tasksRef = ref(database, "tasks")
        const tasksQuery = query(tasksRef, orderByChild("projectId"), equalTo(projectId))
        const tasksSnapshot = await get(tasksQuery)

        if (tasksSnapshot.exists()) {
          const tasksData = tasksSnapshot.val()
          const tasksList = Object.entries(tasksData).map(([id, data]: [string, any]) => ({
            id,
            title: data.title,
          }))

          setProjectTasks(tasksList)
        }
      } catch (error) {
        console.error("Error fetching project data:", error)
        setError("Failed to load project data. Please try again.")
      } finally {
        setIsLoadingData(false)
      }
    }

    fetchProjectData()
  }, [user, projectId, router])

  const onSubmit = async (data: TaskFormValues) => {
    if (!user || !projectId) return

    setIsLoading(true)
    setError(null)

    try {
      // Create new task
      const newTaskRef = push(ref(database, "tasks"))

      const newTask = {
        projectId,
        title: data.title,
        description: data.description || "",
        type: data.type,
        status: TASK_STATUS.TODO, // Default status for new tasks
        priority: data.priority,
        assignedTo: data.assignedTo || [],
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        dueDate: data.dueDate || null,
        percentDone: 0, // Default for new tasks
        estimatedTime: data.estimatedTime || null,
        parentTaskId: data.parentTaskId || null,
      }

      await set(newTaskRef, newTask)

      // Create task history entry
      const historyRef = push(ref(database, "taskHistory"))
      const historyEntry = {
        taskId: newTaskRef.key,
        userId: user.uid,
        timestamp: new Date().toISOString(),
        changes: [
          {
            field: "status",
            oldValue: null,
            newValue: TASK_STATUS.TODO,
          },
        ],
        comment: "Task created",
      }

      await set(historyRef, historyEntry)

      // Create notifications for assigned users
      if (data.assignedTo && data.assignedTo.length > 0) {
        for (const assignedUserId of data.assignedTo) {
          if (assignedUserId !== user.uid) {
            // Don't notify the creator
            const notificationRef = push(ref(database, "notifications"))
            const notification = {
              userId: assignedUserId,
              eventType: "CREATE_TASK",
              referenceId: newTaskRef.key,
              message: `You have been assigned to task "${data.title}"`,
              status: "unread",
              createdAt: new Date().toISOString(),
            }

            await set(notificationRef, notification)
          }
        }
      }

      router.push(`/projects/${projectId}/tasks/${newTaskRef.key}`)
    } catch (error) {
      console.error("Error creating task:", error)
      setError("An error occurred while creating the task. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Link
          href={`/projects/${projectId}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Project
        </Link>

        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm animate-fadeIn">
          <div className="p-6 border-b border-border bg-muted/50">
            <h1 className="text-2xl font-bold">Create New Task</h1>
            <p className="text-muted-foreground mt-1">Add a new task to your project</p>
          </div>

          {error && (
            <div className="p-6 bg-destructive/10 border-b border-destructive/20">
              <div className="flex items-start text-destructive">
                <span className="font-medium">{error}</span>
              </div>
            </div>
          )}

          <div className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium mb-1">
                  Title <span className="text-destructive">*</span>
                </label>
                <input
                  id="title"
                  type="text"
                  {...register("title", { required: "Title is required" })}
                  className="w-full p-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  disabled={isLoading}
                  placeholder="Enter task title"
                />
                {errors.title && <p className="text-destructive text-sm mt-1">{errors.title.message}</p>}
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={4}
                  {...register("description")}
                  className="w-full p-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-y"
                  disabled={isLoading}
                  placeholder="Describe the task in detail..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="type" className="block text-sm font-medium mb-1">
                    Type <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <select
                      id="type"
                      {...register("type")}
                      className="w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors appearance-none"
                      disabled={isLoading}
                    >
                      <option value={TASK_TYPE.BUG}>Bug</option>
                      <option value={TASK_TYPE.FEATURE}>Feature</option>
                      <option value={TASK_TYPE.ENHANCEMENT}>Enhancement</option>
                      <option value={TASK_TYPE.DOCUMENTATION}>Documentation</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="priority" className="block text-sm font-medium mb-1">
                    Priority <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <AlertCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <select
                      id="priority"
                      {...register("priority")}
                      className="w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors appearance-none"
                      disabled={isLoading}
                    >
                      <option value={TASK_PRIORITY.LOW}>Low</option>
                      <option value={TASK_PRIORITY.MEDIUM}>Medium</option>
                      <option value={TASK_PRIORITY.HIGH}>High</option>
                      <option value={TASK_PRIORITY.CRITICAL}>Critical</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="assignedTo" className="block text-sm font-medium mb-1">
                  Assign To
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <select
                    id="assignedTo"
                    multiple
                    {...register("assignedTo")}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    disabled={isLoading}
                    size={4}
                  >
                    {projectMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.displayName || member.email}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-muted-foreground text-sm mt-1">Hold Ctrl (or Cmd) to select multiple users</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="dueDate" className="block text-sm font-medium mb-1">
                    Due Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      id="dueDate"
                      type="date"
                      {...register("dueDate")}
                      className="w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="estimatedTime" className="block text-sm font-medium mb-1">
                    Estimated Time (hours)
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      id="estimatedTime"
                      type="number"
                      min="0"
                      step="0.5"
                      {...register("estimatedTime", { valueAsNumber: true })}
                      className="w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                      disabled={isLoading}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="parentTaskId" className="block text-sm font-medium mb-1">
                  Parent Task (optional)
                </label>
                <div className="relative">
                  <GitBranch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <select
                    id="parentTaskId"
                    {...register("parentTaskId")}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors appearance-none"
                    disabled={isLoading}
                  >
                    <option value="">None</option>
                    {projectTasks.map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.title}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <Link href={`/projects/${projectId}`}>
                  <Button variant="outline" disabled={isLoading} className="rounded-lg">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={isLoading} className="rounded-lg">
                  {isLoading ? (
                    "Creating..."
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" /> Create Task
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}

