"use client"

import type React from "react"

import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { Input } from "@/components/ui/input"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { database } from "@/lib/firebase"
import type { Project } from "@/types"
import { TASK_PRIORITY, TASK_STATUS, TASK_TYPE } from "@/types"
import { equalTo, get, orderByChild, push, query, ref, set } from "firebase/database"
import { ArrowLeft, GitCommit, Save } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { AssigneeGroup } from "@/components/ui/assignee-group"

// Hàm trích xuất commit id từ chuỗi đầu vào.
const extractCommitId = (input: string): string => {
  if (!input) return ""
  const trimmed = input.trim()
  const urlRegex = /commit\/([a-f0-9]{7,40})/i
  const idRegex = /^[a-f0-9]{7,40}$/i

  const matchUrl = trimmed.match(urlRegex)
  if (matchUrl) {
    return matchUrl[1]
  }
  if (idRegex.test(trimmed)) {
    return trimmed
  }
  return ""
}

export default function CreateTaskPage() {
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [project, setProject] = useState<Project | null>(null)
  const [availableMembers, setAvailableMembers] = useState<Record<string, any>>({})
  const [projectTasks, setProjectTasks] = useState<{ id: string; title: string; assignedTo?: string[] }[]>([])
  const { user } = useAuth()
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const { toast } = useToast()

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [type, setType] = useState(TASK_TYPE.FEATURE)
  const [priority, setPriority] = useState(TASK_PRIORITY.MEDIUM)
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined)
  const [percentDone, setPercentDone] = useState(0)
  const [estimatedTime, setEstimatedTime] = useState<number | undefined>(undefined)
  const [assignedTo, setAssignedTo] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState<string>("")
  const [parentTaskId, setParentTaskId] = useState<string | null>(null)
  const [parentTaskTitle, setParentTaskTitle] = useState<string>("")
  const [parentTaskSearch, setParentTaskSearch] = useState("")
  const [commitId, setCommitId] = useState<string>("")

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !projectId) return

      try {
        // Fetch project details
        const projectRef = ref(database, `projects/${projectId}`)
        const projectSnapshot = await get(projectRef)

        if (!projectSnapshot.exists()) {
          toast({
            title: "Project not found",
            description: "The project you're looking for doesn't exist",
            variant: "destructive",
          })
          router.push("/projects")
          return
        }

        const projectData = {
          id: projectId,
          ...projectSnapshot.val(),
        } as Project

        setProject(projectData)

        // Check if user has permission to create tasks
        const userRoles = projectData.members?.[user.uid]?.roles || []
        const canCreateTask = userRoles.some((role) => ["admin", "dev", "tester"].includes(role))

        if (!canCreateTask) {
          toast({
            title: "Access denied",
            description: "You don't have permission to create tasks in this project",
            variant: "destructive",
          })
          router.push(`/projects/${projectId}`)
          return
        }

        // Fetch project members for assignment
        if (projectData.members) {
          const members: Record<string, any> = {}

          for (const [memberId, memberData] of Object.entries(projectData.members)) {
            const userRef = ref(database, `users/${memberId}`)
            const userSnapshot = await get(userRef)

            if (userSnapshot.exists()) {
              members[memberId] = {
                id: memberId,
                ...userSnapshot.val(),
                roles: memberData.roles,
              }
            }
          }

          setAvailableMembers(members)
        }

        // Fetch project tasks for parent task selection
        const tasksRef = ref(database, "tasks")
        const tasksQuery = query(tasksRef, orderByChild("projectId"), equalTo(projectId))
        const tasksSnapshot = await get(tasksQuery)

        if (tasksSnapshot.exists()) {
          const tasksData = tasksSnapshot.val()
          const tasksList = Object.entries(tasksData).map(([id, data]: [string, any]) => ({
            id,
            title: data.title,
            assignedTo: data.assignedTo || [],
          }))
          setProjectTasks(tasksList)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          title: "Error",
          description: "Failed to load project data. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, projectId, router, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !projectId) return

    if (!title.trim()) {
      toast({
        title: "Validation error",
        description: "Task title is required",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)

    try {
      const parsedCommitId = extractCommitId(commitId)

      // Create new task
      const newTaskRef = push(ref(database, "tasks"))
      const newTask = {
        projectId,
        title,
        description: description || "",
        type,
        status: TASK_STATUS.TODO,
        priority,
        assignedTo: assignedTo || [],
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        dueDate: dueDate ? dueDate.toISOString() : null,
        percentDone: 0,
        estimatedTime: estimatedTime !== undefined ? estimatedTime : null,
        parentTaskId: parentTaskId || null,
        tags,
        gitCommitId: parsedCommitId || null,
      }

      await set(newTaskRef, newTask)

      // Create task history
      const historyRef = push(ref(database, "taskHistory"))
      const historyEntry = {
        taskId: newTaskRef.key,
        userId: user.uid,
        timestamp: new Date().toISOString(),
        changes: [{ field: "status", oldValue: null, newValue: TASK_STATUS.TODO }],
        comment: "Task created",
      }
      await set(historyRef, historyEntry)

      // Create notifications for assigned members
      if (assignedTo && assignedTo.length > 0) {
        for (const assignedUserId of assignedTo) {
          if (assignedUserId !== user.uid) {
            const notificationRef = push(ref(database, "notifications"))
            const notification = {
              userId: assignedUserId,
              eventType: "CREATE_TASK",
              referenceId: newTaskRef.key,
              message: `You have been assigned to task "${title}"`,
              status: "unread",
              createdAt: new Date().toISOString(),
            }
            await set(notificationRef, notification)
          }
        }
      }

      toast({
        title: "Task created",
        description: "New task has been created successfully",
        variant: "success",
      })

      setTimeout(() => {
        router.push(`/projects/${projectId}/tasks/${newTaskRef.key}`)
      }, 1500)
    } catch (error) {
      console.error("Error creating task:", error)
      toast({
        title: "Error",
        description: "Failed to create task. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const filteredTasks = useMemo(() => {
    return projectTasks.filter((task) => task.title.toLowerCase().includes(parentTaskSearch.toLowerCase()))
  }, [parentTaskSearch, projectTasks])

  // Convert available members to array for AssigneeGroup component
  const getAssigneeUsers = () => {
    if (!assignedTo) return []
    return assignedTo.filter((id) => availableMembers[id]).map((id) => availableMembers[id])
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <LoadingSpinner />
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

        <PageHeader title="Create Task" description={`Add a new task to ${project.name}`} />

        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm animate-bounce-in">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4 md:col-span-2">
                <label htmlFor="title" className="block text-sm font-medium">
                  Task Title <span className="text-destructive">*</span>
                </label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  disabled={isSaving}
                  className="w-full"
                  placeholder="Enter task title"
                />
              </div>

              <div className="space-y-4 md:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium">
                  Description
                </label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  disabled={isSaving}
                  className="w-full"
                  placeholder="Describe the task in detail..."
                />
              </div>

              <div className="space-y-4">
                <label htmlFor="type" className="block text-sm font-medium">
                  Type <span className="text-destructive">*</span>
                </label>
                <Select value={type} onValueChange={setType} disabled={isSaving}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TASK_TYPE.BUG}>Bug</SelectItem>
                    <SelectItem value={TASK_TYPE.FEATURE}>Feature</SelectItem>
                    <SelectItem value={TASK_TYPE.ENHANCEMENT}>Enhancement</SelectItem>
                    <SelectItem value={TASK_TYPE.DOCUMENTATION}>Documentation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <label htmlFor="status" className="block text-sm font-medium">
                  Status
                </label>
                <Select value={TASK_STATUS.TODO} disabled={true}>
                  <SelectTrigger>
                    <SelectValue placeholder="To Do" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TASK_STATUS.TODO}>To Do</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">New tasks are set to "To Do" by default</p>
              </div>

              <div className="space-y-4">
                <label htmlFor="priority" className="block text-sm font-medium">
                  Priority <span className="text-destructive">*</span>
                </label>
                <Select value={priority} onValueChange={setPriority} disabled={isSaving}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TASK_PRIORITY.LOW}>Low</SelectItem>
                    <SelectItem value={TASK_PRIORITY.MEDIUM}>Medium</SelectItem>
                    <SelectItem value={TASK_PRIORITY.HIGH}>High</SelectItem>
                    <SelectItem value={TASK_PRIORITY.CRITICAL}>Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <label htmlFor="dueDate" className="block text-sm font-medium">
                  Due Date
                </label>
                <DatePicker date={dueDate} setDate={setDueDate} disabled={isSaving} />
              </div>

              <div className="space-y-4">
                <label htmlFor="estimatedTime" className="block text-sm font-medium">
                  Estimated Time (hours)
                </label>
                <Input
                  id="estimatedTime"
                  type="number"
                  min={0}
                  step={0.5}
                  value={estimatedTime || ""}
                  onChange={(e) => setEstimatedTime(e.target.value ? Number.parseFloat(e.target.value) : undefined)}
                  disabled={isSaving}
                  className="w-full"
                  placeholder="0"
                />
              </div>

              <div className="space-y-4">
                <label htmlFor="commitId" className="text-sm font-medium flex items-center">
                  <GitCommit className="h-4 w-4 mr-2" />
                  Commit ID or URL
                </label>
                <Input
                  id="commitId"
                  value={commitId}
                  onChange={(e) => setCommitId(e.target.value)}
                  placeholder="Enter commit ID or GitHub commit URL"
                  disabled={isSaving}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  {project.githubRepo
                    ? `Enter a commit ID or URL from ${project.githubRepo}`
                    : "Enter a commit ID or GitHub commit URL"}
                </p>
              </div>

              <div className="space-y-4">
                <label htmlFor="parentTask" className="block text-sm font-medium">
                  Parent Task (optional)
                </label>
                <Select
                  value={parentTaskId || ""}
                  onValueChange={(value) => {
                    setParentTaskId(value === "none" ? null : value)
                    const taskTitle = projectTasks.find((task) => task.id === value)?.title || ""
                    setParentTaskTitle(taskTitle)
                  }}
                  disabled={isSaving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent task" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Thanh tìm kiếm tích hợp trong dropdown */}
                    <div className="p-2">
                      <Input
                        autoFocus
                        value={parentTaskSearch}
                        onChange={(e) => setParentTaskSearch(e.target.value)}
                        placeholder="Search tasks..."
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <SelectItem value="none">None</SelectItem>
                    {filteredTasks.map((task) => (
                      <SelectItem key={task.id} value={task.id}>
                        <div className="truncate max-w-[200px]">
                          {task.title}{" "}
                          {(task.assignedTo ?? []).length > 0 &&
                            `- ${(task.assignedTo ?? [])
                              .map((id) => availableMembers[id]?.displayName || availableMembers[id]?.email)
                              .join(", ")}`}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4 md:col-span-2">
                <label className="block text-sm font-medium">Assigned To</label>

                {assignedTo.length > 0 && (
                  <div className="mb-2">
                    <AssigneeGroup users={getAssigneeUsers()} />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(availableMembers).map(([memberId, memberData]: [string, any]) => (
                    <div key={memberId} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`member-${memberId}`}
                        checked={assignedTo.includes(memberId)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAssignedTo([...assignedTo, memberId])
                          } else {
                            setAssignedTo(assignedTo.filter((id) => id !== memberId))
                          }
                        }}
                        disabled={isSaving}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <label htmlFor={`member-${memberId}`} className="text-sm truncate">
                        {memberData.displayName || memberData.email}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4 md:col-span-2">
                <label htmlFor="tagInput" className="block text-sm font-medium">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <div key={index} className="flex items-center bg-muted px-2 py-1 rounded-full text-sm">
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => setTags(tags.filter((t) => t !== tag))}
                        className="ml-2 text-red-500"
                        disabled={isSaving}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
                <Input
                  id="tagInput"
                  placeholder="Enter tag and press Enter"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && tagInput.trim() !== "") {
                      e.preventDefault()
                      if (!tags.includes(tagInput.trim())) {
                        setTags([...tags, tagInput.trim()])
                      }
                      setTagInput("")
                    }
                  }}
                  disabled={isSaving}
                  className="w-full mt-2"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-4 border-t border-border">
              <Link href={`/projects/${projectId}`}>
                <Button type="button" variant="outline" disabled={isSaving} className="rounded-lg shadow-sm">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={isSaving} className="rounded-lg shadow-sm">
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Creating..." : "Create Task"}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}

