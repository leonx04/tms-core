"use client"

import { Toaster } from "@/components/ui/toaster"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { usePathname, useRouter } from "next/navigation"
import { Suspense, useCallback, useEffect, useState, useRef } from "react"
import { useSearchParamsWithSuspense } from "@/hooks/use-search-params-with-suspense"
// Import functions from jwt-service
import { clearAuthTokens, updateLastActivity } from "@/services/jwt-service"

// Component using useSearchParams with Suspense
function AuthSessionContent() {
  const { user, loading, refreshToken, signOut, checkAuthState } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParamsWithSuspense()
  const { toast } = useToast()
  const [isCheckingAuth, setIsCheckingAuth] = useState(false)

  // Track auth check state to avoid repeated checks
  const authCheckInProgress = useRef(false)
  const redirectInProgress = useRef(false)
  const didInitialCheck = useRef(false)

  // Public routes that don't require authentication
  const publicRoutes = [
    "/",
    "/login",
    "/register",
    "/reset-password",
    "/forgot-password",
    "/upgrade",
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

  // Check if route is public
  const isPublicRoute = useCallback(
    (path: string) => {
      return publicRoutes.some((route) => path === route || path.startsWith(`${route}/`))
    },
    [publicRoutes],
  )

  // Get callbackUrl from URL parameters if present
  useEffect(() => {
    if (pathname === "/login" && !redirectInProgress.current) {
      const callbackUrl = searchParams.get("callbackUrl")
      const isMiddlewareRedirect = searchParams.get("mw") === "1"

      if (callbackUrl) {
        // Save callback URL to redirect after successful login
        const decodedUrl = decodeURIComponent(callbackUrl)
        sessionStorage.setItem("redirectAfterAuth", decodedUrl)

        // If this is a middleware redirect and we have a valid user, redirect immediately
        if (isMiddlewareRedirect && user && !loading) {
          redirectInProgress.current = true
          router.push(decodedUrl)
        }
      }
    }
  }, [pathname, searchParams, user, loading, router])

  // Handle authentication state when page loads
  useEffect(() => {
    const handleAuthState = async () => {
      // Skip if loading, auth check in progress, or already redirected
      if (loading || authCheckInProgress.current || redirectInProgress.current) {
        return
      }

      // Avoid checking auth multiple times
      if (user && didInitialCheck.current) {
        return
      }

      authCheckInProgress.current = true
      setIsCheckingAuth(true)

      try {
        if (user) {
          const isValid = await checkAuthState()
          didInitialCheck.current = true

          if (!isValid) {
            // If session is invalid, log out
            clearAuthTokens()
            await signOut()
            router.push("/login")
            return
          }

          // Valid session - redirect if needed
          if (pathname === "/login" || pathname === "/register" || pathname === "/forgot-password") {
            redirectInProgress.current = true
            const redirectUrl = sessionStorage.getItem("redirectAfterAuth")

            if (redirectUrl) {
              sessionStorage.removeItem("redirectAfterAuth")
              router.push(redirectUrl)
            } else {
              router.push("/projects")
            }
          }
        }
      } catch (error) {
        console.error("Error in auth check:", error)
      } finally {
        authCheckInProgress.current = false
        setIsCheckingAuth(false)
      }
    }

    handleAuthState()
  }, [user, loading, pathname, router, checkAuthState, signOut])

  // Handle user activity events to update last activity time
  useEffect(() => {
    const updateActivityTime = () => {
      if (user) {
        updateLastActivity()
      }
    }

    // Add event listeners for user activities
    window.addEventListener("mousemove", updateActivityTime)
    window.addEventListener("keydown", updateActivityTime)
    window.addEventListener("click", updateActivityTime)
    window.addEventListener("scroll", updateActivityTime)
    window.addEventListener("touchstart", updateActivityTime)

    return () => {
      // Clean up event listeners
      window.removeEventListener("mousemove", updateActivityTime)
      window.removeEventListener("keydown", updateActivityTime)
      window.removeEventListener("click", updateActivityTime)
      window.removeEventListener("scroll", updateActivityTime)
      window.removeEventListener("touchstart", updateActivityTime)
    }
  }, [user])

  // Periodically check token validity
  useEffect(() => {
    // Check token when page loads
    const checkTokenValidity = async () => {
      if (user && !authCheckInProgress.current) {
        authCheckInProgress.current = true
        try {
          const isValid = await checkAuthState()
          if (!isValid) {
            clearAuthTokens()
            await signOut()
            router.push("/login")
          }
        } catch (error) {
          console.error("Error checking token validity:", error)
        } finally {
          authCheckInProgress.current = false
        }
      }
    }

    // Perform initial check after 3 seconds to avoid conflicts with page load
    const initialCheck = setTimeout(checkTokenValidity, 3000)

    // Check token every 5 minutes
    const tokenCheckInterval = setInterval(checkTokenValidity, 5 * 60 * 1000) // 5 minutes

    // Check token when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && user) {
        checkTokenValidity()
      }
    }

    // Update last activity time before closing page
    const handleBeforeUnload = () => {
      if (user) {
        updateLastActivity()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      clearTimeout(initialCheck)
      clearInterval(tokenCheckInterval)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [user, checkAuthState, router, signOut])

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

