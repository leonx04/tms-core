"use client"

import type React from "react"

import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import { formatDate } from "@/lib/utils"
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateEmail,
  updatePassword,
  updateProfile,
} from "firebase/auth"
import { ArrowLeft, CreditCard, Moon, Save, Sun } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [currentPassword, setCurrentPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const { user, userData, updateUserData, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const router = useRouter()

  // Profile form state
  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  // Notification preferences
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [inAppNotifications, setInAppNotifications] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    if (userData) {
      setDisplayName(userData.displayName || "")
      setEmail(user.email || "")
      setEmailNotifications(userData.preferences?.emailNotifications ?? true)
      setInAppNotifications(userData.preferences?.inAppNotifications ?? true)
      setLoading(false)
    }
  }, [user, userData, router])

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return

    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const updates: any = {}

      // Update display name if changed
      if (displayName !== userData?.displayName) {
        await updateProfile(user, { displayName })
        updates.displayName = displayName
      }

      // Update email if changed
      if (email !== user.email && currentPassword) {
        const credential = EmailAuthProvider.credential(user.email!, currentPassword)

        await reauthenticateWithCredential(user, credential)
        await updateEmail(user, email)
      }

      // Update password if provided
      if (newPassword && confirmPassword && currentPassword) {
        if (newPassword !== confirmPassword) {
          setError("New passwords do not match")
          setIsSaving(false)
          return
        }

        const credential = EmailAuthProvider.credential(user.email!, currentPassword)

        await reauthenticateWithCredential(user, credential)
        await updatePassword(user, newPassword)

        // Clear password fields
        setNewPassword("")
        setConfirmPassword("")
        setCurrentPassword("")
      }

      // Update notification preferences
      if (
        emailNotifications !== userData?.preferences?.emailNotifications ||
        inAppNotifications !== userData?.preferences?.inAppNotifications
      ) {
        updates.preferences = {
          ...userData?.preferences,
          emailNotifications,
          inAppNotifications,
        }
      }

      // Update user data in database if there are changes
      if (Object.keys(updates).length > 0) {
        await updateUserData(updates)
      }

      setSuccess("Profile updated successfully")
    } catch (error: any) {
      console.error("Error updating profile:", error)

      if (error.code === "auth/wrong-password") {
        setError("Current password is incorrect")
      } else if (error.code === "auth/requires-recent-login") {
        setError("Please sign in again before updating your email or password")
        await signOut()
        router.push("/login")
      } else {
        setError("An error occurred while updating your profile")
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpgradeClick = () => {
    router.push("/profile/upgrade")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Link href="/projects">
              <span className="text-2xl font-bold text-primary">TMS</span>
              <span className="text-sm text-muted-foreground ml-1">v1</span>
            </Link>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Link
          href="/projects"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Projects
        </Link>

        <h1 className="text-3xl font-bold mb-8">Your Profile</h1>

        {error && <div className="bg-destructive/10 text-destructive p-4 rounded-md mb-6">{error}</div>}

        {success && (
          <div className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 p-4 rounded-md mb-6">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 gap-8">
          <Card className="shadow-modern">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">Account Information</h2>

              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div>
                  <label htmlFor="displayName" className="block text-sm font-medium mb-1">
                    Display Name
                  </label>
                  <input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full p-2 rounded-md border border-input bg-background"
                    disabled={isSaving}
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2 rounded-md border border-input bg-background"
                    disabled={isSaving}
                  />
                  {email !== user?.email && (
                    <p className="text-sm text-muted-foreground mt-1">
                      You'll need to verify your current password to change your email.
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium mb-1">
                    New Password (leave blank to keep current)
                  </label>
                  <div className="relative">
                    <input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full p-2 rounded-md border border-input bg-background"
                      disabled={isSaving}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full p-2 rounded-md border border-input bg-background"
                    disabled={isSaving}
                  />
                </div>

                {(email !== user?.email || newPassword) && (
                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium mb-1">
                      Current Password <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="currentPassword"
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full p-2 rounded-md border border-input bg-background"
                        disabled={isSaving}
                        required={email !== user?.email || !!newPassword}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-border">
                  <h3 className="text-lg font-medium mb-2">Preferences</h3>

                  <div className="space-y-2">
                    <div className="flex items-center">
                      <input
                        id="emailNotifications"
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        checked={emailNotifications}
                        onChange={(e) => setEmailNotifications(e.target.checked)}
                        disabled={isSaving}
                      />
                      <label htmlFor="emailNotifications" className="ml-2 block text-sm">
                        Receive email notifications
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        id="inAppNotifications"
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        checked={inAppNotifications}
                        onChange={(e) => setInAppNotifications(e.target.checked)}
                        disabled={isSaving}
                      />
                      <label htmlFor="inAppNotifications" className="ml-2 block text-sm">
                        Receive in-app notifications
                      </label>
                    </div>

                    <div className="flex items-center">
                      <span className="text-sm mr-2">Theme:</span>
                      <button
                        type="button"
                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                        className="p-2 rounded-md hover:bg-accent"
                      >
                        {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={isSaving}>
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="shadow-modern">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">Subscription</h2>

              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-medium">
                    Current Plan:{" "}
                    <span className="text-primary">
                      {userData?.packageId
                        ? userData.packageId.charAt(0).toUpperCase() + userData.packageId.slice(1)
                        : "N/A"}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Expires: {userData?.packageExpiry ? formatDate(userData.packageExpiry) : "N/A"}
                  </p>
                </div>

                <Button variant="outline" onClick={handleUpgradeClick}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Upgrade Plan
                </Button>
              </div>

              <div className="bg-muted p-4 rounded-md">
                <h3 className="text-sm font-medium mb-2">Plan Details</h3>
                <ul className="space-y-1 text-sm">
                  {userData?.packageId === "basic" && (
                    <>
                      <li className="flex items-center">
                        <span className="mr-2">•</span>
                        Up to 3 projects
                      </li>
                      <li className="flex items-center">
                        <span className="mr-2">•</span>
                        Basic task management
                      </li>
                      <li className="flex items-center">
                        <span className="mr-2">•</span>
                        Email notifications
                      </li>
                    </>
                  )}

                  {userData?.packageId === "plus" && (
                    <>
                      <li className="flex items-center">
                        <span className="mr-2">•</span>
                        Up to 10 projects
                      </li>
                      <li className="flex items-center">
                        <span className="mr-2">•</span>
                        Advanced task management
                      </li>
                      <li className="flex items-center">
                        <span className="mr-2">•</span>
                        GitHub integration
                      </li>
                      <li className="flex items-center">
                        <span className="mr-2">•</span>
                        Email & in-app notifications
                      </li>
                    </>
                  )}

                  {userData?.packageId === "premium" && (
                    <>
                      <li className="flex items-center">
                        <span className="mr-2">•</span>
                        Unlimited projects
                      </li>
                      <li className="flex items-center">
                        <span className="mr-2">•</span>
                        Full task management suite
                      </li>
                      <li className="flex items-center">
                        <span className="mr-2">•</span>
                        Advanced GitHub integration
                      </li>
                      <li className="flex items-center">
                        <span className="mr-2">•</span>
                        Priority support
                      </li>
                      <li className="flex items-center">
                        <span className="mr-2">•</span>
                        Custom Cloudinary configuration
                      </li>
                    </>
                  )}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

