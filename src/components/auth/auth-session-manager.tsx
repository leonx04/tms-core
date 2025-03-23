"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { Toaster } from "@/components/ui/toaster"

export const AuthSessionManager = () => {
  const { user, loading, refreshToken } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [redirectAfterAuth, setRedirectAfterAuth] = useState<string | null>(null)

  // Public routes that don't require authentication
  const publicRoutes = [
    "/",
    "/login",
    "/register",
    "/reset-password",
    "/upgrade",
    "/forgot-password",
    // Footer pages
    "/roadmap",
    "/changelog",
    "/about",
    "/blog",
    "/careers",
    "/contact",
    "/terms",
    "/privacy",
    "/cookies",
  ]

  // Check if the route is public
  const isPublicRoute = useCallback(
    (path: string) => {
      return publicRoutes.some((route) => path === route || path.startsWith(`${route}/`))
    },
    [publicRoutes],
  )

  // Check if the JWT token is expired
  const checkTokenExpiry = useCallback(() => {
    const token = localStorage.getItem("jwt")
    const expiryTime = localStorage.getItem("jwt_expiry")

    // If no token or expiry, consider it expired
    if (!token || !expiryTime) return true

    // Check if token is expired
    return Date.now() > Number.parseInt(expiryTime)
  }, [])

  // Handle redirect after successful authentication
  const handleRedirectAfterAuth = useCallback(() => {
    // Check for redirect URL in state or sessionStorage
    const redirectUrl = redirectAfterAuth || sessionStorage.getItem("redirectAfterAuth")

    if (redirectUrl) {
      // Clear the stored redirect URL
      sessionStorage.removeItem("redirectAfterAuth")
      setRedirectAfterAuth(null)

      // Use window.location for navigation to avoid RSC fetch issues
      window.location.href = redirectUrl
      return true
    }
    // If we're authenticated and on an auth page, redirect to projects
    else if (pathname === "/login" || pathname === "/register" || pathname === "/forgot-password") {
      window.location.href = "/projects"
      return true
    }

    return false
  }, [redirectAfterAuth, pathname])

  // Attempt to restore session from localStorage if needed
  const attemptSessionRestore = useCallback(async () => {
    const token = localStorage.getItem("jwt")

    if (token && !checkTokenExpiry() && !user) {
      try {
        // Try to refresh the token to ensure it's valid
        await refreshToken()

        // Wait for auth context to update
        return new Promise<void>((resolve) => {
          const checkInterval = setInterval(() => {
            if (!loading) {
              clearInterval(checkInterval)
              resolve()
            }
          }, 100)
        })
      } catch (error) {
        console.error("Failed to restore session:", error)
      }
    }
    return Promise.resolve()
  }, [user, loading, checkTokenExpiry, refreshToken])

  // Get callbackUrl from URL if present
  useEffect(() => {
    if (typeof window !== "undefined" && pathname === "/login") {
      const params = new URLSearchParams(window.location.search)
      const callbackUrl = params.get("callbackUrl")

      if (callbackUrl) {
        // Store the callback URL to redirect after successful login
        const decodedUrl = decodeURIComponent(callbackUrl)
        setRedirectAfterAuth(decodedUrl)

        // Also store in sessionStorage as a backup
        sessionStorage.setItem("redirectAfterAuth", decodedUrl)
      }
    }
  }, [pathname])

  // Main authentication state handler
  useEffect(() => {
    const handleAuthState = async () => {
      setIsCheckingAuth(true)

      try {
        // Try to restore session if needed
        await attemptSessionRestore()

        // If token is expired, clear it
        if (checkTokenExpiry()) {
          localStorage.removeItem("jwt")
          localStorage.removeItem("jwt_expiry")
        }

        // If we're on a protected route and not authenticated, redirect to login
        if (!isPublicRoute(pathname) && !user && !loading) {
          // Store the current URL to redirect back after login
          const currentUrl = pathname + (window.location.search ? window.location.search : "")
          sessionStorage.setItem("redirectAfterAuth", currentUrl)

          const returnUrl = encodeURIComponent(currentUrl)

          // Use window.location for navigation to avoid potential issues with router
          window.location.href = `/login?callbackUrl=${returnUrl}`

          // Show toast notification
          toast({
            title: "Authentication Required",
            description: "Please sign in to access this page.",
            variant: "destructive",
          })

          return
        }

        // If we're authenticated and have a redirect target, go there
        if (user && !loading) {
          const redirected = handleRedirectAfterAuth()
          if (redirected) return
        }
      } finally {
        setIsCheckingAuth(false)
      }
    }

    // Only run auth checks when loading is complete
    if (!loading) {
      handleAuthState()
    }
  }, [
    user,
    loading,
    pathname,
    toast,
    redirectAfterAuth,
    attemptSessionRestore,
    checkTokenExpiry,
    handleRedirectAfterAuth,
    isPublicRoute,
  ])

  // Set up interval to check token expiry regularly
  useEffect(() => {
    const tokenCheckInterval = setInterval(() => {
      if (checkTokenExpiry() && user) {
        // If token expired but we still have a user object, force sign out
        localStorage.removeItem("jwt")
        localStorage.removeItem("jwt_expiry")
        window.location.reload() // Force reload to clear auth state
      }
    }, 60000) // Check every minute

    return () => {
      clearInterval(tokenCheckInterval)
    }
  }, [user, checkTokenExpiry])

  // This component doesn't render anything visible, just the toaster
  return <Toaster />
}

export default AuthSessionManager

