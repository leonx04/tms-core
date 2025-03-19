"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import {
  type User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  linkWithPopup,
  fetchSignInMethodsForEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateEmail,
  updatePassword,
} from "firebase/auth"
import { auth, database } from "@/lib/firebase"
import { ref, get, set, update } from "firebase/database"
import { secureRoutes } from "@/lib/secure-routes"
import type { UserData } from "@/types"
import { useToast } from "@/hooks/use-toast"

type AuthContextType = {
  user: User | null
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // Function to update token in localStorage and cookie
  const updateAuthToken = async (user: User) => {
    try {
      const token = await user.getIdToken(true) // Force refresh
      localStorage.setItem("jwt", token)

      // Set token expiry (30 minutes)
      const expiryTime = Date.now() + 30 * 60 * 1000
      localStorage.setItem("jwt_expiry", expiryTime.toString())

      // Also set token in cookie for middleware
      document.cookie = `jwt=${token}; path=/; max-age=${30 * 60}; SameSite=Strict; Secure`

      return token
    } catch (error) {
      console.error("Error getting token:", error)
      return null
    }
  }

  // Function to clear auth tokens
  const clearAuthTokens = () => {
    localStorage.removeItem("jwt")
    localStorage.removeItem("jwt_expiry")
    document.cookie = "jwt=; path=/; max-age=0; SameSite=Strict; Secure"
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)

      if (user) {
        // Update auth token
        await updateAuthToken(user)

        // Fetch user data from database
        const userRef = ref(database, `users/${user.uid}`)
        const snapshot = await get(userRef)

        if (snapshot.exists()) {
          setUserData(snapshot.val() as UserData)
          await update(userRef, { lastActive: new Date().toISOString() })
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
          await set(userRef, newUserData)
          setUserData(newUserData)
        }
      } else {
        setUserData(null)
        clearAuthTokens()
      }

      setLoading(false)
    })

    // Check token expiry periodically
    const checkTokenExpiry = () => {
      const expiryTime = localStorage.getItem("jwt_expiry")
      if (expiryTime && Date.now() > Number.parseInt(expiryTime)) {
        clearAuthTokens()
        if (auth.currentUser) {
          firebaseSignOut(auth)
        }
      }
    }

    checkTokenExpiry()
    const interval = setInterval(checkTokenExpiry, 60000) // Check every minute

    return () => {
      unsubscribe()
      clearInterval(interval)
    }
  }, [])

  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      await updateAuthToken(userCredential.user)

      if (auth.currentUser) {
        const userRef = ref(database, `users/${auth.currentUser.uid}/lastActive`)
        await set(userRef, new Date().toISOString())
      }

      toast({
        title: "Welcome back!",
        description: "You've successfully signed in.",
      })

      // Check for redirect URL from sessionStorage
      const redirectUrl = sessionStorage.getItem("redirectAfterAuth")
      if (redirectUrl) {
        // Redirect will be handled by AuthSessionManager
      }

      return
    } catch (error: any) {
      console.error("Sign in error:", error)
      let errorMessage = "Failed to sign in. Please check your credentials."

      if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password"
      ) {
        errorMessage = "Invalid email or password. Please try again."
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "Too many failed login attempts. Please try again later or reset your password."
      }

      toast({
        title: "Sign in failed",
        description: errorMessage,
        variant: "destructive",
      })
      throw error
    }
  }

  const handleSocialSignIn = async (provider: GoogleAuthProvider | GithubAuthProvider, providerName: string) => {
    try {
      const result = await signInWithPopup(auth, provider)
      await updateAuthToken(result.user)

      const userRef = ref(database, `users/${result.user.uid}`)
      const snapshot = await get(userRef)

      if (!snapshot.exists()) {
        const newUserData: UserData = {
          id: result.user.uid,
          email: result.user.email || "",
          displayName: result.user.displayName || "",
          photoURL: result.user.photoURL || "",
          packageId: "basic",
          packageExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          lastActive: new Date().toISOString(),
          preferences: { emailNotifications: true, inAppNotifications: true },
        }
        await set(userRef, newUserData)
      } else {
        await set(ref(database, `users/${result.user.uid}/lastActive`), new Date().toISOString())
      }

      toast({
        title: "Welcome!",
        description: `You've successfully signed in with ${providerName}.`,
      })

      return result.user
    } catch (error: any) {
      console.error(`${providerName} sign-in error:`, error)

      if (error.code === "auth/account-exists-with-different-credential") {
        const email = error.customData?.email

        // Check which providers are available for this email
        const methods = await fetchSignInMethodsForEmail(auth, email)

        let availableProviders = methods.join(", ")
        if (methods.includes("password")) {
          availableProviders = availableProviders.replace("password", "email/password")
        }

        toast({
          title: "Sign in method conflict",
          description: `An account already exists with the email ${email}. Please sign in using ${availableProviders} and then link your ${providerName} account from your profile settings.`,
          variant: "destructive",
          duration: 8000,
        })
      } else {
        toast({
          title: `${providerName} sign in failed`,
          description: error.message || `Failed to sign in with ${providerName}`,
          variant: "destructive",
        })
      }

      throw error
    }
  }

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider()
    await handleSocialSignIn(provider, "Google")
  }

  const signInWithGithub = async () => {
    const provider = new GithubAuthProvider()
    await handleSocialSignIn(provider, "GitHub")
  }

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      // Check if email already exists with different providers
      const methods = await fetchSignInMethodsForEmail(auth, email)

      if (methods.length > 0) {
        let availableProviders = methods.join(", ")
        if (methods.includes("password")) {
          availableProviders = availableProviders.replace("password", "email/password")
        }

        toast({
          title: "Email already in use",
          description: `This email is already registered. Please sign in using ${availableProviders}.`,
          variant: "destructive",
          duration: 6000,
        })
        throw new Error("Email already in use")
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(userCredential.user, { displayName })
      await updateAuthToken(userCredential.user)

      const newUserData: UserData = {
        id: userCredential.user.uid,
        email: email,
        displayName: displayName,
        packageId: "basic",
        packageExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        lastActive: new Date().toISOString(),
        preferences: { emailNotifications: true, inAppNotifications: true },
      }

      const userRef = ref(database, `users/${userCredential.user.uid}`)
      await set(userRef, newUserData)

      toast({
        title: "Account created",
        description: "Your account has been successfully created.",
      })
    } catch (error: any) {
      console.error("Sign up error:", error)

      if (error.code === "auth/email-already-in-use") {
        toast({
          title: "Email already in use",
          description: "This email is already registered. Please sign in or use a different email.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Sign up failed",
          description: error.message || "Failed to create account. Please try again.",
          variant: "destructive",
        })
      }

      throw error
    }
  }

  const signOut = async () => {
    try {
      clearAuthTokens()
      await firebaseSignOut(auth)
      toast({
        title: "Signed out",
        description: "You've been successfully signed out.",
      })
    } catch (error) {
      console.error("Sign out error:", error)
      toast({
        title: "Sign out failed",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      })
    }
  }

  const updateUserData = async (data: Partial<UserData>) => {
    if (!user) {
      toast({
        title: "Update failed",
        description: "You must be logged in to update your profile.",
        variant: "destructive",
      })
      return
    }

    try {
      const updates: Record<string, any> = {}
      Object.entries(data).forEach(([key, value]) => {
        updates[`users/${user.uid}/${key}`] = value
      })

      for (const [path, value] of Object.entries(updates)) {
        await set(ref(database, path), value)
      }

      setUserData((prev) => (prev ? { ...prev, ...data } : null))

      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      })
    } catch (error) {
      console.error("Update user data error:", error)
      toast({
        title: "Update failed",
        description: "Failed to update your profile. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Improved profile update function that preserves social links
  const updateUserProfile = async (data: {
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

      // Store the current provider data to preserve social links
      const currentProviders = user.providerData.map((provider) => ({
        providerId: provider.providerId,
        uid: provider.uid,
        email: provider.email,
        displayName: provider.displayName,
        photoURL: provider.photoURL,
      }))

      // If email or password change is requested, we need to reauthenticate
      if ((data.email && data.email !== user.email) || data.password) {
        if (!data.currentPassword) {
          toast({
            title: "Authentication required",
            description: "Current password is required to update email or password.",
            variant: "destructive",
          })
          throw new Error("Current password required")
        }

        try {
          // Reauthenticate user
          const credential = EmailAuthProvider.credential(user.email, data.currentPassword)
          await reauthenticateWithCredential(user, credential)
        } catch (error: any) {
          console.error("Reauthentication error:", error)

          if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password") {
            toast({
              title: "Authentication failed",
              description: "The current password you entered is incorrect. Please try again.",
              variant: "destructive",
            })
            throw new Error("Current password is incorrect")
          } else {
            toast({
              title: "Authentication failed",
              description: "Failed to verify your identity. Please try again or sign out and sign back in.",
              variant: "destructive",
            })
            throw error
          }
        }

        // Update email if requested
        if (data.email && data.email !== user.email) {
          // Check if email is already in use with different providers
          const methods = await fetchSignInMethodsForEmail(auth, data.email)

          if (methods.length > 0) {
            toast({
              title: "Email already in use",
              description: "This email is already registered with another account.",
              variant: "destructive",
            })
            throw new Error("Email already in use")
          }

          await updateEmail(user, data.email)
          updates.email = data.email
        }

        // Update password if requested
        if (data.password) {
          await updatePassword(user, data.password)

          // Refresh token after password change
          await updateAuthToken(user)

          toast({
            title: "Password updated",
            description: "Your password has been successfully updated.",
          })
        }
      }

      // Update display name if requested
      if (data.displayName && data.displayName !== user.displayName) {
        await updateProfile(user, { displayName: data.displayName })
        updates.displayName = data.displayName
      }

      // Update user data in database if there are changes
      if (Object.keys(updates).length > 0) {
        await updateUserData(updates)
      }

      // Refresh token to ensure it's up to date
      await updateAuthToken(user)
    } catch (error: any) {
      console.error("Update profile error:", error)

      if (error.code === "auth/wrong-password") {
        toast({
          title: "Authentication failed",
          description: "Current password is incorrect.",
          variant: "destructive",
        })
      } else if (error.code === "auth/requires-recent-login") {
        toast({
          title: "Authentication required",
          description: "Please sign in again before updating your email or password.",
          variant: "destructive",
        })
        await signOut()
      } else {
        toast({
          title: "Update failed",
          description: error.message || "Failed to update your profile. Please try again.",
          variant: "destructive",
        })
      }

      throw error
    }
  }

  // Linking functions for an existing account
  const linkWithGoogleAccount = async () => {
    if (!auth.currentUser) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to link an account.",
        variant: "destructive",
      })
      throw new Error("User must be logged in to link an account.")
    }

    const provider = new GoogleAuthProvider()
    try {
      const result = await linkWithPopup(auth.currentUser, provider)
      await updateAuthToken(result.user)

      toast({
        title: "Account linked",
        description: "Your Google account has been successfully linked.",
      })
    } catch (error: any) {
      console.error("Link Google account error:", error)

      if (error.code === "auth/credential-already-in-use") {
        toast({
          title: "Account already exists",
          description: "This Google account is already linked to another user.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Linking failed",
          description: "Failed to link your Google account. Please try again.",
          variant: "destructive",
        })
      }

      throw new Error("Error linking Google account: " + error.message)
    }
  }

  const linkWithGithubAccount = async () => {
    if (!auth.currentUser) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to link an account.",
        variant: "destructive",
      })
      throw new Error("User must be logged in to link an account.")
    }

    const provider = new GithubAuthProvider()
    try {
      const result = await linkWithPopup(auth.currentUser, provider)
      await updateAuthToken(result.user)

      toast({
        title: "Account linked",
        description: "Your GitHub account has been successfully linked.",
      })
    } catch (error: any) {
      console.error("Link GitHub account error:", error)

      if (error.code === "auth/credential-already-in-use") {
        toast({
          title: "Account already exists",
          description: "This GitHub account is already linked to another user.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Linking failed",
          description: "Failed to link your GitHub account. Please try again.",
          variant: "destructive",
        })
      }

      throw new Error("Error linking GitHub account: " + error.message)
    }
  }

  const encryptRoute = (route: string): string => secureRoutes.encryptRoute(route)
  const decryptRoute = (encryptedRoute: string): string => secureRoutes.decryptRoute(encryptedRoute)
  const obscureUserId = (userId: string, visibleChars = 4): string => secureRoutes.obscureUserId(userId, visibleChars)

  return (
    <AuthContext.Provider
      value={{
        user,
        userData,
        loading,
        signIn,
        signInWithGoogle,
        signInWithGithub,
        signUp,
        signOut,
        updateUserData,
        updateUserProfile,
        linkWithGoogleAccount,
        linkWithGithubAccount,
        encryptRoute,
        decryptRoute,
        obscureUserId,
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

