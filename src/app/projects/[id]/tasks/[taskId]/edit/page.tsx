"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ref, get, update } from "firebase/database"
import { database } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import { Slider } from "@/components/ui/slider"
import { ArrowLeft, Save, AlertCircle } from "lucide-react"
import { TASK_STATUS, TASK_PRIORITY, TASK_TYPE } from "@/types"
import Header from "@/components/layout/header"
import { PageHeader } from "@/components/layout/page-header"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import type { Task, Project } from "@/types"

export default function EditTaskPage() {
  const [task, setTask] = useState<Task | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const { user } = useAuth()
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const taskId = params.taskId as string

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

  useEffect(() => {
    const fetchData = async () => {
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
        } as Task

        // Verify task belongs to the project
        if (taskData.projectId !== projectId) {
          router.push(`/projects/${projectId}`)
          return
        }

        setTask(taskData)

        // Populate form fields
        setTitle(taskData.title)
        setDescription(taskData.description)
        setType(taskData.type)
        setStatus(taskData.status)
        setPriority(taskData.priority)
        setDueDate(taskData.dueDate ? new Date(taskData.dueDate) : undefined)
        setPercentDone(taskData.percentDone)
        setEstimatedTime(taskData.estimatedTime ?? undefined)
        setAssignedTo(taskData.assignedTo || [])
        setTags(taskData.tags ?? [])

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

        setProject(projectData)

        // Check if user has permission to edit tasks
        const userRoles = projectData.members?.[user.uid]?.roles || []
        const canEditTask = userRoles.some((role) => ["admin", "dev", "tester"].includes(role))

        if (!canEditTask) {
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
      } catch (error) {
        console.error("Error fetching data:", error)
        setError("Failed to load task data")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, projectId, taskId, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !task) return

    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
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
      }

      const taskRef = ref(database, `tasks/${taskId}`)
      await update(taskRef, updates)

      const historyRef = ref(database, `taskHistory/${taskId}/${Date.now()}`)
      await update(historyRef, {
        taskId,
        userId: user.uid,
        timestamp: new Date().toISOString(),
        changes: Object.entries(updates).map(([field, newValue]) => {
          const oldValue = task[field as keyof Task]
          return {
            field,
            oldValue: oldValue !== undefined ? oldValue : null,
            newValue: newValue !== undefined ? newValue : null,
          }
        }),
        comment: "Task updated",
      })

      setSuccess("Task updated successfully")

      setTimeout(() => {
        router.push(`/projects/${projectId}/tasks/${taskId}`)
      }, 1500)
    } catch (error) {
      console.error("Error updating task:", error)
      setError("Failed to update task")
    } finally {
      setIsSaving(false)
    }
  }

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

  if (!task || !project) {
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
              <Button>Go to Project</Button>
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
          href={`/projects/${projectId}/tasks/${taskId}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Task
        </Link>

        <PageHeader title="Edit Task" description={`Update task details for ${project.name}`} />

        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-xl mb-6 flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 p-4 rounded-xl mb-6 flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
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
                  onChange={(e) =>
                    setEstimatedTime(e.target.value ? Number.parseFloat(e.target.value) : undefined)
                  }
                  disabled={isSaving}
                  className="w-full"
                />
              </div>

              <div className="space-y-4 md:col-span-2">
                <label className="block text-sm font-medium">Assigned To</label>
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
                      <label htmlFor={`member-${memberId}`} className="text-sm">
                        {memberData.displayName || memberData.email}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Phần Tags: Nhập từng tag một */}
              <div className="space-y-4 md:col-span-2">
                <label htmlFor="tagInput" className="block text-sm font-medium">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <div
                      key={index}
                      className="flex items-center bg-gray-200 px-2 py-1 rounded-full text-sm"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setTags(tags.filter((t) => t !== tag))
                        }
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
                  placeholder="Nhập tag và nhấn Enter"
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
                <Button type="button" variant="outline" disabled={isSaving}>
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
