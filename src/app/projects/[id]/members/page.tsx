"use client"

import type React from "react"

import { PageHeader } from "@/components/layout/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useAuth } from "@/contexts/auth-context"
import { database } from "@/lib/firebase"
import { formatDate, getRoleColor, getRoleLabel } from "@/lib/utils"
import type { Project, User } from "@/types"
import { get, push, ref, remove, set } from "firebase/database"
import { AlertCircle, ArrowLeft, CheckCircle, Code, FileText, Info, Mail, Shield, TestTube, Trash2, UserPlus, X } from 'lucide-react'
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function ProjectMembersPage() {
  const [project, setProject] = useState<Project | null>(null)
  const [users, setUsers] = useState<Record<string, User>>({})
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState("")
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [isInviting, setIsInviting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const { user } = useAuth()
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  useEffect(() => {
    const fetchProjectData = async () => {
      if (!user || !projectId) return

      try {
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
        }

        // Check if user is a member of this project
        if (!projectData.members || !projectData.members[user.uid]) {
          router.push(`/projects/${projectId}`)
          return
        }

        // Check if user is an admin of this project
        const isUserAdmin = projectData.members[user.uid].roles.includes("admin")
        setIsAdmin(isUserAdmin)
        setProject(projectData)

        // Fetch all users who are members of this project
        const userIds = Object.keys(projectData.members)
        const usersData: Record<string, User> = {}

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
      } catch (error) {
        console.error("Error fetching project data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProjectData()
  }, [user, projectId, router])

  const handleRoleToggle = (role: string) => {
    setSelectedRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]))
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !project || !inviteEmail.trim() || selectedRoles.length === 0 || !isAdmin) return

    setIsInviting(true)
    setError(null)
    setSuccess(null)

    try {
      // Check if user exists
      const usersRef = ref(database, "users")
      const usersSnapshot = await get(usersRef)

      if (!usersSnapshot.exists()) {
        setError("No users found in the system")
        return
      }

      const usersData = usersSnapshot.val()
      let targetUserId: string | null = null

      // Find user by email
      Object.entries(usersData).forEach(([id, userData]: [string, any]) => {
        if (userData.email === inviteEmail.trim()) {
          targetUserId = id
        }
      })

      if (!targetUserId) {
        setError("User with this email not found")
        return
      }

      // Check if user is already a member
      if (project.members && project.members[targetUserId]) {
        setError("User is already a member of this project")
        return
      }

      // Add user to project members
      const memberRef = ref(database, `projects/${projectId}/members/${targetUserId}`)
      await set(memberRef, {
        roles: selectedRoles,
        addedAt: new Date().toISOString(),
        addedBy: user.uid,
      })

      // Create notification for invited user
      const notificationRef = push(ref(database, "notifications"))
      const notification = {
        userId: targetUserId,
        eventType: "INVITE_MEMBER",
        referenceId: projectId,
        message: `You have been invited to project "${project.name}"`,
        status: "unread",
        createdAt: new Date().toISOString(),
      }

      await set(notificationRef, notification)

      // Update local state
      setProject({
        ...project,
        members: {
          ...project.members,
          [targetUserId]: {
            roles: selectedRoles,
            addedAt: new Date().toISOString(),
            addedBy: user.uid,
          },
        },
      })

      // Fetch user data
      const userRef = ref(database, `users/${targetUserId}`)
      const userSnapshot = await get(userRef)

      if (userSnapshot.exists()) {
        setUsers({
          ...users,
          [targetUserId]: {
            id: targetUserId,
            ...userSnapshot.val(),
          },
        })
      }

      setInviteEmail("")
      setSelectedRoles([])
      setSuccess("User invited successfully")
    } catch (error) {
      console.error("Error inviting user:", error)
      setError("An error occurred while inviting the user")
    } finally {
      setIsInviting(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!user || !project || memberId === user.uid || memberId === project.ownerId || !isAdmin) return

    try {
      // Remove member from project
      const memberRef = ref(database, `projects/${projectId}/members/${memberId}`)
      await remove(memberRef)

      // Create notification for removed user
      const notificationRef = push(ref(database, "notifications"))
      const notification = {
        userId: memberId,
        eventType: "REMOVE_MEMBER",
        referenceId: projectId,
        message: `You have been removed from project "${project.name}"`,
        status: "unread",
        createdAt: new Date().toISOString(),
      }

      await set(notificationRef, notification)

      // Update local state
      const updatedMembers = { ...project.members }
      delete updatedMembers[memberId]

      setProject({
        ...project,
        members: updatedMembers,
      })

      const updatedUsers = { ...users }
      delete updatedUsers[memberId]

      setUsers(updatedUsers)

      setSuccess("Member removed successfully")
      setShowDeleteConfirm(null)
    } catch (error) {
      console.error("Error removing member:", error)
      setError("An error occurred while removing the member")
    }
  }

  const handleUpdateRoles = async (memberId: string, roles: string[]) => {
    if (!user || !project || memberId === user.uid || memberId === project.ownerId || !isAdmin) return

    try {
      // Update member roles
      const memberRef = ref(database, `projects/${projectId}/members/${memberId}/roles`)
      await set(memberRef, roles)

      // Create notification for updated user
      const notificationRef = push(ref(database, "notifications"))
      const notification = {
        userId: memberId,
        eventType: "UPDATE_ROLE",
        referenceId: projectId,
        message: `Your role in project "${project.name}" has been updated`,
        status: "unread",
        createdAt: new Date().toISOString(),
      }

      await set(notificationRef, notification)

      // Update local state
      setProject({
        ...project,
        members: {
          ...project.members,
          [memberId]: {
            ...project.members[memberId],
            roles,
          },
        },
      })

      setSuccess("Member roles updated successfully")
    } catch (error) {
      console.error("Error updating member roles:", error)
      setError("An error occurred while updating member roles")
    }
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
              <Button className="rounded-lg">Go to Projects</Button>
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

        <PageHeader title="Manage Members" description={`Invite and manage team members for ${project.name}`} />

        {!isAdmin && (
          <Alert className="mb-6 bg-muted/50 border-muted">
            <Info className="h-4 w-4" />
            <AlertTitle>View-only mode</AlertTitle>
            <AlertDescription>
              You are viewing this page in read-only mode. Only project administrators can invite or manage members.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-xl mb-6 flex items-start animate-fadeIn">
            <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 p-4 rounded-xl mb-6 flex items-start animate-fadeIn">
            <CheckCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Project Members</h2>

            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm animate-fadeIn">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="px-4 py-3 text-left text-sm font-medium">User</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Roles</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Added</th>
                      {isAdmin && <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {project.members &&
                      Object.entries(project.members).map(([memberId, memberData]) => (
                        <tr key={memberId} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center">
                              <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium mr-3">
                                {users[memberId]?.displayName?.charAt(0) || "?"}
                              </div>
                              <div>
                                <p className="font-medium flex items-center">
                                  {users[memberId]?.displayName || "Unknown user"}
                                  {memberId === project.ownerId && (
                                    <Badge variant="primary" className="ml-2">
                                      Owner
                                    </Badge>
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground">{users[memberId]?.email || "No email"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {memberData.roles.map((role) => (
                                <Badge key={role} className={getRoleColor(role)}>
                                  {role === "admin" ? (
                                    <Shield className="mr-1 h-3 w-3" />
                                  ) : role === "dev" ? (
                                    <Code className="mr-1 h-3 w-3" />
                                  ) : role === "tester" ? (
                                    <TestTube className="mr-1 h-3 w-3" />
                                  ) : (
                                    <FileText className="mr-1 h-3 w-3" />
                                  )}
                                  {getRoleLabel(role)}
                                </Badge>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex flex-col">
                              <span>{formatDate(memberData.addedAt)}</span>
                              <span className="text-xs text-muted-foreground">
                                by {users[memberData.addedBy]?.displayName || "Unknown"}
                              </span>
                            </div>
                          </td>
                          {isAdmin && (
                            <td className="px-4 py-3">
                              {user && memberId !== user.uid && memberId !== project.ownerId && (
                                <div className="flex items-center space-x-2">
                                  {showDeleteConfirm === memberId ? (
                                    <>
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleRemoveMember(memberId)}
                                        className="rounded-lg"
                                      >
                                        Confirm
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowDeleteConfirm(null)}
                                        className="rounded-lg"
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </>
                                  ) : (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setShowDeleteConfirm(memberId)}
                                      className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {isAdmin && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Invite Member</h2>

              <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm animate-fadeIn">
                <div className="p-6">
                  <form onSubmit={handleInvite} className="space-y-5">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium mb-1">
                        Email Address <span className="text-destructive">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                          id="email"
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                          disabled={isInviting}
                          required
                          placeholder="user@example.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Roles <span className="text-destructive">*</span>
                      </label>
                      <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
                        <div className="flex items-center">
                          <input
                            id="role-admin"
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            checked={selectedRoles.includes("admin")}
                            onChange={() => handleRoleToggle("admin")}
                            disabled={isInviting}
                          />
                          <label htmlFor="role-admin" className="ml-2 block text-sm">
                            <span className="font-medium">Admin</span> - Can manage project settings and members
                          </label>
                        </div>

                        <div className="flex items-center">
                          <input
                            id="role-dev"
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            checked={selectedRoles.includes("dev")}
                            onChange={() => handleRoleToggle("dev")}
                            disabled={isInviting}
                          />
                          <label htmlFor="role-dev" className="ml-2 block text-sm">
                            <span className="font-medium">Developer</span> - Can update task status and link commits
                          </label>
                        </div>

                        <div className="flex items-center">
                          <input
                            id="role-tester"
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            checked={selectedRoles.includes("tester")}
                            onChange={() => handleRoleToggle("tester")}
                            disabled={isInviting}
                          />
                          <label htmlFor="role-tester" className="ml-2 block text-sm">
                            <span className="font-medium">Tester</span> - Can verify and close tasks
                          </label>
                        </div>

                        <div className="flex items-center">
                          <input
                            id="role-doc"
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            checked={selectedRoles.includes("documentWriter")}
                            onChange={() => handleRoleToggle("documentWriter")}
                            disabled={isInviting}
                          />
                          <label htmlFor="role-doc" className="ml-2 block text-sm">
                            <span className="font-medium">Document Writer</span> - Can manage task documentation
                          </label>
                        </div>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isInviting || !inviteEmail.trim() || selectedRoles.length === 0}
                      className="w-full rounded-lg"
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      {isInviting ? "Inviting..." : "Invite Member"}
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
