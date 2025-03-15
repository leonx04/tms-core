"use client"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { database } from "@/lib/firebase"
import { zodResolver } from "@hookform/resolvers/zod"
import { get, push, ref, set } from "firebase/database"
import { ArrowLeft, GitBranch, Save } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

const projectSchema = z.object({
  name: z.string().min(3, { message: "Project name must be at least 3 characters" }),
  description: z.string().optional(),
  githubRepo: z.string().url({ message: "Please enter a valid URL" }).optional().or(z.literal("")),
})

type ProjectFormValues = z.infer<typeof projectSchema>

export default function CreateProjectPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { user, userData } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      description: "",
      githubRepo: "",
    },
  })

  const onSubmit = async (data: ProjectFormValues) => {
    if (!user) return

    setIsLoading(true)
    setError(null)

    try {
      // Check if user can create more projects based on their package
      const packageLimits = {
        basic: 3,
        plus: 10,
        premium: Number.POSITIVE_INFINITY,
      }

      // Get user's projects count
      const projectsRef = ref(database, "projects")
      const projectsSnapshot = await get(projectsRef)

      let userProjectsCount = 0

      if (projectsSnapshot.exists()) {
        const allProjects = projectsSnapshot.val()
        userProjectsCount = Object.values(allProjects).filter((project: any) => project.ownerId === user.uid).length
      }

      const limit = packageLimits[userData?.packageId as keyof typeof packageLimits] || 0

      if (userProjectsCount >= limit) {
        setError(`You've reached your project limit (${limit}). Please upgrade your plan to create more projects.`)
        return
      }

      // Create new project
      const newProjectRef = push(ref(database, "projects"))

      const newProject = {
        name: data.name,
        description: data.description || "",
        githubRepo: data.githubRepo || "",
        createdAt: new Date().toISOString(),
        createdBy: user.uid,
        ownerId: user.uid,
        members: {
          [user.uid]: {
            roles: ["admin"],
            addedAt: new Date().toISOString(),
            addedBy: user.uid,
          },
        },
      }

      await set(newProjectRef, newProject)

      router.push(`/projects/${newProjectRef.key}`)
    } catch (error) {
      console.error("Error creating project:", error)
      setError("An error occurred while creating the project. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Link
          href="/projects"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Projects
        </Link>

        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm animate-fadeIn">
          <div className="p-6 border-b border-border bg-muted/50">
            <h1 className="text-2xl font-bold">Create New Project</h1>
            <p className="text-muted-foreground mt-1">Set up a new project to start managing tasks</p>
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
                <label htmlFor="name" className="block text-sm font-medium mb-1">
                  Project Name <span className="text-destructive">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  {...register("name")}
                  className="w-full p-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  disabled={isLoading}
                  placeholder="My Awesome Project"
                />
                {errors.name && <p className="text-destructive text-sm mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={4}
                  {...register("description")}
                  className="w-full p-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  disabled={isLoading}
                  placeholder="Describe your project..."
                />
              </div>

              <div>
                <label htmlFor="githubRepo" className="block text-sm font-medium mb-1">
                  GitHub Repository URL (optional)
                </label>
                <div className="relative">
                  <GitBranch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    id="githubRepo"
                    type="text"
                    placeholder="https://github.com/username/repo"
                    {...register("githubRepo")}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    disabled={isLoading}
                  />
                </div>
                {errors.githubRepo && <p className="text-destructive text-sm mt-1">{errors.githubRepo.message}</p>}
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <Link href="/projects">
                  <Button variant="outline" disabled={isLoading} className="rounded-lg">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={isLoading} className="rounded-lg">
                  {isLoading ? (
                    "Creating..."
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" /> Create Project
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

