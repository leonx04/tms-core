"use client"

import type React from "react"

import { PageHeader } from "@/components/layout/page-header"
import { AssigneeGroup } from "@/components/ui/assignee-group"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { database } from "@/config/firebase"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import type { Project, Task, TaskHistory } from "@/types"
import { TASK_PRIORITY, TASK_STATUS, TASK_TYPE } from "@/types"
import { equalTo, get, orderByChild, push, query, ref, set, update } from "firebase/database"
import { ArrowLeft, GitCommit, Save } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

// Extract commit ID from input string
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

// Compare two values and determine if they're different
// This handles various types including arrays, dates, and primitives
const isDifferent = (oldValue: any, newValue: any): boolean => {
  // Handle null/undefined cases
  if (oldValue === null && newValue === null) return false
  if (oldValue === undefined && newValue === undefined) return false
  if (oldValue === null && newValue === undefined) return false
  if (oldValue === undefined && newValue === null) return false
  if ((oldValue === null || oldValue === undefined) && newValue) return true
  if (oldValue && (newValue === null || newValue === undefined)) return true

  // Handle arrays (like assignedTo, tags)
  if (Array.isArray(oldValue) && Array.isArray(newValue)) {
    if (oldValue.length !== newValue.length) return true

    // Sort arrays to ensure consistent comparison
    const sortedOld = [...oldValue].sort()
    const sortedNew = [...newValue].sort()

    return sortedOld.some((val, idx) => val !== sortedNew[idx])
  }

  // Handle dates
  if (
    oldValue &&
    newValue &&
    (oldValue instanceof Date || (typeof oldValue === "string" && oldValue.match(/^\d{4}-\d{2}-\d{2}/)))
  ) {
    const oldDate = oldValue instanceof Date ? oldValue : new Date(oldValue)
    const newDate = newValue instanceof Date ? newValue : new Date(newValue)
    return oldDate.getTime() !== newDate.getTime()
  }

  // Handle numbers
  if (typeof oldValue === "number" && typeof newValue === "number") {
    return oldValue !== newValue
  }

  // Handle strings and other primitives
  return String(oldValue) !== String(newValue)
}

