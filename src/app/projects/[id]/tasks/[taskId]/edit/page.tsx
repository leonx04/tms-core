"use client"

import type React from "react"

import { PageHeader } from "@/components/layout/page-header"
import { AssigneeGroup } from "@/components/ui/assignee-group"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { Input } from "@/components/ui/input"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { database } from "@/lib/firebase"
import type { Project, Task } from "@/types"
import { TASK_PRIORITY, TASK_STATUS, TASK_TYPE } from "@/types"
import { get, ref, update } from "firebase/database"
import { ArrowLeft, GitCommit, Save } from 'lucide-react'
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

// Hàm trích xuất commit id từ chuỗi đầu vào.
const extractCommitId = (input: string): string => {
  if (!input) return "";
  const trimmed = input.trim();
  const urlRegex = /commit\/([a-f0-9]{7,40})/i;
  const idRegex = /^[a-f0-9]{7,40}$/i;

  const matchUrl = trimmed.match(urlRegex);
  if (matchUrl) {
    return matchUrl[1];
  }
  if (idRegex.test(trimmed)) {
    return trimmed;
  }
  return "";
};

export default function EditTaskPage() {
  const [task, setTask] = useState<Task | null>(null)
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
          });
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
          });
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
        setPercentDone(taskData.percentDone || 0)
        setEstimatedTime(taskData.estimatedTime ?? undefined)
        setAssignedTo(taskData.assignedTo || [])
        setTags(taskData.tags ?? [])
        setCommitId(taskData.gitCommitId || "")

        // Fetch project details
        const projectRef = ref(database, `projects/${projectId}`)
        const projectSnapshot = await get(projectRef)

        if (!projectSnapshot.exists()) {
          toast({
            title: "Project not found",
            description: "The project you're looking for doesn't exist",
            variant: "destructive",
          });
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
          });
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
        toast({
          title: "Error",
          description: "Failed to load task data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, projectId, taskId, router, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !task) return

    setIsSaving(true)

    try {
      const parsedCommitId = extractCommitId(commitId);

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

      // Only update gitCommitId if it has changed
      if (parsedCommitId !== task.gitCommitId) {
        updates.gitCommitId = parsedCommitId || null;
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

      toast({
        title: "Task updated",
        description: "Task has been updated successfully",
        variant: "success",
      });

      setTimeout(() => {
        router.push(`/projects/${projectId}/tasks/${taskId}`)
      }, 1500)
    } catch (error) {
      console.error("Error updating task:", error)
      toast({
        title: "Error",
        description: "Failed to update task. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false)
    }
  }

  // Convert available members to array for AssigneeGroup component
  const getAssigneeUsers = () => {
    if (!assignedTo) return [];
    return assignedTo
      .filter(id => availableMembers[id])
      .map(id => availableMembers[id]);
  };

  if (loading) {
    return (
      <div className="bg-background min-h-screen">
        <div className="flex h-[calc(100vh-64px)] justify-center items-center">
          <LoadingSpinner />
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

        <div className="bg-card border border-border rounded-xl shadow-sm animate-bounce-in overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="md:col-span-2 space-y-4">
                <label htmlFor="title" className="text-sm block font-medium">
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

              <div className="md:col-span-2 space-y-4">
                <label htmlFor="description" className="text-sm block font-medium">
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
                <label htmlFor="type" className="text-sm block font-medium">
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
                <label htmlFor="status" className="text-sm block font-medium">
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
                <label htmlFor="priority" className="text-sm block font-medium">
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
                <label htmlFor="dueDate" className="text-sm block font-medium">
                  Due Date
                </label>
                <DatePicker date={dueDate} setDate={setDueDate} disabled={isSaving} />
              </div>

              <div className="space-y-4">
                <label htmlFor="percentDone" className="text-sm block font-medium">
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
                <label htmlFor="estimatedTime" className="text-sm block font-medium">
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

              <div className="space-y-4">
                <label htmlFor="commitId" className="flex text-sm font-medium items-center">
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
                <p className="text-muted-foreground text-xs">
                  {project.githubRepo ?
                    `Enter a commit ID or URL from ${project.githubRepo}` :
                    "Enter a commit ID or GitHub commit URL"}
                </p>
              </div>

              <div className="md:col-span-2 space-y-4">
                <label className="text-sm block font-medium">Assigned To</label>

                {assignedTo.length > 0 && (
                  <div className="mb-2">
                    <AssigneeGroup users={getAssigneeUsers()} />
                  </div>
                )}

                <div className="grid grid-cols-1 gap-2 md:grid-cols-3 sm:grid-cols-2">
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
                        className="border-gray-300 h-4 rounded text-primary w-4 focus:ring-primary"
                      />
                      <label htmlFor={`member-${memberId}`} className="text-sm truncate">
                        {memberData.displayName || memberData.email}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2 space-y-4">
                <label htmlFor="tagInput" className="text-sm block font-medium">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <div
                      key={index}
                      className="flex border border-spacing-3 rounded-full text-sm items-center px-2 py-1"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setTags(tags.filter((t) => t !== tag))
                        }
                        className="text-red-500 ml-2"
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

            <div className="flex border-border border-t justify-end pt-4 space-x-4">
              <Link href={`/projects/${projectId}/tasks/${taskId}`}>
                <Button type="button" variant="outline" disabled={isSaving} className="rounded-lg shadow-sm">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={isSaving} className="rounded-lg shadow-sm">
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
