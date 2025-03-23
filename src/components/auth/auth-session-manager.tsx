"use client"

import { Toaster } from "@/components/ui/toaster"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

export const AuthSessionManager = () => {
  const { user, loading, refreshToken } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
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
  useEffect(() => {
    const handleAuthState = async () => {
      if (loading) return

      setIsCheckingAuth(true)

      try {
        // If token is expired, refresh it if we have a user
        if (user && checkTokenExpiry()) {
          await refreshToken()
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
  }, [user, loading, pathname, router, checkTokenExpiry, refreshToken, isPublicRoute])

  // Set up interval to check token expiry regularly - but less frequently
  useEffect(() => {
    const tokenCheckInterval = setInterval(() => {
      if (checkTokenExpiry() && user) {
        refreshToken()
      }
    }, 300000) // Check every 5 minutes instead of every minute

    return () => {
      clearInterval(tokenCheckInterval)
    }
  }, [user, checkTokenExpiry, refreshToken])

  // This component doesn't render anything visible, just the toaster
  return <Toaster />
}

export default AuthSessionManager

