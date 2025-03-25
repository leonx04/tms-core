"use client"

import { Toaster } from "@/components/ui/toaster"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { usePathname, useRouter } from "next/navigation"
import { Suspense, useCallback, useEffect, useState } from "react"
import { useSearchParamsWithSuspense } from "@/hooks/use-search-params-with-suspense"
// Import các hàm từ jwt-service
import { clearAuthTokens, updateLastActivity } from "@/services/jwt-service"

// Component sử dụng useSearchParams với Suspense
function AuthSessionContent() {
  const { user, loading, refreshToken, signOut, checkAuthState } = useAuth()
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
    "/forgot-password",
    "/upgrade",
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

  // Xử lý trạng thái xác thực khi trang được tải
  useEffect(() => {
    const handleAuthState = async () => {
      if (loading) return

      setIsCheckingAuth(true)

      try {
        // Kiểm tra phiên khi quay lại trang web
        if (user) {
          const isValid = await checkAuthState()

          if (!isValid) {
            // Nếu phiên không hợp lệ, đăng xuất
            clearAuthTokens()
            await signOut()
            router.push("/login")
            return
          }
        }

        // Chuyển hướng nếu đã đăng nhập và đang ở trang đăng nhập/đăng ký
        if (user && (pathname === "/login" || pathname === "/register" || pathname === "/forgot-password")) {
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
  }, [user, loading, pathname, router, checkAuthState, signOut])

  // Kiểm tra định kỳ tính hợp lệ của token
  useEffect(() => {
    // Kiểm tra token khi trang được tải
    const checkTokenValidity = async () => {
      if (user) {
        const isValid = await checkAuthState()
        if (!isValid) {
          clearAuthTokens()
          await signOut()
          router.push("/login")
        }
      }
    }

    checkTokenValidity()

    // Kiểm tra token mỗi 5 phút
    const tokenCheckInterval = setInterval(
      () => {
        if (user) {
          checkAuthState().then((isValid) => {
            if (!isValid) {
              clearAuthTokens()
              signOut().then(() => {
                router.push("/login")
              })
            }
          })
        }
      },
      5 * 60 * 1000,
    ) // 5 phút

    // Kiểm tra token khi tab trở nên hiển thị
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && user) {
        checkTokenValidity()
      }
    }

    // Cập nhật thời gian hoạt động cuối cùng trước khi đóng trang
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

