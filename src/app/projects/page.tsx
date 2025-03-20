"use client"
import { RepoLink } from "@/components/github/repo-preview"
import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { database } from "@/lib/firebase"
import { formatDate } from "@/lib/utils"
import type { Project } from "@/types"
import { get, ref } from "firebase/database"
import { Calendar, Code, FileText, Github, Plus, Search, Settings, Shield, Star, TestTube, Users } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const { user, userData } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const fetchProjects = async () => {
      if (!user) return

      try {
        // Lấy tất cả các dự án mà user là thành viên
        const projectsRef = ref(database, "projects")
        const snapshot = await get(projectsRef)

        if (snapshot.exists()) {
          const allProjects = snapshot.val()
          const userProjects = Object.entries(allProjects)
            .filter(([_, projectData]: [string, any]) => {
              return projectData.members && projectData.members[user.uid] !== undefined
            })
            .map(([id, data]: [string, any]) => ({
              id,
              ...data,
            }))

          setProjects(userProjects)
          setFilteredProjects(userProjects)
        }
      } catch (error) {
        console.error("Error fetching projects:", error)
        toast({
          title: "Error",
          description: "Failed to load projects. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [user, toast])

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredProjects(projects)
    } else {
      const filtered = projects.filter(
        (project) =>
          project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase())),
      )
      setFilteredProjects(filtered)
    }
  }, [searchQuery, projects])

  const canCreateProject = () => {
    if (!userData) return false

    // Kiểm tra xem user có thể tạo thêm dự án hay không dựa trên gói cước của họ
    const packageLimits = {
      basic: 3,
      plus: 10,
      premium: Number.POSITIVE_INFINITY,
    }

    const limit = packageLimits[userData.packageId as keyof typeof packageLimits] || 0
    return projects.length < limit
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

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <PageHeader
          title="My Projects"
          description={`${projects.length} ${projects.length === 1 ? "project" : "projects"} available`}
        >
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search projects..."
                className="w-full pl-10 pr-4 py-2 rounded-lg shadow-sm bg-background focus:ring-2 focus:ring-primary/10 transition-colors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {canCreateProject() ? (
              <Link href="/projects/create">
                <Button className="w-full sm:w-auto rounded-lg shadow-sm">
                  <Plus className="mr-2 h-4 w-4" /> Create Project
                </Button>
              </Link>
            ) : (
              <Button
                disabled
                title="You've reached your project limit. Upgrade your plan to create more projects."
                className="w-full sm:w-auto rounded-lg shadow-sm"
                onClick={() => {
                  toast({
                    title: "Project limit reached",
                    description: "Upgrade your plan to create more projects.",
                    variant: "destructive",
                  })
                }}
              >
                <Plus className="mr-2 h-4 w-4" /> Create Project
              </Button>
            )}
          </div>
        </PageHeader>

        {filteredProjects.length === 0 ? (
          <EmptyState
            icon={<Plus className="h-8 w-8 text-primary" />}
            title="No projects found"
            description={
              projects.length === 0
                ? "Create your first project to get started with task management"
                : "No projects match your search criteria. Try a different search term."
            }
            action={
              canCreateProject() &&
              projects.length === 0 && (
                <Link href="/projects/create">
                  <Button className="rounded-lg shadow-sm">
                    <Plus className="mr-2 h-4 w-4" /> Create Project
                  </Button>
                </Link>
              )
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
            {filteredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function ProjectCard({ project }: { project: Project }) {
  const { user } = useAuth()
  const router = useRouter()
  const memberCount = project.members ? Object.keys(project.members).length : 0
  const userRoles = user && project.members && project.members[user.uid] ? project.members[user.uid].roles : []
  const isOwner = user && project.ownerId === user.uid

  return (
    <Card
      onClick={() => router.push(`/projects/${project.id}`)}
      className="h-full shadow-modern card-hover transition-all animate-fadeIn cursor-pointer"
      role="link"
      tabIndex={0}
      onKeyPress={(e) => {
        if (e.key === "Enter") router.push(`/projects/${project.id}`)
      }}
    >
      <CardContent className="p-6 flex flex-col h-full">
        <div className="flex-1">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-xl font-semibold truncate">{project.name}</h3>
            {isOwner && (
              <Badge variant="default" className="ml-2 flex-shrink-0">
                <Star className="h-3 w-3 mr-1" /> Owner
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
            {project.description || "No description provided"}
          </p>

          <div className="flex flex-col space-y-2 text-sm">
            <div className="flex items-center text-muted-foreground">
              <Calendar className="h-4 w-4 mr-2" />
              <span>Created: {formatDate(project.createdAt)}</span>
            </div>
            <div className="flex items-center text-muted-foreground">
              <Users className="h-4 w-4 mr-2" />
              <span>
                {memberCount} {memberCount === 1 ? "member" : "members"}
              </span>
            </div>
            {project.githubRepo && (
              <div className="flex items-center text-muted-foreground">
                <Github className="h-4 w-4 mr-2" />
                <RepoLink url={project.githubRepo} />
              </div>
            )}
          </div>
        </div>

        <CardFooter className="px-0 pt-4 mt-4 border-t border-border/10">
          <div className="flex items-center justify-between w-full">
            <div className="flex flex-wrap gap-1">
              {userRoles.includes("admin") && (
                <Badge variant="default">
                  <Shield className="mr-1 h-3 w-3" /> Admin
                </Badge>
              )}
              {userRoles.includes("dev") && (
                <Badge variant="secondary">
                  <Code className="mr-1 h-3 w-3" /> Dev
                </Badge>
              )}
              {userRoles.includes("tester") && (
                <Badge variant="default">
                  <TestTube className="mr-1 h-3 w-3" /> Tester
                </Badge>
              )}
              {userRoles.includes("documentWriter") && (
                <Badge variant="outline">
                  <FileText className="mr-1 h-3 w-3" /> Doc
                </Badge>
              )}
            </div>
            {userRoles.includes("admin") && (
              <Link href={`/projects/${project.id}/settings`} onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="ml-auto rounded-full">
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </CardFooter>
      </CardContent>
    </Card>
  )
}

