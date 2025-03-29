"use client"

import { useTheme } from "@/components/theme/theme-provider"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/contexts/auth-context"
import { formatDate } from "@/utils/utils"
import {
    AlertCircle,
    ArrowLeft,
    Calendar,
    CheckCircle,
    Clock,
    CreditCard,
    ExternalLink,
    Eye,
    EyeOff,
    GitBranch,
    GithubIcon,
    ChromeIcon as GoogleIcon,
    History,
    Loader2,
    Moon,
    Receipt,
    Save,
    ShieldCheck,
    Sparkles,
    Sun,
    User,
    Users,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type React from "react"
import { useEffect, useState } from "react"

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [currentPassword, setCurrentPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const { user, userData, updateUserProfile, signOut, linkWithGoogleAccount, linkWithGithubAccount, updateUserData } =
    useAuth()
  const { theme, setTheme } = useTheme()
  const router = useRouter()

  // Profile form state
  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [inAppNotifications, setInAppNotifications] = useState(true)
  const [activeTab, setActiveTab] = useState("account")

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
      // Validate password match
      if (newPassword && newPassword !== confirmPassword) {
        setError("New passwords do not match")
        setIsSaving(false)
        return
      }

      // Validate password strength if provided
      if (newPassword && newPassword.length < 8) {
        setError("Password must be at least 8 characters long")
        setIsSaving(false)
        return
      }

      // Validate current password is provided if changing password or email
      if ((email !== user?.email || newPassword) && !currentPassword) {
        setError("Current password is required to update email or password")
        setIsSaving(false)
        return
      }

      // Prepare update data
      const updateData: {
        displayName?: string
        email?: string
        password?: string
        currentPassword?: string
      } = {}

      // Only include fields that have changed
      if (displayName !== userData?.displayName) {
        updateData.displayName = displayName
      }

      if (email !== user.email) {
        updateData.email = email
      }

      if (newPassword) {
        updateData.password = newPassword
      }

      // Include current password if needed
      if ((email !== user.email || newPassword) && currentPassword) {
        updateData.currentPassword = currentPassword
      }

      // Update preferences separately
      const preferencesChanged =
        emailNotifications !== userData?.preferences?.emailNotifications ||
        inAppNotifications !== userData?.preferences?.inAppNotifications

      // Only call updateUserProfile if there are changes
      if (Object.keys(updateData).length > 0) {
        await updateUserProfile(updateData)
      }

      // Update preferences if changed
      if (preferencesChanged) {
        await updateUserData({
          preferences: {
            ...userData?.preferences,
            emailNotifications,
            inAppNotifications,
          },
        })
      }

      // Reset password fields
      setNewPassword("")
      setConfirmPassword("")
      setCurrentPassword("")

      setSuccess("Profile updated successfully")
    } catch (error: any) {
      console.error("Error updating profile:", error)

      // Set specific error message if not already handled by auth context
      if (error.message === "Current password is incorrect") {
        setError("The current password you entered is incorrect. Please try again.")
      } else if (!error.message.includes("toast")) {
        // Only set error if not already shown in toast
        setError(error.message || "An error occurred while updating your profile")
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleLinkGoogle = async () => {
    setError(null)
    setSuccess(null)
    try {
      await linkWithGoogleAccount()
      setSuccess("Google account linked successfully")
    } catch (error: any) {
      // Error is handled in the auth context
    }
  }

  const handleLinkGithub = async () => {
    setError(null)
    setSuccess(null)
    try {
      await linkWithGithubAccount()
      setSuccess("GitHub account linked successfully")
    } catch (error: any) {
      // Error is handled in the auth context
    }
  }

  // Helper: Check if a provider is linked
  const isProviderLinked = (providerId: string) => {
    return user?.providerData.some((provider: { providerId: string }) => provider.providerId === providerId)
  }

  // Calculate subscription expiry percentage
  const calculateExpiryPercentage = () => {
    if (!userData?.packageExpiry) return 100

    const startDate = userData.lastPayment
      ? new Date(userData.lastPayment)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const expiryDate = new Date(userData.packageExpiry)
    const currentDate = new Date()

    const totalDuration = expiryDate.getTime() - startDate.getTime()
    const elapsedDuration = currentDate.getTime() - startDate.getTime()

    const percentage = Math.min(100, Math.max(0, (elapsedDuration / totalDuration) * 100))
    return Math.round(percentage)
  }

  // Get days remaining until expiry
  const getDaysRemaining = () => {
    if (!userData?.packageExpiry) return 0

    const expiryDate = new Date(userData.packageExpiry)
    const currentDate = new Date()

    const diffTime = expiryDate.getTime() - currentDate.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    return Math.max(0, diffDays)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-12">
      <main className="container mx-auto max-w-7xl px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-10">
          <Link
            href="/projects"
            className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Projects
          </Link>
          <div className="flex items-center gap-4 mt-4 sm:mt-0">
            <Avatar className="h-10 w-10 border-2 border-primary/10">
              <AvatarImage src={user?.photoURL || undefined} alt={userData?.displayName || "User"} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {userData?.displayName?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold">Your Account</h1>
              <p className="text-sm text-muted-foreground">Manage your profile and preferences</p>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <Alert variant="destructive" className="mb-8 animate-fadeIn">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="mb-8 animate-fadeIn bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-50">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        <Tabs defaultValue="account" value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid w-full md:w-auto grid-cols-2 md:inline-flex">
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="subscription">Subscription</TabsTrigger>
          </TabsList>

          {/* Account Tab Content */}
          <TabsContent value="account">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              {/* Profile Form */}
              <div className="lg:col-span-3">
                <Card className="transition-all hover:shadow-lg">
                  <CardHeader className="border-b border-border pb-4">
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <User className="h-6 w-6 text-primary" /> Profile Information
                    </CardTitle>
                    <CardDescription>Update your personal details and preferences</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <form onSubmit={handleProfileUpdate} className="space-y-8">
                      {/* Basic Info */}
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
                            className="w-full p-3 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary/30 transition-colors"
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
                            className="w-full p-3 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary/30 transition-colors"
                            disabled={isSaving}
                          />
                          {email !== user?.email && (
                            <p className="text-sm text-muted-foreground mt-1">Verification required to change email.</p>
                          )}
                        </div>
                      </div>

                      <Separator />

                      {/* Change Password Section */}
                      <div className="space-y-6">
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
                                className="w-full p-3 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary/30 transition-colors"
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
                            <div className="relative">
                              <input
                                id="confirmPassword"
                                type={showPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full p-3 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary/30 transition-colors"
                                disabled={isSaving}
                                placeholder="Confirm new password"
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
                        </div>
                      </div>

                      {/* Current Password Section (conditional) */}
                      {(email !== user?.email || newPassword) && (
                        <div className="space-y-2 bg-amber-50 dark:bg-amber-950/30 p-4 rounded-lg border border-amber-200 dark:border-amber-800 transition-all">
                          <label htmlFor="currentPassword" className="text-sm font-medium flex items-center">
                            <AlertCircle className="h-4 w-4 mr-2 text-amber-600 dark:text-amber-400" />
                            Current Password <span className="text-destructive ml-1">*</span>
                          </label>
                          <div className="relative">
                            <input
                              id="currentPassword"
                              type={showCurrentPassword ? "text" : "password"}
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              className="w-full p-3 rounded-md border border-amber-300 dark:border-amber-700 bg-background focus:ring-2 focus:ring-amber-500/30 transition-colors"
                              disabled={isSaving}
                              required
                            />
                            <button
                              type="button"
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            >
                              {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                          </div>
                          <p className="text-sm text-amber-700 dark:text-amber-400">
                            For security reasons, you must enter your current password to update your email or password.
                            Your linked accounts will be preserved.
                          </p>
                        </div>
                      )}

                      <Separator />

                      {/* Account Linking Section */}
                      <div className="space-y-6">
                        <h3 className="text-lg font-medium flex items-center gap-2">
                          <GoogleIcon className="h-5 w-5 text-primary" />
                          Account Linking
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-2">
                              <GoogleIcon className="h-5 w-5" />
                              <span>Google Account:</span>
                            </div>
                            {isProviderLinked("google.com") ? (
                              <Badge
                                variant="outline"
                                className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-100 dark:border-green-800"
                              >
                                <CheckCircle className="mr-1 h-3 w-3" /> Linked
                              </Badge>
                            ) : (
                              <Button
                                variant="outline"
                                onClick={handleLinkGoogle}
                                className="transition-transform hover:scale-105"
                                size="sm"
                              >
                                Link Account
                              </Button>
                            )}
                          </div>
                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-2">
                              <GithubIcon className="h-5 w-5" />
                              <span>GitHub Account:</span>
                            </div>
                            {isProviderLinked("github.com") ? (
                              <Badge
                                variant="outline"
                                className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-100 dark:border-green-800"
                              >
                                <CheckCircle className="mr-1 h-3 w-3" /> Linked
                              </Badge>
                            ) : (
                              <Button
                                variant="outline"
                                onClick={handleLinkGithub}
                                className="transition-transform hover:scale-105"
                                size="sm"
                              >
                                Link Account
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Preferences Section */}
                      <div className="space-y-6">
                        <h3 className="text-lg font-medium">Preferences</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div className="flex items-center gap-3">
                              <input
                                id="emailNotifications"
                                type="checkbox"
                                className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary transition-transform"
                                checked={emailNotifications}
                                onChange={(e) => setEmailNotifications(e.target.checked)}
                                disabled={isSaving}
                              />
                              <label htmlFor="emailNotifications" className="text-base">
                                Email Notifications
                              </label>
                            </div>
                            <div className="flex items-center gap-3">
                              <input
                                id="inAppNotifications"
                                type="checkbox"
                                className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary transition-transform"
                                checked={inAppNotifications}
                                onChange={(e) => setInAppNotifications(e.target.checked)}
                                disabled={isSaving}
                              />
                              <label htmlFor="inAppNotifications" className="text-base">
                                In-app Notifications
                              </label>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center">
                            <span className="mb-2 text-base">Theme:</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                              className="flex items-center gap-2 transition-transform hover:scale-105"
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

                      {/* Save Changes Button */}
                      <div className="flex justify-end pt-4">
                        <Button
                          type="submit"
                          disabled={isSaving}
                          size="lg"
                          className="px-8 transition-transform hover:scale-105"
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="mr-2 h-5 w-5" />
                              Save Changes
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Subscription Tab Content */}
          <TabsContent value="subscription">
            <div className="grid grid-cols-1 gap-8">
              {/* Current Subscription Card */}
              <Card className="transition-all hover:shadow-lg">
                <CardHeader className="border-b border-border pb-4">
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-primary" /> Current Subscription
                  </CardTitle>
                  <CardDescription>Your active plan and subscription details</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="flex flex-col space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3 h-3 rounded-full ${userData?.subscriptionStatus === "active"
                            ? "bg-green-500"
                            : userData?.subscriptionStatus === "past_due"
                              ? "bg-amber-500"
                              : "bg-muted-foreground"
                            }`}
                        ></div>
                        <p className="font-medium text-lg">
                          {userData?.packageId
                            ? userData.packageId.charAt(0).toUpperCase() + userData.packageId.slice(1)
                            : "Basic"}{" "}
                          Plan
                        </p>
                      </div>
                      <Badge
                        className={`text-sm py-1 px-3 capitalize ${userData?.packageId === "premium"
                          ? "bg-primary"
                          : userData?.packageId === "plus"
                            ? "bg-secondary"
                            : "bg-muted"
                          }`}
                      >
                        {userData?.packageId || "Basic"}
                      </Badge>
                    </div>

                    {userData?.billingCycle && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span className="capitalize">{userData.billingCycle} billing</span>
                      </div>
                    )}

                    {userData?.packageExpiry && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>Expires: {formatDate(userData.packageExpiry)}</span>
                          </div>
                          <span className="text-sm font-medium">{getDaysRemaining()} days left</span>
                        </div>
                        <Progress value={calculateExpiryPercentage()} className="h-2" />
                      </div>
                    )}

                    {userData?.subscriptionStatus && userData.subscriptionStatus !== "active" && (
                      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-4 flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-amber-800 dark:text-amber-300">
                            Subscription Status: {userData.subscriptionStatus}
                          </p>
                          <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                            {userData.subscriptionStatus === "past_due"
                              ? "Your payment is overdue. Please update your payment method to avoid service interruption."
                              : userData.subscriptionStatus === "canceled"
                                ? "Your subscription has been canceled and will not renew."
                                : "There may be an issue with your subscription. Please check your payment details."}
                          </p>
                        </div>
                      </div>
                    )}

                    {userData?.cancelAtPeriodEnd && (
                      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-4 flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-amber-800 dark:text-amber-300">Subscription Ending</p>
                          <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                            Your subscription is set to cancel at the end of the current billing period. You will be
                            downgraded to the Basic plan.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-muted p-5 rounded-lg border border-border transition-all">
                    <h3 className="font-medium mb-3">Plan Features</h3>
                    <ul className="space-y-2">
                      {userData?.packageId === "basic" && (
                        <>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            Up to 3 projects
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            Basic task management
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            Email notifications
                          </li>
                        </>
                      )}
                      {userData?.packageId === "plus" && (
                        <>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            Up to 10 projects
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            Advanced task management
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            GitHub integration
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            Email & in-app notifications
                          </li>
                        </>
                      )}
                      {userData?.packageId === "premium" && (
                        <>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            Unlimited projects
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            Full task management suite
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            Advanced GitHub integration
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            Priority support
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            Custom Cloudinary configuration
                          </li>
                        </>
                      )}
                    </ul>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button
                      variant="default"
                      onClick={() => router.push("/upgrade")}
                      className="flex-1 py-6 text-base transition-transform hover:scale-105"
                    >
                      <CreditCard className="mr-2 h-5 w-5" />
                      Manage Subscription
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => router.push("/subscription-history")}
                      className="flex-1 py-6 text-base transition-transform hover:scale-105"
                    >
                      <History className="mr-2 h-5 w-5" />
                      View Payment History
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Subscription Benefits Card */}
              <Card className="transition-all hover:shadow-lg">
                <CardHeader className="border-b border-border pb-4">
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <ShieldCheck className="h-6 w-6 text-primary" /> Subscription Benefits
                  </CardTitle>
                  <CardDescription>Why upgrade your subscription</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-muted/50 p-4 rounded-lg border border-border">
                      <h3 className="font-medium text-lg mb-3 flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" /> Team Collaboration
                      </h3>
                      <p className="text-muted-foreground">
                        Upgrade to Plus or Premium for enhanced team collaboration features, including advanced role
                        management and team analytics.
                      </p>
                    </div>

                    <div className="bg-muted/50 p-4 rounded-lg border border-border">
                      <h3 className="font-medium text-lg mb-3 flex items-center gap-2">
                        <GitBranch className="h-5 w-5 text-primary" /> GitHub Integration
                      </h3>
                      <p className="text-muted-foreground">
                        Connect your projects directly to GitHub repositories with automatic commit tracking and PR
                        management.
                      </p>
                    </div>

                    <div className="bg-muted/50 p-4 rounded-lg border border-border">
                      <h3 className="font-medium text-lg mb-3 flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-primary" /> Flexible Billing
                      </h3>
                      <p className="text-muted-foreground">
                        Choose between monthly or yearly billing with significant savings on annual plans.
                      </p>
                    </div>

                    <div className="bg-muted/50 p-4 rounded-lg border border-border">
                      <h3 className="font-medium text-lg mb-3 flex items-center gap-2">
                        <Receipt className="h-5 w-5 text-primary" /> Detailed Invoicing
                      </h3>
                      <p className="text-muted-foreground">
                        Access comprehensive payment history and downloadable invoices for all your transactions.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 text-center">
                    <Link href="/upgrade" className="text-primary hover:underline inline-flex items-center">
                      Compare all plan features
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

