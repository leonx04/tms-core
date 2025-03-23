"use client"

import type React from "react"

/**
 * Auth Hooks - Custom hooks for common authentication operations
 */
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { useState, useCallback } from "react"

// Hook for login form
export const useLogin = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const { signIn, signInWithGoogle, signInWithGithub } = useAuth() // Get social sign-in methods here
  const { toast } = useToast()
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await signIn(email, password)
      // Success toast is handled in the auth context
    } catch (error: any) {
      // Error toast is handled in the auth context
      console.error("Login error:", error)
    } finally {
      setLoading(false)
    }
  }

  // Move social login logic outside of handleSocialLogin
  const handleGoogleLogin = useCallback(async () => {
    setLoading(true)
    try {
      await signInWithGoogle()
    } catch (error: any) {
      console.error("Google login error:", error)
    } finally {
      setLoading(false)
    }
  }, [signInWithGoogle])

  const handleGithubLogin = useCallback(async () => {
    setLoading(true)
    try {
      await signInWithGithub()
    } catch (error: any) {
      console.error("Github login error:", error)
    } finally {
      setLoading(false)
    }
  }, [signInWithGithub])

  return {
    email,
    setEmail,
    password,
    setPassword,
    loading,
    handleLogin,
    handleGoogleLogin,
    handleGithubLogin,
  }
}

// Hook for registration form
export const useRegister = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()
  const { toast } = useToast()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      await signUp(email, password, displayName)
      // Success toast is handled in the auth context
    } catch (error: any) {
      // Error toast is handled in the auth context
      console.error("Registration error:", error)
    } finally {
      setLoading(false)
    }
  }

  return {
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    displayName,
    setDisplayName,
    loading,
    handleRegister,
  }
}

// Hook for profile updates
export const useProfileUpdate = () => {
  const { userData, updateUserProfile } = useAuth()
  const [displayName, setDisplayName] = useState(userData?.displayName || "")
  const [email, setEmail] = useState(userData?.email || "")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword && newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your new passwords match.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const updateData: {
        displayName?: string
        email?: string
        password?: string
        currentPassword?: string
      } = {}

      if (displayName !== userData?.displayName) {
        updateData.displayName = displayName
      }

      if (email !== userData?.email) {
        updateData.email = email
      }

      if (newPassword) {
        updateData.password = newPassword
      }

      if ((email !== userData?.email || newPassword) && currentPassword) {
        updateData.currentPassword = currentPassword
      }

      if (Object.keys(updateData).length > 0) {
        await updateUserProfile(updateData)
        // Reset password fields
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      } else {
        toast({
          title: "No changes",
          description: "No changes were made to your profile.",
        })
      }
    } catch (error: any) {
      // Error toast is handled in the auth context
      console.error("Profile update error:", error)
    } finally {
      setLoading(false)
    }
  }

  return {
    displayName,
    setDisplayName,
    email,
    setEmail,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    loading,
    handleProfileUpdate,
  }
}

