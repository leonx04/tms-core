"use client"

import { Toaster } from "@/components/ui/toaster"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { usePathname, useRouter } from "next/navigation"
import { Suspense, useCallback, useEffect, useState } from "react"
import { useSearchParamsWithSuspense } from "@/hooks/use-search-params-with-suspense"
// Add import for the new functions
import { clearAuthTokens, isAuthSessionValid } from "@/services/jwt-service"

// Create a component that uses useSearchParams with Suspense
function AuthSessionContent() {
  const { user, loading, refreshToken, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParamsWithSuspense()
  const { toast } = useToast()
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

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
    const expiryTime = localStorage.getItem("jwt_expiry")
    // If no expiry, consider it expired
    if (!expiryTime) return true
    // Check if token is expired
    return Date.now() > Number.parseInt(expiryTime)
  }, [])

  // Get callbackUrl from URL if present
  useEffect(() => {
    if (pathname === "/login") {
      const callbackUrl = searchParams.get("callbackUrl")
      const isMiddlewareRedirect = searchParams.get("mw") === "1"

      if (callbackUrl) {
        // Store the callback URL to redirect after successful login
        const decodedUrl = decodeURIComponent(callbackUrl)
        sessionStorage.setItem("redirectAfterAuth", decodedUrl)

        // If this is a middleware redirect and we have a valid user, redirect immediately
        if (isMiddlewareRedirect && user && !loading) {
          router.push(decodedUrl)
        }
      }
    }
  }, [pathname, searchParams, user, loading, router])

  // Main authentication state handler - simplified to avoid conflicts with middleware
  // Update the useEffect for main authentication state handler
  useEffect(() => {
    const handleAuthState = async () => {
      if (loading) return

      setIsCheckingAuth(true)

      try {
        // Check for expired token on page load/return to site
        if (user && checkTokenExpiry()) {
          // Try to refresh the token
          const newToken = await refreshToken()

          // If refresh failed, force logout and redirect to login
          if (!newToken || !isAuthSessionValid()) {
            console.log("Token expired and refresh failed, logging out")
            clearAuthTokens()
            await signOut()
            router.push("/login")
            return
          }
        }

        // Client-side handling for auth pages when user is logged in
        if (user && (pathname === "/login" || pathname === "/register" || pathname === "/forgot-password")) {
          const redirectUrl = sessionStorage.getItem("redirectAfterAuth")
          if (redirectUrl) {
            sessionStorage.removeItem("redirectAfterAuth")
            router.push(redirectUrl)
          } else {
            router.push("/projects")
          }
          return
        }

        // Handle redirect after login
        if (user && pathname === "/login") {
          const redirectUrl = sessionStorage.getItem("redirectAfterAuth")
          if (redirectUrl) {
            sessionStorage.removeItem("redirectAfterAuth")
            router.push(redirectUrl)
          } else {
            router.push("/projects")
          }
        }
      } finally {
        setIsCheckingAuth(false)
      }
    }

    handleAuthState()
  }, [user, loading, pathname, router, checkTokenExpiry, refreshToken, isPublicRoute, signOut])

  // Set up interval to check token expiry regularly - but less frequently
  // Update the interval effect to also check auth session validity
  useEffect(() => {
    // Check token validity immediately when component mounts or when returning to the site
    const checkTokenValidity = async () => {
      if (user) {
        if (checkTokenExpiry() || !isAuthSessionValid()) {
          const newToken = await refreshToken()
          if (!newToken) {
            // Token refresh failed, force logout
            clearAuthTokens()
            await signOut()
            router.push("/login")
          }
        }
      }
    }

    // Run the check immediately
    checkTokenValidity()

    const tokenCheckInterval = setInterval(() => {
      if ((checkTokenExpiry() || !isAuthSessionValid()) && user) {
        refreshToken().then((token) => {
          if (!token) {
            // Token refresh failed, force logout
            clearAuthTokens()
            signOut().then(() => {
              router.push("/login")
            })
          }
        })
      }
    }, 300000) // Check every 5 minutes

    // Add a visibility change listener to check token when user returns to the tab/window
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkTokenValidity()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      clearInterval(tokenCheckInterval)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [user, checkTokenExpiry, refreshToken, router, signOut])

  return null
}

export const AuthSessionManager = () => {
  return (
    <>
      <Suspense fallback={null}>
        <AuthSessionContent />
      </Suspense>
      <Toaster />
    </>
  )
}

export default AuthSessionManager

