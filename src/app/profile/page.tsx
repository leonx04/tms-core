"use client"

import type React from "react"

import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/contexts/auth-context"
import { formatDate } from "@/lib/utils"
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateEmail,
  updatePassword,
  updateProfile,
} from "firebase/auth"
import { ArrowLeft, CreditCard, Eye, EyeOff, Moon, Save, Sun } from "lucide-react"
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
    router.push("/upgrade")
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
      <header className="border-b border-border shadow-sm">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
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

      <main className="container mx-auto px-6 py-10 max-w-6xl">
        <Link
          href="/projects"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Projects
        </Link>

        <h1 className="text-3xl font-bold mb-8">Your Account</h1>

        {error && (
          <div className="bg-destructive/10 text-destructive p-5 rounded-lg mb-8 border border-destructive/20 shadow-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 p-5 rounded-lg mb-8 border border-green-200 dark:border-green-800 shadow-sm">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="text-2xl">Profile Information</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label htmlFor="displayName" className="block text-sm font-medium">
                        Display Name
                      </label>
                      <input
                        id="displayName"
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full p-3 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary/30"
                        disabled={isSaving}
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="email" className="block text-sm font-medium">
                        Email Address
                      </label>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-3 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary/30"
                        disabled={isSaving}
                      />
                      {email !== user?.email && (
                        <p className="text-sm text-muted-foreground mt-1">
                          You'll need to verify your current password to change your email.
                        </p>
                      )}
                    </div>
                  </div>

                  <Separator className="my-6" />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Change Password</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label htmlFor="newPassword" className="block text-sm font-medium">
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            id="newPassword"
                            type={showPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full p-3 pr-10 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary/30"
                            disabled={isSaving}
                            placeholder="Leave blank to keep current"
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="confirmPassword" className="block text-sm font-medium">
                          Confirm New Password
                        </label>
                        <input
                          id="confirmPassword"
                          type={showPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full p-3 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary/30"
                          disabled={isSaving}
                          placeholder="Confirm new password"
                        />
                      </div>
                    </div>
                  </div>

                  {(email !== user?.email || newPassword) && (
                    <div className="space-y-2 bg-muted/40 p-4 rounded-lg border border-border">
                      <label htmlFor="currentPassword" className="block text-sm font-medium">
                        Current Password <span className="text-destructive">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="currentPassword"
                          type={showCurrentPassword ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full p-3 pr-10 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary/30"
                          disabled={isSaving}
                          required={email !== user?.email || !!newPassword}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        >
                          {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                      <p className="text-sm text-muted-foreground">Required to change email or password</p>
                    </div>
                  )}

                  <Separator className="my-6" />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Preferences</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                          <input
                            id="emailNotifications"
                            type="checkbox"
                            className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                            checked={emailNotifications}
                            onChange={(e) => setEmailNotifications(e.target.checked)}
                            disabled={isSaving}
                          />
                          <label htmlFor="emailNotifications" className="text-base">
                            Receive email notifications
                          </label>
                        </div>

                        <div className="flex items-center space-x-3">
                          <input
                            id="inAppNotifications"
                            type="checkbox"
                            className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                            checked={inAppNotifications}
                            onChange={(e) => setInAppNotifications(e.target.checked)}
                            disabled={isSaving}
                          />
                          <label htmlFor="inAppNotifications" className="text-base">
                            Receive in-app notifications
                          </label>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                          <span className="text-base">Theme:</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                            className="flex items-center space-x-2"
                          >
                            {theme === "dark" ? (
                              <>
                                <Sun className="h-4 w-4" />
                                <span>Light Mode</span>
                              </>
                            ) : (
                              <>
                                <Moon className="h-4 w-4" />
                                <span>Dark Mode</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={isSaving} size="lg" className="px-8">
                      <Save className="mr-2 h-5 w-5" />
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="text-2xl">Subscription</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col space-y-2">
                  <p className="font-medium text-lg">
                    Current Plan:{" "}
                    <span className="text-primary font-semibold">
                      {userData?.packageId
                        ? userData.packageId.charAt(0).toUpperCase() + userData.packageId.slice(1)
                        : "N/A"}
                    </span>
                  </p>
                  <p className="text-muted-foreground">
                    Expires: {userData?.packageExpiry ? formatDate(userData.packageExpiry) : "N/A"}
                  </p>
                </div>

                <div className="bg-muted/40 p-5 rounded-lg border border-border">
                  <h3 className="font-medium mb-3">Plan Features</h3>
                  <ul className="space-y-2">
                    {userData?.packageId === "basic" && (
                      <>
                        <li className="flex items-center">
                          <span className="mr-2 text-primary">•</span>
                          Up to 3 projects
                        </li>
                        <li className="flex items-center">
                          <span className="mr-2 text-primary">•</span>
                          Basic task management
                        </li>
                        <li className="flex items-center">
                          <span className="mr-2 text-primary">•</span>
                          Email notifications
                        </li>
                      </>
                    )}

                    {userData?.packageId === "plus" && (
                      <>
                        <li className="flex items-center">
                          <span className="mr-2 text-primary">•</span>
                          Up to 10 projects
                        </li>
                        <li className="flex items-center">
                          <span className="mr-2 text-primary">•</span>
                          Advanced task management
                        </li>
                        <li className="flex items-center">
                          <span className="mr-2 text-primary">•</span>
                          GitHub integration
                        </li>
                        <li className="flex items-center">
                          <span className="mr-2 text-primary">•</span>
                          Email & in-app notifications
                        </li>
                      </>
                    )}

                    {userData?.packageId === "premium" && (
                      <>
                        <li className="flex items-center">
                          <span className="mr-2 text-primary">•</span>
                          Unlimited projects
                        </li>
                        <li className="flex items-center">
                          <span className="mr-2 text-primary">•</span>
                          Full task management suite
                        </li>
                        <li className="flex items-center">
                          <span className="mr-2 text-primary">•</span>
                          Advanced GitHub integration
                        </li>
                        <li className="flex items-center">
                          <span className="mr-2 text-primary">•</span>
                          Priority support
                        </li>
                        <li className="flex items-center">
                          <span className="mr-2 text-primary">•</span>
                          Custom Cloudinary configuration
                        </li>
                      </>
                    )}
                  </ul>
                </div>

                <Button variant="outline" onClick={handleUpgradeClick} className="w-full py-6 text-base" size="lg">
                  <CreditCard className="mr-2 h-5 w-5" />
                  Manage Subscription
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

