"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { Toaster } from "@/components/ui/toaster"

export const AuthSessionManager = () => {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()

  useEffect(() => {
    // Check if the JWT token is expired
    const checkTokenExpiry = () => {
      const expiryTime = localStorage.getItem("jwt_expiry")

      if (expiryTime && Date.now() > Number.parseInt(expiryTime)) {
        // Token expired, redirect to home with message
        redirectToHome("Session expired. Please sign in again.")
        return true
      }
      return false
    }

    // Check if user is authenticated for protected routes
    const checkAuthStatus = () => {
      // Skip checks for public routes
      const publicRoutes = ["/", "/login", "/signup", "/reset-password", "/privacy", "/terms"]
      if (publicRoutes.some(route => pathname === route || pathname.startsWith(route + "/"))) {
        return
      }

      // If we're not loading and there's no user, redirect to home
      if (!loading && !user) {
        redirectToHome("Please sign in to access this page.")
      }
    }

    // Redirect to home with a message
    const redirectToHome = (message: string) => {
      // Only redirect if we're not already on the home page
      if (pathname !== "/") {
        router.push("/")

        // Show toast notification with a slight delay to ensure it appears after navigation
        setTimeout(() => {
          toast({
            title: "Authentication Required",
            description: message,
            variant: "destructive",
          })
        }, 100)
      }
    }

    // First check token expiry
    const isExpired = checkTokenExpiry()

    // If token is not expired, check auth status
    if (!isExpired) {
      checkAuthStatus()
    }

    // Set up interval to check token expiry regularly
    const tokenCheckInterval = setInterval(() => {
      checkTokenExpiry()
    }, 60000) // Check every minute

    return () => {
      clearInterval(tokenCheckInterval)
    }
  }, [user, loading, router, pathname, toast])

  // This component doesn't render anything visible, just the toaster
  return <Toaster />
}

export default AuthSessionManager