// Format value for display in history
const formatValueForHistory = (value: any): string => {
  if (value === null || value === undefined) return "none"
  if (Array.isArray(value)) return value.join(", ") || "none"
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

export default function EditTaskPage() {
  const [task, setTask] = useState<Task | null>(null)
  const [originalTask, setOriginalTask] = useState<Task | null>(null) // Store original task for comparison
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const { user } = useAuth()
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const taskId = params.taskId as string
  const { toast } = useToast()

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [type, setType] = useState("")
  const [status, setStatus] = useState("")
  const [priority, setPriority] = useState("")
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined)
  const [percentDone, setPercentDone] = useState(0)
  const [estimatedTime, setEstimatedTime] = useState<number | undefined>(undefined)
  const [assignedTo, setAssignedTo] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState<string>("")
  const [availableMembers, setAvailableMembers] = useState<Record<string, any>>({})
  const [commitId, setCommitId] = useState<string>("")
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [parentTaskId, setParentTaskId] = useState<string | null>(null)
  const [parentTaskSearch, setParentTaskSearch] = useState("")
  const [projectTasks, setProjectTasks] = useState<{ id: string; title: string; assignedTo?: string[] }[]>([])
  const [showParentTaskPopover, setShowParentTaskPopover] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !projectId || !taskId) return

      try {
        // Fetch task details
        const taskRef = ref(database, `tasks/${taskId}`)
        const taskSnapshot = await get(taskRef)

        if (!taskSnapshot.exists()) {
          toast({
            title: "Task not found",
            description: "The task you're looking for doesn't exist",
            variant: "destructive",
          })
          router.push(`/projects/${projectId}`)
          return
        }

        const taskData = {
          id: taskId,
          ...taskSnapshot.val(),
        } as Task

        // Verify task belongs to the project
        if (taskData.projectId !== projectId) {
          toast({
            title: "Invalid task",
            description: "This task doesn't belong to the current project",
            variant: "destructive",
          })
          router.push(`/projects/${projectId}`)
          return
        }

        setTask(taskData)
        setOriginalTask(JSON.parse(JSON.stringify(taskData))) // Deep copy for comparison later

        // Populate form fields
        setTitle(taskData.title)
        setDescription(taskData.description)
        setType(taskData.type)
        setStatus(taskData.status)
        setPriority(taskData.priority)
        setDueDate(taskData.dueDate ? new Date(taskData.dueDate) : undefined)
        setPercentDone(taskData.percentDone || 0)
        setEstimatedTime(taskData.estimatedTime ?? undefined)
        setAssignedTo(taskData.assignedTo || [])
        setTags(taskData.tags ?? [])
        setCommitId(taskData.gitCommitId || "")
        setParentTaskId(taskData.parentTaskId || null)

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

        // Check if user has permission to edit tasks
        const userRoles = projectData.members?.[user.uid]?.roles || []
        const canEditTask = userRoles.some((role) => ["admin", "dev", "tester"].includes(role))

        if (!canEditTask) {
          toast({
            title: "Access denied",
            description: "You don't have permission to edit this task",
            variant: "destructive",
          })
          router.push(`/projects/${projectId}/tasks/${taskId}`)
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
          description: "Failed to load task data. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, projectId, taskId, router, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setShowConfirmDialog(true)
  }

  // Log task history with detailed changes
  const logTaskHistory = async (taskId: string, changes: { field: string; oldValue: any; newValue: any }[]) => {
    if (!user || changes.length === 0) return

    try {
      const historyEntry: Omit<TaskHistory, "id"> = {
        taskId,
        userId: user.uid,
        timestamp: new Date().toISOString(),
        changes: changes.map((change) => ({
          field: change.field,
          oldValue: formatValueForHistory(change.oldValue),
          newValue: formatValueForHistory(change.newValue),
        })),
      }

      const historyRef = push(ref(database, "taskHistory"))
      await set(historyRef, historyEntry)

      return historyRef.key
    } catch (error) {
      console.error("Error logging task history:", error)
      throw error
    }
  }

  const handleConfirmSave = async () => {
    setShowConfirmDialog(false)

    if (!user || !task || !originalTask) return

    setIsSaving(true)

    try {
      const parsedCommitId = extractCommitId(commitId)

      const updates: Partial<Task> = {
        title,
        description,
        type,
        status,
        priority,
        dueDate: dueDate ? dueDate.toISOString() : null,
        percentDone,
        estimatedTime: estimatedTime !== undefined ? estimatedTime : null,
        assignedTo,
        tags,
        updatedAt: new Date().toISOString(),
        parentTaskId: parentTaskId || null,
        gitCommitId: parsedCommitId || null,
      }

      // Track changes for history
      const changes: { field: string; oldValue: any; newValue: any }[] = []

      // Compare each field to detect changes
      if (isDifferent(originalTask.title, title)) {
        changes.push({ field: "title", oldValue: originalTask.title, newValue: title })
      }

      if (isDifferent(originalTask.description, description)) {
        changes.push({ field: "description", oldValue: originalTask.description, newValue: description })
      }

      if (isDifferent(originalTask.type, type)) {
        changes.push({ field: "type", oldValue: originalTask.type, newValue: type })
      }

      if (isDifferent(originalTask.status, status)) {
        changes.push({ field: "status", oldValue: originalTask.status, newValue: status })
      }

      if (isDifferent(originalTask.priority, priority)) {
        changes.push({ field: "priority", oldValue: originalTask.priority, newValue: priority })
      }

      // Compare dates
      const originalDueDate = originalTask.dueDate ? new Date(originalTask.dueDate) : null
      const newDueDate = dueDate || null
      if (isDifferent(originalDueDate, newDueDate)) {
        changes.push({
          field: "dueDate",
          oldValue: originalDueDate,
          newValue: newDueDate,
        })
      }

      if (isDifferent(originalTask.percentDone, percentDone)) {
        changes.push({ field: "percentDone", oldValue: originalTask.percentDone, newValue: percentDone })
      }

      if (isDifferent(originalTask.estimatedTime, estimatedTime)) {
        changes.push({ field: "estimatedTime", oldValue: originalTask.estimatedTime, newValue: estimatedTime })
      }

      if (isDifferent(originalTask.assignedTo || [], assignedTo)) {
        changes.push({ field: "assignedTo", oldValue: originalTask.assignedTo || [], newValue: assignedTo })
      }

      if (isDifferent(originalTask.tags || [], tags)) {
        changes.push({ field: "tags", oldValue: originalTask.tags || [], newValue: tags })
      }

      if (isDifferent(originalTask.parentTaskId, parentTaskId)) {
        changes.push({ field: "parentTaskId", oldValue: originalTask.parentTaskId, newValue: parentTaskId })
      }

      const originalCommitId = originalTask.gitCommitId || ""
      if (isDifferent(originalCommitId, parsedCommitId)) {
        changes.push({ field: "gitCommitId", oldValue: originalCommitId, newValue: parsedCommitId })
      }

      // Only update if there are actual changes
      if (changes.length > 0) {
        const taskRef = ref(database, `tasks/${taskId}`)
        await update(taskRef, updates)

        // Log the changes to history
        await logTaskHistory(taskId, changes)

        toast({
          title: "Task updated",
          description: "Task has been updated successfully",
          variant: "success",
        })
      } else {
        toast({
          title: "No changes detected",
          description: "No changes were made to the task",
          variant: "info",
        })
      }

      setTimeout(() => {
        router.push(`/projects/${projectId}/tasks/${taskId}`)
      }, 1500)
    } catch (error) {
      console.error("Error updating task:", error)
      toast({
        title: "Error",
        description: "Failed to update task. Please try again.",
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
      <div className="bg-background min-h-screen">
        <div className="flex h-[calc(100vh-64px)] justify-center items-center">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  if (!task || !project) {
    return (
      <div className="bg-background min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Task not found</h2>
            <p className="text-muted-foreground mb-6">
              The task you're looking for doesn't exist or you don't have access to it.
            </p>
            <Link href={`/projects/${projectId}`}>
              <Button className="rounded-lg shadow-sm">Go to Project</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-background min-h-screen">
      <main className="container mx-auto px-4 py-8">
        <Link
          href={`/projects/${projectId}/tasks/${taskId}`}
          className="text-muted-foreground text-sm hover:text-foreground inline-flex items-center mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Task
        </Link>

        <PageHeader title="Edit Task" description={`Update task details for ${project.name}`} />

        <div className="bg-card border border-border rounded-xl shadow-sm animate-fadeIn overflow-hidden">
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
                  Status <span className="text-destructive">*</span>
                </label>
                <Select value={status} onValueChange={setStatus} disabled={isSaving}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TASK_STATUS.TODO}>To Do</SelectItem>
                    <SelectItem value={TASK_STATUS.IN_PROGRESS}>In Progress</SelectItem>
                    <SelectItem value={TASK_STATUS.RESOLVED}>Resolved</SelectItem>
                    <SelectItem value={TASK_STATUS.CLOSED}>Closed</SelectItem>
                  </SelectContent>
                </Select>
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
                <label htmlFor="percentDone" className="block text-sm font-medium">
                  Progress: {percentDone}%
                </label>
                <Slider
                  value={[percentDone]}
                  min={0}
                  max={100}
                  step={5}
                  onValueChange={(value) => setPercentDone(value[0])}
                  disabled={isSaving}
                />
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
                <Popover open={showParentTaskPopover} onOpenChange={setShowParentTaskPopover}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={showParentTaskPopover}
                      className="w-full justify-between"
                    >
                      {parentTaskId
                        ? projectTasks.find((task) => task.id === parentTaskId)?.title
                        : "Select parent task"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <div className="p-2">
                      <Input
                        placeholder="Search tasks..."
                        value={parentTaskSearch}
                        onChange={(e) => setParentTaskSearch(e.target.value)}
                        className="mb-2"
                      />
                      <div className="max-h-[200px] overflow-y-auto">
                        <div
                          className="px-2 py-1.5 text-sm cursor-pointer hover:bg-muted rounded-md"
                          onClick={() => {
                            setParentTaskId(null)
                            setShowParentTaskPopover(false)
                          }}
                        >
                          None
                        </div>
                        {filteredTasks.map((task) => (
                          <div
                            key={task.id}
                            className="px-2 py-1.5 text-sm cursor-pointer hover:bg-muted rounded-md"
                            onClick={() => {
                              setParentTaskId(task.id)
                              setShowParentTaskPopover(false)
                            }}
                          >
                            <div className="truncate max-w-[300px]">
                              {task.title}{" "}
                              {(task.assignedTo ?? []).length > 0 &&
                                `- ${(task.assignedTo ?? []).map((id) => availableMembers[id]?.displayName || availableMembers[id]?.email).join(", ")}`}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="md:col-span-2 space-y-4">
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
                        className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                      />
                      <label htmlFor={`member-${memberId}`} className="text-sm truncate">
                        {memberData.displayName || memberData.email}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2 space-y-4">
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
                        className="ml-2 text-destructive"
                        disabled={isSaving}
                        aria-label={`Remove tag ${tag}`}
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
              <Link href={`/projects/${projectId}/tasks/${taskId}`}>
                <Button type="button" variant="outline" disabled={isSaving} className="rounded-lg shadow-sm">
                  Cancel
                </Button>
              </Link>
              <Dialog>
                <DialogTrigger asChild>
                  <Button type="submit" disabled={isSaving} className="rounded-lg shadow-sm">
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Confirm Changes</DialogTitle>
                    <DialogDescription>Are you sure you want to save the changes to this task?</DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button type="button" variant="secondary" onClick={() => setShowConfirmDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="button" onClick={handleConfirmSave} disabled={isSaving}>
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}

