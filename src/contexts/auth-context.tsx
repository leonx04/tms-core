"use client"

import { auth } from "@/config/firebase"
import { useToast } from "@/hooks/use-toast"
import type { UserData } from "@/types"
import { onAuthStateChanged } from "firebase/auth"
import { useRouter } from "next/navigation"
import type React from "react"
import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react"

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
 * AuthProvider is a React context provider that manages user authentication and provides
 * authentication-related functions and state to child components.
 *
 * @param {object} props - Props passed to the AuthProvider component.
 * @param {React.ReactNode} props.children - Child components to be wrapped by AuthProvider.
 *
 * @returns {React.ReactElement} - AuthProvider component with the provided children.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const router = useRouter()

  // Use refs to track user data loading/authentication process
  const userDataFetchInProgress = useRef(false)
  const authInitialized = useRef(false)

  // Function to refresh token
  const refreshToken = async () => {
    if (!auth.currentUser) return null

    try {
      const token = await updateAuthToken(auth.currentUser)
      if (token) {
        // Mark session as valid since we successfully refreshed the token
        setAuthSessionValid()
        return token
      }
      return null
    } catch (error) {
      console.error("Error refreshing token:", error)
      // Clear tokens when refresh fails
      clearAuthTokens()
      return null
    }
  }

  // Function to check authentication state
  const checkAuthState = useCallback(async (): Promise<boolean> => {
    if (!auth.currentUser) return false

    // Check session validity
    if (!isAuthSessionValid()) {
      // Try to refresh token
      const token = await refreshToken()
      if (!token) {
        clearAuthTokens()
        return false
      }
    }

    // Check if current token exists
    const currentToken = getCurrentToken()
    if (!currentToken) {
      // Try to get a new token
      const token = await refreshToken()
      if (!token) {
        clearAuthTokens()
        return false
      }
    }

    return true
  }, [])

  // Handle logout from other tab
  const handleLogoutFromOtherTab = useCallback(() => {
    setUser(null)
    setUserData(null)
    router.push("/login")
  }, [router])

  // Handle session update from other tab
  const handleSessionUpdateFromOtherTab = useCallback(() => {
    // Only check auth state if needed
    if (user) {
      checkAuthState().catch(console.error)
    }
  }, [user, checkAuthState])

  // Set up sync between tabs
  useEffect(() => {
    const cleanup = setupAuthSyncBetweenTabs(handleLogoutFromOtherTab, handleSessionUpdateFromOtherTab)
    return cleanup
  }, [handleLogoutFromOtherTab, handleSessionUpdateFromOtherTab])

  // Initialize and manage authentication state
  useEffect(() => {
    // Avoid multiple initializations
    if (authInitialized.current) return

    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      // Mark auth as initialized
      authInitialized.current = true

      try {
        if (authUser) {
          // Check session validity when returning to the website
          if (!validateSessionOnReturn()) {
            try {
              // Try to refresh token
              const token = await updateAuthToken(authUser)
              if (!token) {
                // If refresh fails, set user to null and clear tokens
                setUser(null)
                clearAuthTokens()
                setLoading(false)
                return
              }
            } catch (tokenError) {
              console.error("Token refresh error:", tokenError)
              setUser(null)
              clearAuthTokens()
              setLoading(false)
              return
            }
          }

          // Update authentication token
          try {
            const token = await updateAuthToken(authUser)
            // Mark session as valid if we have a token
            if (token) {
              setAuthSessionValid()
            } else {
              setUser(null)
              clearAuthTokens()
              setLoading(false)
              return
            }
          } catch (tokenError) {
            console.error("Token update error:", tokenError)
            setUser(null)
            clearAuthTokens()
            setLoading(false)
            return
          }

          // Update user state
          setUser(authUser)

          // Avoid fetching user data multiple times
          if (!userDataFetchInProgress.current) {
            userDataFetchInProgress.current = true

            try {
              // Fetch user data from database
              const userDataResult = await fetchUserData(authUser.uid)

              if (userDataResult) {
                setUserData(userDataResult)
                // Update lastActive in a separate operation
                updateLastActive(authUser.uid).catch((error) => {
                  console.error("Failed to update last active:", error)
                })
              } else {
                // Create new user data if it doesn't exist
                const newUserData: UserData = {
                  id: authUser.uid,
                  email: authUser.email || "",
                  displayName: authUser.displayName || "",
                  photoURL: authUser.photoURL || "",
                  packageId: "basic",
                  packageExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                  lastActive: new Date().toISOString(),
                  preferences: { emailNotifications: true, inAppNotifications: true },
                }

                try {
                  await createUserData(authUser.uid, newUserData)
                  setUserData(newUserData)
                } catch (createError) {
                  console.error("Failed to create user data:", createError)
                }
              }
            } catch (fetchError) {
              console.error("Error fetching user data:", fetchError)
            } finally {
              userDataFetchInProgress.current = false
            }
          }
        } else {
          // User not logged in or has logged out
          setUser(null)
          setUserData(null)
          clearAuthTokens()
        }
      } catch (error) {
        console.error("Auth state change error:", error)
        setUser(null)
        setUserData(null)
        clearAuthTokens()
      } finally {
        setLoading(false)
      }
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
          description: "You have successfully logged in.",
        })

        // No need to redirect immediately - let onAuthStateChanged handle it
        // to ensure user data is fully loaded
      } else {
        toast({
          title: "Login failed",
          description: result.error,
          variant: "destructive",
        })
        throw new Error(result.error)
      }
    } catch (error: any) {
      console.error("Login error:", error)
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
          description: "You have successfully logged in with Google.",
        })

        // Successful Google login, onAuthStateChanged will handle redirection
      } else {
        toast({
          title: "Google login failed",
          description: result.error,
          variant: "destructive",
          duration: 8000,
        })
        throw new Error(result.error)
      }
    } catch (error: any) {
      console.error("Google login error:", error)
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
          description: "You have successfully logged in with GitHub.",
        })

        // Successful GitHub login, onAuthStateChanged will handle redirection
      } else {
        toast({
          title: "GitHub login failed",
          description: result.error,
          variant: "destructive",
          duration: 8000,
        })
        throw new Error(result.error)
      }
    } catch (error: any) {
      console.error("GitHub login error:", error)
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

        // Successful registration, onAuthStateChanged will handle redirection
      } else {
        toast({
          title: "Registration failed",
          description: result.error,
          variant: "destructive",
          duration: 6000,
        })
        throw new Error(result.error)
      }
    } catch (error: any) {
      console.error("Registration error:", error)
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

        // Clear user state before redirecting
        setUser(null)
        setUserData(null)

        toast({
          title: "Logged out",
          description: "You have successfully logged out.",
        })

        // Use router instead of window.location
        router.push("/login")
      } else {
        toast({
          title: "Logout failed",
          description: result.error,
          variant: "destructive",
        })
        throw new Error(result.error)
      }
    } catch (error: any) {
      console.error("Logout error:", error)
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
          description: "Could not update your profile. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating user data:", error)
      toast({
        title: "Update failed",
        description: "Could not update your profile. Please try again.",
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
      console.error("Profile update error:", error)
      throw error
    }
  }

  // Link with Google account
  const handleLinkWithGoogleAccount = async () => {
    if (!auth.currentUser) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to link accounts.",
        variant: "destructive",
      })
      throw new Error("User must be logged in to link accounts.")
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
      console.error("Error linking Google account:", error)
      throw error
    }
  }

  // Link with GitHub account
  const handleLinkWithGithubAccount = async () => {
    if (!auth.currentUser) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to link accounts.",
        variant: "destructive",
      })
      throw new Error("User must be logged in to link accounts.")
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
      console.error("Error linking GitHub account:", error)
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
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

