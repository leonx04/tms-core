"use client"

import { auth } from "@/config/firebase"
import { useToast } from "@/hooks/use-toast"
import type { UserData } from "@/types"
import { onAuthStateChanged } from "firebase/auth"
import { useRouter } from "next/navigation"
import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"

// Import services
import {
  signOut as authSignOut,
  signInWithEmail,
  signUpWithEmail,
  updateUserProfile,
} from "@/services/email-auth-service"
import { clearAuthTokens, updateAuthToken, setAuthSessionValid, validateSessionOnReturn } from "@/services/jwt-service"
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * AuthProvider is a React context provider that manages user authentication and provides
 * authentication-related functions and state to its children components.
 *
 * @param {object} props - The props passed to the AuthProvider component.
 * @param {React.ReactNode} props.children - The children components that will be wrapped by the AuthProvider.
 *
 * @returns {React.ReactElement} - The AuthProvider component with the provided children.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const router = useRouter()

  // Function to refresh the token
  const refreshToken = async () => {
    if (!auth.currentUser) return null

    try {
      const token = await updateAuthToken(auth.currentUser)
      if (token) {
        // Mark the session as valid since we successfully refreshed the token
        setAuthSessionValid()
        return token
      }
      return null
    } catch (error) {
      console.error("Error refreshing token:", error)
      // Clear tokens on refresh failure
      clearAuthTokens()
      return null
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)

      if (user) {
        // Check session validity when returning to the website
        if (!validateSessionOnReturn()) {
          // Try to refresh the token
          const token = await updateAuthToken(user)
          if (!token) {
            // If refresh fails, set user to null and clear tokens
            setUser(null)
            clearAuthTokens()
            setLoading(false)
            return
          }
        }

        // Update auth token
        const token = await updateAuthToken(user)

        // Mark the session as valid if we got a token
        if (token) {
          setAuthSessionValid()
        }

        // Fetch user data from database
        const userDataResult = await fetchUserData(user.uid)

        if (userDataResult) {
          setUserData(userDataResult)
          // Update lastActive in a separate operation to not block the main flow
          updateLastActive(user.uid).catch(console.error)
        } else {
          // Create new user data if it doesn't exist
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

  // Sign in with email and password
  const handleSignIn = async (email: string, password: string): Promise<void> => {
    try {
      const result = await signInWithEmail(email, password)

      if (result.success) {
        toast({
          title: "Welcome back!",
          description: "You've successfully signed in.",
        })

        // Check for redirect after auth
        const redirectUrl = sessionStorage.getItem("redirectAfterAuth")
        if (redirectUrl) {
          sessionStorage.removeItem("redirectAfterAuth")
          router.push(redirectUrl)
        } else {
          router.push("/projects")
        }
      } else {
        toast({
          title: "Sign in failed",
          description: result.error,
          variant: "destructive",
        })
        throw new Error(result.error)
      }
    } catch (error: any) {
      console.error("Sign in error:", error)
      throw error
    }
  }

  // Sign in with Google
  const handleSignInWithGoogle = async () => {
    try {
      const result = await signInWithGoogle()

      if (result.success) {
        toast({
          title: "Welcome!",
          description: "You've successfully signed in with Google.",
        })

        // Check for redirect after auth
        const redirectUrl = sessionStorage.getItem("redirectAfterAuth")
        if (redirectUrl) {
          sessionStorage.removeItem("redirectAfterAuth")
          router.push(redirectUrl)
        } else {
          router.push("/projects")
        }
      } else {
        toast({
          title: "Google sign in failed",
          description: result.error,
          variant: "destructive",
          duration: 8000,
        })
        throw new Error(result.error)
      }
    } catch (error: any) {
      console.error("Google sign-in error:", error)
      throw error
    }
  }

  // Sign in with GitHub
  const handleSignInWithGithub = async () => {
    try {
      const result = await signInWithGithub()

      if (result.success) {
        toast({
          title: "Welcome!",
          description: "You've successfully signed in with GitHub.",
        })

        // Check for redirect after auth
        const redirectUrl = sessionStorage.getItem("redirectAfterAuth")
        if (redirectUrl) {
          sessionStorage.removeItem("redirectAfterAuth")
          router.push(redirectUrl)
        } else {
          router.push("/projects")
        }
      } else {
        toast({
          title: "GitHub sign in failed",
          description: result.error,
          variant: "destructive",
          duration: 8000,
        })
        throw new Error(result.error)
      }
    } catch (error: any) {
      console.error("GitHub sign-in error:", error)
      throw error
    }
  }

  // Sign up with email and password
  const handleSignUp = async (email: string, password: string, displayName: string) => {
    try {
      const result = await signUpWithEmail(email, password, displayName)

      if (result.success) {
        toast({
          title: "Account created",
          description: "Your account has been successfully created.",
        })

        // Navigate to projects page
        router.push("/projects")
      } else {
        toast({
          title: "Sign up failed",
          description: result.error,
          variant: "destructive",
          duration: 6000,
        })
        throw new Error(result.error)
      }
    } catch (error: any) {
      console.error("Sign up error:", error)
      throw error
    }
  }

  // Sign out
  const handleSignOut = async () => {
    try {
      const result = await authSignOut()

      if (result.success) {
        // Ensure all tokens and session data are cleared
        clearAuthTokens()

        toast({
          title: "Signed out",
          description: "You've been successfully signed out.",
        })

        // Use router instead of window.location
        router.push("/login")
      } else {
        toast({
          title: "Sign out failed",
          description: result.error,
          variant: "destructive",
        })
        throw new Error(result.error)
      }
    } catch (error: any) {
      console.error("Sign out error:", error)
      throw error
    }
  }

  // Update user data
  const handleUpdateUserData = async (data: Partial<UserData>) => {
    if (!user) {
      toast({
        title: "Update failed",
        description: "You must be logged in to update your profile.",
        variant: "destructive",
      })
      return
    }

    try {
      const success = await updateUserData(user.uid, data)

      if (success) {
        setUserData((prev) => (prev ? { ...prev, ...data } : null))

        toast({
          title: "Profile updated",
          description: "Your profile has been successfully updated.",
        })
      } else {
        toast({
          title: "Update failed",
          description: "Failed to update your profile. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Update user data error:", error)
      toast({
        title: "Update failed",
        description: "Failed to update your profile. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Update user profile
  const handleUpdateUserProfile = async (data: {
    displayName?: string
    email?: string
    password?: string
    currentPassword?: string
  }) => {
    if (!user || !user.email) {
      toast({
        title: "Update failed",
        description: "You must be logged in to update your profile.",
        variant: "destructive",
      })
      return
    }

    try {
      const updates: Partial<UserData> = {}
      const result = await updateUserProfile(user, data)

      if (result.success) {
        // Update display name if requested
        if (data.displayName && data.displayName !== user.displayName) {
          updates.displayName = data.displayName
        }

        // Update email if requested
        if (data.email && data.email !== user.email) {
          updates.email = data.email
        }

        // Update user data in database if there are changes
        if (Object.keys(updates).length > 0) {
          await handleUpdateUserData(updates)
        }

        if (data.password) {
          toast({
            title: "Password updated",
            description: "Your password has been successfully updated.",
          })
        }
      } else {
        toast({
          title: "Update failed",
          description: result.error,
          variant: "destructive",
        })

        if (result.code === "auth/requires-recent-login") {
          await handleSignOut()
        }

        throw new Error(result.error)
      }
    } catch (error: any) {
      console.error("Update profile error:", error)
      throw error
    }
  }

  // Link with Google account
  const handleLinkWithGoogleAccount = async () => {
    if (!auth.currentUser) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to link an account.",
        variant: "destructive",
      })
      throw new Error("User must be logged in to link an account.")
    }

    try {
      const result = await linkWithGoogleAccount(auth.currentUser)

      if (result.success) {
        toast({
          title: "Account linked",
          description: "Your Google account has been successfully linked.",
        })
      } else {
        toast({
          title: "Linking failed",
          description: result.error,
          variant: "destructive",
        })
        throw new Error("Error linking Google account: " + result.error)
      }
    } catch (error: any) {
      console.error("Link Google account error:", error)
      throw error
    }
  }

  // Link with GitHub account
  const handleLinkWithGithubAccount = async () => {
    if (!auth.currentUser) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to link an account.",
        variant: "destructive",
      })
      throw new Error("User must be logged in to link an account.")
    }

    try {
      const result = await linkWithGithubAccount(auth.currentUser)

      if (result.success) {
        toast({
          title: "Account linked",
          description: "Your GitHub account has been successfully linked.",
        })
      } else {
        toast({
          title: "Linking failed",
          description: result.error,
          variant: "destructive",
        })
        throw new Error("Error linking GitHub account: " + result.error)
      }
    } catch (error: any) {
      console.error("Link GitHub account error:", error)
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
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

