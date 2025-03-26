"use client"

import { Suspense, useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, Eye, EyeOff, Github, LogIn, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/contexts/auth-context"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

// Create a client component that uses useSearchParams
function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState<string | null>(null)
  const [rememberMe, setRememberMe] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)

  // Track submissions to avoid duplicates
  const isSubmitting = useRef(false)
  const redirectTimeout = useRef<NodeJS.Timeout | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const { signIn, signInWithGoogle, signInWithGithub, user } = useAuth()

  // Get callbackUrl from URL parameters
  const callbackUrl = searchParams.get("callbackUrl")
    ? decodeURIComponent(searchParams.get("callbackUrl")!)
    : "/projects"

  const isMiddlewareRedirect = searchParams.get("mw") === "1"

  // Store callback URL in session storage for later use
  useEffect(() => {
    if (callbackUrl && callbackUrl !== "/projects") {
      sessionStorage.setItem("redirectAfterAuth", callbackUrl)
    }
  }, [callbackUrl])

  // Redirect if already logged in
  useEffect(() => {
    // Avoid repeated redirects
    if (user && !isRedirecting) {
      setIsRedirecting(true)

      // Clear previous timeout if exists
      if (redirectTimeout.current) {
        clearTimeout(redirectTimeout.current)
      }

      // Set short timeout to ensure user data is loaded
      redirectTimeout.current = setTimeout(() => {
        const savedCallbackUrl = sessionStorage.getItem("redirectAfterAuth")
        if (savedCallbackUrl) {
          sessionStorage.removeItem("redirectAfterAuth")
          router.push(savedCallbackUrl)
        } else {
          router.push(callbackUrl || "/projects")
        }
      }, 500)
    }

    // Cleanup on unmount
    return () => {
      if (redirectTimeout.current) {
        clearTimeout(redirectTimeout.current)
      }
    }
  }, [user, router, callbackUrl])

  const loginSchema = z.object({
    email: z.string().email({ message: "Please enter a valid email address" }),
    password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  })

  type LoginFormValues = z.infer<typeof loginSchema>

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const onSubmit = async (data: LoginFormValues) => {
    // Avoid multiple submissions
    if (isSubmitting.current) return
    isSubmitting.current = true

    setError(null)
    setIsLoading(true)

    try {
      await signIn(data.email, data.password)
      // Redirect will be handled by useEffect when user state is updated
    } catch (error: any) {
      console.error("Login error:", error)
      // No need to set error here as toast is already displayed in auth context
    } finally {
      setIsLoading(false)
      // Allow resubmission after a short delay
      setTimeout(() => {
        isSubmitting.current = false
      }, 1000)
    }
  }

  const handleGoogleSignIn = async () => {
    // Avoid multiple submissions
    if (isSubmitting.current) return
    isSubmitting.current = true

    setError(null)
    setSocialLoading("google")

    try {
      await signInWithGoogle()
      // Redirect will be handled by useEffect when user state is updated
    } catch (error: any) {
      // Error is handled in auth context
    } finally {
      setSocialLoading(null)
      // Allow resubmission after a short delay
      setTimeout(() => {
        isSubmitting.current = false
      }, 1000)
    }
  }

  const handleGithubSignIn = async () => {
    // Avoid multiple submissions
    if (isSubmitting.current) return
    isSubmitting.current = true

    setError(null)
    setSocialLoading("github")

    try {
      await signInWithGithub()
      // Redirect will be handled by useEffect when user state is updated
    } catch (error: any) {
      // Error is handled in auth context
    } finally {
      setSocialLoading(null)
      // Allow resubmission after a short delay
      setTimeout(() => {
        isSubmitting.current = false
      }, 1000)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar with "Back to Home" */}
      <div className="container mx-auto px-4 py-8 flex justify-between items-center">
        <Link href="/" className="inline-flex items-center text-sm hover:text-primary transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Link>
      </div>

      {/* Centered login card */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Branding & welcome text */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-block">
              <div className="flex items-center justify-center">
                <div className="bg-foreground text-background w-10 h-10 rounded-md flex items-center justify-center font-bold text-xl">
                  T
                </div>
                <span className="text-2xl font-bold ml-2">TMC</span>
                <span className="text-xs text-muted-foreground ml-1 mt-1">v1</span>
              </div>
            </Link>
            <h1 className="text-2xl font-bold mt-6">Welcome back</h1>
            <p className="text-muted-foreground mt-2">Sign in to your account</p>

            {/* Show redirect message if there's a callback URL */}
            {callbackUrl && callbackUrl !== "/projects" && (
              <div className="mt-2 text-sm text-primary">You'll be redirected back after signing in</div>
            )}
          </div>

          <Card className="shadow-modern animate-fadeIn">
            <CardContent className="p-8">
              {error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Social sign-in buttons */}
              <div className="space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full py-6 rounded-lg flex items-center justify-center"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading || socialLoading !== null}
                >
                  {socialLoading === "google" ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary" />
                  ) : (
                    <>
                      {/* Simple Google icon (SVG) */}
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                      Continue with Google
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full py-6 rounded-lg flex items-center justify-center"
                  onClick={handleGithubSignIn}
                  disabled={isLoading || socialLoading !== null}
                >
                  {socialLoading === "github" ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary" />
                  ) : (
                    <>
                      <Github className="mr-2 h-5 w-5" />
                      Continue with GitHub
                    </>
                  )}
                </Button>
              </div>

              {/* OR separator */}
              <div className="relative my-6">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                  OR
                </span>
              </div>

              {/* Email/Password form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Email field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      id="email"
                      type="email"
                      {...register("email")}
                      className="w-full pl-10 pr-4 py-3 rounded-lg shadow-sm bg-background focus:ring-2 focus:ring-primary/20 transition-colors"
                      disabled={isLoading}
                      placeholder="your@email.com"
                    />
                  </div>
                  {errors.email && <p className="text-destructive text-sm mt-1">{errors.email.message}</p>}
                </div>

                {/* Password field */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      {...register("password")}
                      className="w-full p-3 rounded-lg shadow-sm bg-background focus:ring-2 focus:ring-primary/20 transition-colors"
                      disabled={isLoading}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-destructive text-sm mt-1">{errors.password.message}</p>}
                </div>

                {/* Remember me & Forgot password */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember"
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <label htmlFor="remember" className="ml-2 block text-sm text-muted-foreground">
                      Remember me
                    </label>
                  </div>
                  <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>

                {/* Sign in button */}
                <Button type="submit" className="w-full py-6 rounded-lg" disabled={isLoading}>
                  {isLoading ? (
                    "Signing in..."
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" /> Sign in
                    </>
                  )}
                </Button>
              </form>

              {/* Sign up link */}
              <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">Don't have an account?</span>{" "}
                <Link href="/register" className="text-primary hover:underline font-medium">
                  Sign up
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Main page component with Suspense
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}

