/**
 * Social Authentication Service - Handles social login (Google, GitHub)
 */
import { auth, database } from "@/config/firebase"
import type { UserData } from "@/types"
import {
  fetchSignInMethodsForEmail,
  GithubAuthProvider,
  GoogleAuthProvider,
  linkWithPopup,
  signInWithPopup,
} from "firebase/auth"
import { get, ref, set, update } from "firebase/database"
import { updateAuthToken } from "./jwt-service"

// Handle social sign-in (common logic for both Google and GitHub)
export const handleSocialSignIn = async (provider: GoogleAuthProvider | GithubAuthProvider, providerName: string) => {
  try {
    const result = await signInWithPopup(auth, provider)
    await updateAuthToken(result.user)

    const userRef = ref(database, `users/${result.user.uid}`)
    const snapshot = await get(userRef)

    // Ensure we always have the latest photoURL
    const photoURL = result.user.photoURL || ""

    if (!snapshot.exists()) {
      const newUserData: UserData = {
        id: result.user.uid,
        email: result.user.email || "",
        displayName: result.user.displayName || "",
        photoURL: photoURL,
        packageId: "basic",
        packageExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        lastActive: new Date().toISOString(),
        preferences: { emailNotifications: true, inAppNotifications: true },
      }
      await set(userRef, newUserData)
    } else {
      // Update photoURL and lastActive
      const updates = {
        lastActive: new Date().toISOString(),
        photoURL: photoURL,
      }
      await update(ref(database, `users/${result.user.uid}`), updates)
    }

    return { success: true, user: result.user }
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

      return {
        success: false,
        error: `An account already exists with the email ${email}. Please sign in using ${availableProviders} and then link your ${providerName} account from your profile settings.`,
        code: error.code,
        email,
      }
    } else {
      return {
        success: false,
        error: error.message || `Failed to sign in with ${providerName}`,
        code: error.code,
      }
    }
  }
}

// Sign in with Google
export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider()
  return handleSocialSignIn(provider, "Google")
}

// Sign in with GitHub
export const signInWithGithub = async () => {
  const provider = new GithubAuthProvider()
  return handleSocialSignIn(provider, "GitHub")
}

// Link with Google account
export const linkWithGoogleAccount = async (user: any) => {
  if (!user) {
    return {
      success: false,
      error: "You must be logged in to link an account.",
      code: "auth/user-not-found",
    }
  }

  const provider = new GoogleAuthProvider()
  try {
    const result = await linkWithPopup(user, provider)
    await updateAuthToken(result.user)

    return { success: true }
  } catch (error: any) {
    console.error("Link Google account error:", error)

    if (error.code === "auth/credential-already-in-use") {
      return {
        success: false,
        error: "This Google account is already linked to another user.",
        code: error.code,
      }
    } else {
      return {
        success: false,
        error: "Failed to link your Google account. Please try again.",
        code: error.code,
      }
    }
  }
}

// Link with GitHub account
export const linkWithGithubAccount = async (user: any) => {
  if (!user) {
    return {
      success: false,
      error: "You must be logged in to link an account.",
      code: "auth/user-not-found",
    }
  }

  const provider = new GithubAuthProvider()
  try {
    const result = await linkWithPopup(user, provider)
    await updateAuthToken(result.user)

    return { success: true }
  } catch (error: any) {
    console.error("Link GitHub account error:", error)

    if (error.code === "auth/credential-already-in-use") {
      return {
        success: false,
        error: "This GitHub account is already linked to another user.",
        code: error.code,
      }
    } else {
      return {
        success: false,
        error: "Failed to link your GitHub account. Please try again.",
        code: error.code,
      }
    }
  }
}

