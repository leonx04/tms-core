"use client"

import { Toaster } from "@/components/ui/toaster"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { usePathname, useRouter } from "next/navigation"
import { Suspense, useCallback, useEffect, useState } from "react"
import { useSearchParamsWithSuspense } from "@/hooks/use-search-params-with-suspense"
// Thêm import cho các hàm mới
import {
  clearAuthTokens,
  isAuthSessionValid,
  updateLastActivity,
  validateSessionOnReturn,
} from "@/services/jwt-service"

// Tạo một component sử dụng useSearchParams với Suspense
function AuthSessionContent() {
  const { user, loading, refreshToken, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParamsWithSuspense()
  const { toast } = useToast()
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  // Các tuyến công khai không yêu cầu xác thực
  const publicRoutes = [
    "/",
    "/login",
    "/register",
    "/reset-password",
    "/upgrade",
    "/forgot-password",
    // Trang footer
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

  // Kiểm tra xem tuyến có phải là công khai không
  const isPublicRoute = useCallback(
    (path: string) => {
      return publicRoutes.some((route) => path === route || path.startsWith(`${route}/`))
    },
    [publicRoutes],
  )

  // Lấy callbackUrl từ tham số URL nếu có
  useEffect(() => {
    if (pathname === "/login") {
      const callbackUrl = searchParams.get("callbackUrl")
      const isMiddlewareRedirect = searchParams.get("mw") === "1"

      if (callbackUrl) {
        // Lưu URL callback để chuyển hướng sau khi đăng nhập thành công
        const decodedUrl = decodeURIComponent(callbackUrl)
        sessionStorage.setItem("redirectAfterAuth", decodedUrl)

        // Nếu đây là chuyển hướng middleware và chúng ta có người dùng hợp lệ, chuyển hướng ngay lập tức
        if (isMiddlewareRedirect && user && !loading) {
          router.push(decodedUrl)
        }
      }
    }
  }, [pathname, searchParams, user, loading, router])

  // Xử lý sự kiện hoạt động người dùng để cập nhật thời gian hoạt động cuối cùng
  useEffect(() => {
    const updateActivityTime = () => {
      if (user) {
        updateLastActivity()
      }
    }

    // Thêm trình nghe sự kiện cho các hoạt động người dùng
    window.addEventListener("mousemove", updateActivityTime)
    window.addEventListener("keydown", updateActivityTime)
    window.addEventListener("click", updateActivityTime)
    window.addEventListener("scroll", updateActivityTime)
    window.addEventListener("touchstart", updateActivityTime)

    return () => {
      // Dọn dẹp trình nghe sự kiện
      window.removeEventListener("mousemove", updateActivityTime)
      window.removeEventListener("keydown", updateActivityTime)
      window.removeEventListener("click", updateActivityTime)
      window.removeEventListener("scroll", updateActivityTime)
      window.removeEventListener("touchstart", updateActivityTime)
    }
  }, [user])

  useEffect(() => {
    const handleAuthState = async () => {
      if (loading) return

      setIsCheckingAuth(true)

      try {
        if (user && !validateSessionOnReturn()) {
          const newToken = await refreshToken()

          if (!newToken || !isAuthSessionValid()) {
            clearAuthTokens()
            await signOut()
            router.push("/login")
            return
          }
        }

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
  }, [user, loading, pathname, router, refreshToken, isPublicRoute, signOut])

  useEffect(() => {
    const checkTokenValidity = async () => {
      if (user) {
        if (!validateSessionOnReturn()) {
          const newToken = await refreshToken()
          if (!newToken) {
            clearAuthTokens()
            await signOut()
            router.push("/login")
          }
        }
      }
    }

    checkTokenValidity()

    const tokenCheckInterval = setInterval(() => {
      if (user && !isAuthSessionValid()) {
        refreshToken().then((token) => {
          if (!token) {
            clearAuthTokens()
            signOut().then(() => {
              router.push("/login")
            })
          }
        })
      }
    }, 300000) 
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkTokenValidity()
      }
    }

    const handleBeforeUnload = () => {
      if (user) {
        updateLastActivity()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      clearInterval(tokenCheckInterval)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [user, refreshToken, router, signOut])

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

