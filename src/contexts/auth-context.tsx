"use client"

import { auth } from "@/config/firebase"
import { useToast } from "@/hooks/use-toast"
import type { UserData } from "@/types"
import { onAuthStateChanged } from "firebase/auth"
import { useRouter } from "next/navigation"
import type React from "react"
import { createContext, useContext, useEffect, useState, useCallback } from "react"

// Import services
import {
  signOut as authSignOut,
  signInWithEmail,
  signUpWithEmail,
  updateUserProfile,
} from "@/services/email-auth-service"
import {
  clearAuthTokens,
  updateAuthToken,
  setAuthSessionValid,
  validateSessionOnReturn,
  setupAuthSyncBetweenTabs,
  isAuthSessionValid,
  getCurrentToken,
} from "@/services/jwt-service"
import { decryptRoute, encryptRoute, obscureUserId } from "@/services/route-security-service"
import {
  linkWithGithubAccount,
  linkWithGoogleAccount,
  signInWithGithub,
  signInWithGoogle,
} from "@/services/social-auth-service"
import { createUserData, fetchUserData, updateLastActive, updateUserData } from "@/services/user-data-service"

type AuthContextType = {
  user: any | null
  userData: UserData | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInWithGithub: () => Promise<void>
  signUp: (email: string, password: string, displayName: string) => Promise<void>
  signOut: () => Promise<void>
  updateUserData: (data: Partial<UserData>) => Promise<void>
  linkWithGoogleAccount: () => Promise<void>
  linkWithGithubAccount: () => Promise<void>
  updateUserProfile: (data: {
    displayName?: string
    email?: string
    password?: string
    currentPassword?: string
  }) => Promise<void>
  encryptRoute: (route: string) => string
  decryptRoute: (encryptedRoute: string) => string
  obscureUserId: (userId: string, visibleChars?: number) => string
  refreshToken: () => Promise<string | null>
  checkAuthState: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * AuthProvider là một React context provider quản lý xác thực người dùng và cung cấp
 * các hàm và trạng thái liên quan đến xác thực cho các component con.
 *
 * @param {object} props - Props được truyền vào component AuthProvider.
 * @param {React.ReactNode} props.children - Các component con sẽ được bao bọc bởi AuthProvider.
 *
 * @returns {React.ReactElement} - Component AuthProvider với các children được cung cấp.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const router = useRouter()

  // Hàm để làm mới token
  const refreshToken = async () => {
    if (!auth.currentUser) return null

    try {
      const token = await updateAuthToken(auth.currentUser)
      if (token) {
        // Đánh dấu phiên là hợp lệ vì chúng ta đã làm mới token thành công
        setAuthSessionValid()
        return token
      }
      return null
    } catch (error) {
      console.error("Lỗi khi làm mới token:", error)
      // Xóa token khi làm mới thất bại
      clearAuthTokens()
      return null
    }
  }

  // Hàm kiểm tra trạng thái xác thực
  const checkAuthState = useCallback(async (): Promise<boolean> => {
    if (!auth.currentUser) return false

    // Kiểm tra tính hợp lệ của phiên
    if (!isAuthSessionValid()) {
      // Thử làm mới token
      const token = await refreshToken()
      if (!token) {
        clearAuthTokens()
        return false
      }
    }

    // Kiểm tra xem token hiện tại có tồn tại không
    const currentToken = getCurrentToken()
    if (!currentToken) {
      // Thử lấy token mới
      const token = await refreshToken()
      if (!token) {
        clearAuthTokens()
        return false
      }
    }

    return true
  }, [])

  // Xử lý đăng xuất từ tab khác
  const handleLogoutFromOtherTab = useCallback(() => {
    setUser(null)
    setUserData(null)
    router.push("/login")
  }, [router])

  // Xử lý cập nhật phiên từ tab khác
  const handleSessionUpdateFromOtherTab = useCallback(() => {
    // Chỉ cần kiểm tra trạng thái xác thực nếu cần
    if (user) {
      checkAuthState().catch(console.error)
    }
  }, [user, checkAuthState])

  useEffect(() => {
    // Thiết lập đồng bộ hóa giữa các tab
    const cleanup = setupAuthSyncBetweenTabs(handleLogoutFromOtherTab, handleSessionUpdateFromOtherTab)

    return cleanup
  }, [handleLogoutFromOtherTab, handleSessionUpdateFromOtherTab])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)

      if (user) {
        // Kiểm tra tính hợp lệ của phiên khi quay lại trang web
        if (!validateSessionOnReturn()) {
          // Thử làm mới token
          const token = await updateAuthToken(user)
          if (!token) {
            // Nếu làm mới thất bại, đặt user thành null và xóa token
            setUser(null)
            clearAuthTokens()
            setLoading(false)
            return
          }
        }

        // Cập nhật token xác thực
        const token = await updateAuthToken(user)

        // Đánh dấu phiên là hợp lệ nếu chúng ta có token
        if (token) {
          setAuthSessionValid()
        }

        // Lấy dữ liệu người dùng từ cơ sở dữ liệu
        const userDataResult = await fetchUserData(user.uid)

        if (userDataResult) {
          setUserData(userDataResult)
          // Cập nhật lastActive trong một hoạt động riêng biệt để không chặn luồng chính
          updateLastActive(user.uid).catch(console.error)
        } else {
          // Tạo dữ liệu người dùng mới nếu nó không tồn tại
          const newUserData: UserData = {
            id: user.uid,
            email: user.email || "",
            displayName: user.displayName || "",
            photoURL: user.photoURL || "",
            packageId: "basic",
            packageExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            lastActive: new Date().toISOString(),
            preferences: { emailNotifications: true, inAppNotifications: true },
          }
          await createUserData(user.uid, newUserData)
          setUserData(newUserData)
        }
      } else {
        setUserData(null)
        clearAuthTokens()
      }

      setLoading(false)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  // Đăng nhập bằng email và mật khẩu
  const handleSignIn = async (email: string, password: string): Promise<void> => {
    try {
      const result = await signInWithEmail(email, password)

      if (result.success) {
        toast({
          title: "Chào mừng trở lại!",
          description: "Bạn đã đăng nhập thành công.",
        })

        // Kiểm tra chuyển hướng sau khi xác thực
        const redirectUrl = sessionStorage.getItem("redirectAfterAuth")
        if (redirectUrl) {
          sessionStorage.removeItem("redirectAfterAuth")
          router.push(redirectUrl)
        } else {
          router.push("/projects")
        }
      } else {
        toast({
          title: "Đăng nhập thất bại",
          description: result.error,
          variant: "destructive",
        })
        throw new Error(result.error)
      }
    } catch (error: any) {
      console.error("Lỗi đăng nhập:", error)
      throw error
    }
  }

  // Đăng nhập bằng Google
  const handleSignInWithGoogle = async () => {
    try {
      const result = await signInWithGoogle()

      if (result.success) {
        toast({
          title: "Chào mừng!",
          description: "Bạn đã đăng nhập thành công bằng Google.",
        })

        // Kiểm tra chuyển hướng sau khi xác thực
        const redirectUrl = sessionStorage.getItem("redirectAfterAuth")
        if (redirectUrl) {
          sessionStorage.removeItem("redirectAfterAuth")
          router.push(redirectUrl)
        } else {
          router.push("/projects")
        }
      } else {
        toast({
          title: "Đăng nhập Google thất bại",
          description: result.error,
          variant: "destructive",
          duration: 8000,
        })
        throw new Error(result.error)
      }
    } catch (error: any) {
      console.error("Lỗi đăng nhập Google:", error)
      throw error
    }
  }

  // Đăng nhập bằng GitHub
  const handleSignInWithGithub = async () => {
    try {
      const result = await signInWithGithub()

      if (result.success) {
        toast({
          title: "Chào mừng!",
          description: "Bạn đã đăng nhập thành công bằng GitHub.",
        })

        // Kiểm tra chuyển hướng sau khi xác thực
        const redirectUrl = sessionStorage.getItem("redirectAfterAuth")
        if (redirectUrl) {
          sessionStorage.removeItem("redirectAfterAuth")
          router.push(redirectUrl)
        } else {
          router.push("/projects")
        }
      } else {
        toast({
          title: "Đăng nhập GitHub thất bại",
          description: result.error,
          variant: "destructive",
          duration: 8000,
        })
        throw new Error(result.error)
      }
    } catch (error: any) {
      console.error("Lỗi đăng nhập GitHub:", error)
      throw error
    }
  }

  // Đăng ký bằng email và mật khẩu
  const handleSignUp = async (email: string, password: string, displayName: string) => {
    try {
      const result = await signUpWithEmail(email, password, displayName)

      if (result.success) {
        toast({
          title: "Tài khoản đã được tạo",
          description: "Tài khoản của bạn đã được tạo thành công.",
        })

        // Điều hướng đến trang projects
        router.push("/projects")
      } else {
        toast({
          title: "Đăng ký thất bại",
          description: result.error,
          variant: "destructive",
          duration: 6000,
        })
        throw new Error(result.error)
      }
    } catch (error: any) {
      console.error("Lỗi đăng ký:", error)
      throw error
    }
  }

  // Đăng xuất
  const handleSignOut = async () => {
    try {
      const result = await authSignOut()

      if (result.success) {
        // Đảm bảo tất cả token và dữ liệu phiên được xóa
        clearAuthTokens()

        toast({
          title: "Đã đăng xuất",
          description: "Bạn đã đăng xuất thành công.",
        })

        // Sử dụng router thay vì window.location
        router.push("/login")
      } else {
        toast({
          title: "Đăng xuất thất bại",
          description: result.error,
          variant: "destructive",
        })
        throw new Error(result.error)
      }
    } catch (error: any) {
      console.error("Lỗi đăng xuất:", error)
      throw error
    }
  }

  // Cập nhật dữ liệu người dùng
  const handleUpdateUserData = async (data: Partial<UserData>) => {
    if (!user) {
      toast({
        title: "Cập nhật thất bại",
        description: "Bạn phải đăng nhập để cập nhật hồ sơ của mình.",
        variant: "destructive",
      })
      return
    }

    try {
      const success = await updateUserData(user.uid, data)

      if (success) {
        setUserData((prev) => (prev ? { ...prev, ...data } : null))

        toast({
          title: "Hồ sơ đã được cập nhật",
          description: "Hồ sơ của bạn đã được cập nhật thành công.",
        })
      } else {
        toast({
          title: "Cập nhật thất bại",
          description: "Không thể cập nhật hồ sơ của bạn. Vui lòng thử lại.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Lỗi cập nhật dữ liệu người dùng:", error)
      toast({
        title: "Cập nhật thất bại",
        description: "Không thể cập nhật hồ sơ của bạn. Vui lòng thử lại.",
        variant: "destructive",
      })
    }
  }

  // Cập nhật hồ sơ người dùng
  const handleUpdateUserProfile = async (data: {
    displayName?: string
    email?: string
    password?: string
    currentPassword?: string
  }) => {
    if (!user || !user.email) {
      toast({
        title: "Cập nhật thất bại",
        description: "Bạn phải đăng nhập để cập nhật hồ sơ của mình.",
        variant: "destructive",
      })
      return
    }

    try {
      const updates: Partial<UserData> = {}
      const result = await updateUserProfile(user, data)

      if (result.success) {
        // Cập nhật tên hiển thị nếu được yêu cầu
        if (data.displayName && data.displayName !== user.displayName) {
          updates.displayName = data.displayName
        }

        // Cập nhật email nếu được yêu cầu
        if (data.email && data.email !== user.email) {
          updates.email = data.email
        }

        // Cập nhật dữ liệu người dùng trong cơ sở dữ liệu nếu có thay đổi
        if (Object.keys(updates).length > 0) {
          await handleUpdateUserData(updates)
        }

        if (data.password) {
          toast({
            title: "Mật khẩu đã được cập nhật",
            description: "Mật khẩu của bạn đã được cập nhật thành công.",
          })
        }
      } else {
        toast({
          title: "Cập nhật thất bại",
          description: result.error,
          variant: "destructive",
        })

        if (result.code === "auth/requires-recent-login") {
          await handleSignOut()
        }

        throw new Error(result.error)
      }
    } catch (error: any) {
      console.error("Lỗi cập nhật hồ sơ:", error)
      throw error
    }
  }

  // Liên kết với tài khoản Google
  const handleLinkWithGoogleAccount = async () => {
    if (!auth.currentUser) {
      toast({
        title: "Yêu cầu xác thực",
        description: "Bạn phải đăng nhập để liên kết tài khoản.",
        variant: "destructive",
      })
      throw new Error("Người dùng phải đăng nhập để liên kết tài khoản.")
    }

    try {
      const result = await linkWithGoogleAccount(auth.currentUser)

      if (result.success) {
        toast({
          title: "Tài khoản đã được liên kết",
          description: "Tài khoản Google của bạn đã được liên kết thành công.",
        })
      } else {
        toast({
          title: "Liên kết thất bại",
          description: result.error,
          variant: "destructive",
        })
        throw new Error("Lỗi khi liên kết tài khoản Google: " + result.error)
      }
    } catch (error: any) {
      console.error("Lỗi liên kết tài khoản Google:", error)
      throw error
    }
  }

  // Liên kết với tài khoản GitHub
  const handleLinkWithGithubAccount = async () => {
    if (!auth.currentUser) {
      toast({
        title: "Yêu cầu xác thực",
        description: "Bạn phải đăng nhập để liên kết tài khoản.",
        variant: "destructive",
      })
      throw new Error("Người dùng phải đăng nhập để liên kết tài khoản.")
    }

    try {
      const result = await linkWithGithubAccount(auth.currentUser)

      if (result.success) {
        toast({
          title: "Tài khoản đã được liên kết",
          description: "Tài khoản GitHub của bạn đã được liên kết thành công.",
        })
      } else {
        toast({
          title: "Liên kết thất bại",
          description: result.error,
          variant: "destructive",
        })
        throw new Error("Lỗi khi liên kết tài khoản GitHub: " + result.error)
      }
    } catch (error: any) {
      console.error("Lỗi liên kết tài khoản GitHub:", error)
      throw error
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        userData,
        loading,
        signIn: handleSignIn,
        signInWithGoogle: handleSignInWithGoogle,
        signInWithGithub: handleSignInWithGithub,
        signUp: handleSignUp,
        signOut: handleSignOut,
        updateUserData: handleUpdateUserData,
        updateUserProfile: handleUpdateUserProfile,
        linkWithGoogleAccount: handleLinkWithGoogleAccount,
        linkWithGithubAccount: handleLinkWithGithubAccount,
        encryptRoute,
        decryptRoute,
        obscureUserId,
        refreshToken,
        checkAuthState,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth phải được sử dụng trong AuthProvider")
  }
  return context
}

