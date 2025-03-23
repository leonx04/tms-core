/**
 * Email Authentication Service - Handles email/password authentication
 */
import { auth, database } from "@/config/firebase"
import type { UserData } from "@/types"
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  fetchSignInMethodsForEmail,
  signOut as firebaseSignOut,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  updateEmail,
  updatePassword,
  updateProfile,
} from "firebase/auth"
import { ref, set } from "firebase/database"
import { clearAuthTokens, updateAuthToken } from "./jwt-service"

// Sign in with email and password
export const signInWithEmail = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    await updateAuthToken(userCredential.user)

    // Update lastActive in the background
    if (auth.currentUser) {
      const userRef = ref(database, `users/${auth.currentUser.uid}/lastActive`)
      set(userRef, new Date().toISOString()).catch(console.error)
    }

    return { success: true, user: userCredential.user }
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

    return { success: false, error: errorMessage, code: error.code }
  }
}

// Sign up with email and password
export const signUpWithEmail = async (email: string, password: string, displayName: string) => {
  try {
    // Check if email already exists with different providers
    const methods = await fetchSignInMethodsForEmail(auth, email)

    if (methods.length > 0) {
      let availableProviders = methods.join(", ")
      if (methods.includes("password")) {
        availableProviders = availableProviders.replace("password", "email/password")
      }

      return {
        success: false,
        error: `This email is already registered. Please sign in using ${availableProviders}.`,
        code: "auth/email-already-in-use",
      }
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

    return { success: true, user: userCredential.user }
  } catch (error: any) {
    console.error("Sign up error:", error)

    if (error.code === "auth/email-already-in-use") {
      return {
        success: false,
        error: "This email is already registered. Please sign in or use a different email.",
        code: error.code,
      }
    }

    return {
      success: false,
      error: error.message || "Failed to create account. Please try again.",
      code: error.code,
    }
  }
}

// Sign out
export const signOut = async () => {
  try {
    clearAuthTokens()
    await firebaseSignOut(auth)
    return { success: true }
  } catch (error: any) {
    console.error("Sign out error:", error)
    return {
      success: false,
      error: "Failed to sign out. Please try again.",
      code: error.code,
    }
  }
}

// Update user profile (email, password, displayName)
export const updateUserProfile = async (
  user: any,
  data: {
    displayName?: string
    email?: string
    password?: string
    currentPassword?: string
  },
) => {
  if (!user || !user.email) {
    return {
      success: false,
      error: "You must be logged in to update your profile.",
      code: "auth/user-not-found",
    }
  }

  try {
    // If email or password change is requested, we need to reauthenticate
    if ((data.email && data.email !== user.email) || data.password) {
      if (!data.currentPassword) {
        return {
          success: false,
          error: "Current password is required to update email or password.",
          code: "auth/requires-recent-login",
        }
      }

      try {
        // Reauthenticate user
        const credential = EmailAuthProvider.credential(user.email, data.currentPassword)
        await reauthenticateWithCredential(user, credential)
      } catch (error: any) {
        console.error("Reauthentication error:", error)

        if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password") {
          return {
            success: false,
            error: "The current password you entered is incorrect. Please try again.",
            code: error.code,
          }
        } else {
          return {
            success: false,
            error: "Failed to verify your identity. Please try again or sign out and sign back in.",
            code: error.code,
          }
        }
      }

      // Update email if requested
      if (data.email && data.email !== user.email) {
        // Check if email is already in use with different providers
        const methods = await fetchSignInMethodsForEmail(auth, data.email)

        if (methods.length > 0) {
          return {
            success: false,
            error: "This email is already registered with another account.",
            code: "auth/email-already-in-use",
          }
        }

        await updateEmail(user, data.email)
      }

      // Update password if requested
      if (data.password) {
        await updatePassword(user, data.password)
        // Refresh token after password change
        await updateAuthToken(user)
      }
    }

    // Update display name if requested
    if (data.displayName && data.displayName !== user.displayName) {
      await updateProfile(user, { displayName: data.displayName })
    }

    // Refresh token to ensure it's up to date
    await updateAuthToken(user)

    return { success: true }
  } catch (error: any) {
    console.error("Update profile error:", error)

    if (error.code === "auth/wrong-password") {
      return {
        success: false,
        error: "Current password is incorrect.",
        code: error.code,
      }
    } else if (error.code === "auth/requires-recent-login") {
      return {
        success: false,
        error: "Please sign in again before updating your email or password.",
        code: error.code,
      }
    } else {
      return {
        success: false,
        error: error.message || "Failed to update your profile. Please try again.",
        code: error.code,
      }
    }
  }
}

