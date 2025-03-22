"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { Toaster } from "@/components/ui/toaster"

export const AuthSessionManager = () => {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [redirectAfterAuth, setRedirectAfterAuth] = useState<string | null>(null)

  // Handle authentication state and redirects
  useEffect(() => {
    // Public routes that don't require authentication
    const publicRoutes = ["/", "/login", "/register", "/reset-password", "/upgrade", "/forgot-password"]

    // Check if the route is public
    const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))

    // Get callbackUrl from URL if present
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const callbackUrl = params.get("callbackUrl")
      if (callbackUrl && pathname === "/login") {
        // Store the callback URL to redirect after successful login
        const decodedUrl = decodeURIComponent(callbackUrl)
        setRedirectAfterAuth(decodedUrl)

        // Also store in sessionStorage as a backup
        sessionStorage.setItem("redirectAfterAuth", decodedUrl)
      }
    }

    // Check if the JWT token is expired
    const checkTokenExpiry = () => {
      const token = localStorage.getItem("jwt")
      const expiryTime = localStorage.getItem("jwt_expiry")

      // If no token or expiry, consider it expired
      if (!token || !expiryTime) return true

      // Check if token is expired
      return Date.now() > Number.parseInt(expiryTime)
    }

    // Attempt to restore session from localStorage if needed
    const attemptSessionRestore = async () => {
      const token = localStorage.getItem("jwt")

      if (token && !checkTokenExpiry() && !user) {
        // We have a valid token but no user - this can happen on page refresh
        // Let the auth context handle the restoration via onAuthStateChanged
        // Just wait for it to complete
        return new Promise<void>((resolve) => {
          const checkInterval = setInterval(() => {
            if (!loading) {
              clearInterval(checkInterval)
              resolve()
            }
          }, 100)
        })
      }
      return Promise.resolve()
    }

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
        if (!isPublicRoute && !user && !loading) {
          // Store the current URL to redirect back after login
          const currentUrl = pathname + (window.location.search ? window.location.search : "")
          sessionStorage.setItem("redirectAfterAuth", currentUrl)

          const returnUrl = encodeURIComponent(currentUrl)
          router.push(`/login?callbackUrl=${returnUrl}`)

          // Show toast notification
          toast({
            title: "Authentication Required",
            description: "Please sign in to access this page.",
            variant: "destructive",
          })
        }

        // If we're authenticated and have a redirect target, go there
        if (user && !loading) {
          // Check for redirect URL in state or sessionStorage
          const redirectUrl = redirectAfterAuth || sessionStorage.getItem("redirectAfterAuth")

          if (redirectUrl && pathname === "/login") {
            // Clear the stored redirect URL
            sessionStorage.removeItem("redirectAfterAuth")
            setRedirectAfterAuth(null)

            // Redirect to the original URL
            router.push(redirectUrl)
          }
          // If we're authenticated and on an auth page, redirect to projects
          else if (pathname === "/login" || pathname === "/register" || pathname === "/forgot-password") {
            router.push("/projects")
          }
        }
      } finally {
        setIsCheckingAuth(false)
      }
    }

    // Only run auth checks when loading is complete
    if (!loading) {
      handleAuthState()
    }

    // Set up interval to check token expiry regularly
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
  }, [user, loading, pathname, router, toast, redirectAfterAuth])

  // This component doesn't render anything visible, just the toaster
  return <Toaster />
}

export default AuthSessionManager

