"use client"

import { Toaster } from "@/components/ui/toaster"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { usePathname, useRouter } from "next/navigation"
import { Suspense, useEffect, useState, useRef } from "react"
import { useSearchParamsWithSuspense } from "@/hooks/use-search-params-with-suspense"
import { clearAuthTokens, updateLastActivity } from "@/services/jwt-service"
import { isPublicRoute, isAuthRoute } from "@/utils/route-utils"

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

      // CRITICAL: Skip auth checks completely for public routes when user is not logged in
      if (isPublicRoute(pathname) && !user) {
        return
      }

      // Skip auth checks for auth routes (login, register, etc.) when user is not logged in
      if (isAuthRoute(pathname) && !user) {
        return
      }

      // Avoid checking auth multiple times for logged in users
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

            // Only redirect to login if not on a public page
            if (!isPublicRoute(pathname)) {
              router.push("/login")
            }
            return
          }

          // Valid session - redirect if needed
          if (isAuthRoute(pathname)) {
            redirectInProgress.current = true
            const redirectUrl = sessionStorage.getItem("redirectAfterAuth")

            if (redirectUrl) {
              sessionStorage.removeItem("redirectAfterAuth")
              router.push(redirectUrl)
            } else {
              router.push("/projects")
            }
          }
        } else if (!isPublicRoute(pathname)) {
          // User is not authenticated and trying to access a protected route
          // Save current path for redirect after login
          sessionStorage.setItem("redirectAfterAuth", pathname)
          redirectInProgress.current = true
          router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`)
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
    if (!user) return // Skip if no user is logged in

    const updateActivityTime = () => {
      updateLastActivity()
    }

    // Add event listeners for user activities with passive option for better performance
    window.addEventListener("mousemove", updateActivityTime, { passive: true })
    window.addEventListener("keydown", updateActivityTime, { passive: true })
    window.addEventListener("click", updateActivityTime, { passive: true })
    window.addEventListener("scroll", updateActivityTime, { passive: true })
    window.addEventListener("touchstart", updateActivityTime, { passive: true })

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
    if (!user) return // Skip if no user is logged in

    // Check token when page loads
    const checkTokenValidity = async () => {
      if (authCheckInProgress.current) return

      authCheckInProgress.current = true
      try {
        const isValid = await checkAuthState()
        if (!isValid) {
          clearAuthTokens()
          await signOut()

          // Only redirect to login if not on a public page
          if (!isPublicRoute(pathname)) {
            router.push("/login")
          }
        }
      } catch (error) {
        console.error("Error checking token validity:", error)
      } finally {
        authCheckInProgress.current = false
      }
    }

    // Perform initial check after 3 seconds to avoid conflicts with page load
    const initialCheck = setTimeout(checkTokenValidity, 3000)

    // Check token every 5 minutes
    const tokenCheckInterval = setInterval(checkTokenValidity, 5 * 60 * 1000) // 5 minutes

    // Check token when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkTokenValidity()
      }
    }

    // Update last activity time before closing page
    const handleBeforeUnload = () => {
      updateLastActivity()
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      clearTimeout(initialCheck)
      clearInterval(tokenCheckInterval)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [user, checkAuthState, router, signOut, pathname])

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

