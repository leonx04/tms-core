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
} from "firebase/auth"
import { auth, database } from "@/lib/firebase"
import { ref, get, set } from "firebase/database"

type UserData = {
  id: string
  email: string
  displayName: string
  photoURL?: string
  packageId: string
  packageExpiry: string
  lastActive: string
  preferences: {
    darkMode: boolean
    emailNotifications: boolean
    inAppNotifications: boolean
  }
}

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)

      if (user) {
        // Fetch user data from database
        const userRef = ref(database, `users/${user.uid}`)
        const snapshot = await get(userRef)

        if (snapshot.exists()) {
          setUserData(snapshot.val() as UserData)
        } else {
          // Create new user data with basic package
          const newUserData: UserData = {
            id: user.uid,
            email: user.email || "",
            displayName: user.displayName || "",
            photoURL: user.photoURL || "",
            packageId: "basic", // Default package
            packageExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
            lastActive: new Date().toISOString(),
            preferences: {
              darkMode: false,
              emailNotifications: true,
              inAppNotifications: true,
            },
          }

          await set(userRef, newUserData)
          setUserData(newUserData)
        }
      } else {
        setUserData(null)
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
    // Update last active
    if (auth.currentUser) {
      const userRef = ref(database, `users/${auth.currentUser.uid}/lastActive`)
      await set(userRef, new Date().toISOString())
    }
  }

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider()
    const result = await signInWithPopup(auth, provider)

    // Check if this is a new user
    const userRef = ref(database, `users/${result.user.uid}`)
    const snapshot = await get(userRef)

    if (!snapshot.exists()) {
      // Create new user data with basic package
      const newUserData: UserData = {
        id: result.user.uid,
        email: result.user.email || "",
        displayName: result.user.displayName || "",
        photoURL: result.user.photoURL || "",
        packageId: "basic", // Default package
        packageExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
        lastActive: new Date().toISOString(),
        preferences: {
          darkMode: false,
          emailNotifications: true,
          inAppNotifications: true,
        },
      }

      await set(userRef, newUserData)
    } else {
      // Update last active
      const userRef = ref(database, `users/${result.user.uid}/lastActive`)
      await set(userRef, new Date().toISOString())
    }
  }

  const signInWithGithub = async () => {
    const provider = new GithubAuthProvider()
    const result = await signInWithPopup(auth, provider)

    // Check if this is a new user
    const userRef = ref(database, `users/${result.user.uid}`)
    const snapshot = await get(userRef)

    if (!snapshot.exists()) {
      // Create new user data with basic package
      const newUserData: UserData = {
        id: result.user.uid,
        email: result.user.email || "",
        displayName: result.user.displayName || "",
        photoURL: result.user.photoURL || "",
        packageId: "basic", // Default package
        packageExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
        lastActive: new Date().toISOString(),
        preferences: {
          darkMode: false,
          emailNotifications: true,
          inAppNotifications: true,
        },
      }

      await set(userRef, newUserData)
    } else {
      // Update last active
      const userRef = ref(database, `users/${result.user.uid}/lastActive`)
      await set(userRef, new Date().toISOString())
    }
  }

  const signUp = async (email: string, password: string, displayName: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(userCredential.user, { displayName })

    // Create user data with basic package
    const newUserData: UserData = {
      id: userCredential.user.uid,
      email: email,
      displayName: displayName,
      packageId: "basic", // Default package
      packageExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
      lastActive: new Date().toISOString(),
      preferences: {
        darkMode: false,
        emailNotifications: true,
        inAppNotifications: true,
      },
    }

    const userRef = ref(database, `users/${userCredential.user.uid}`)
    await set(userRef, newUserData)
  }

  const signOut = async () => {
    await firebaseSignOut(auth)
  }

  const updateUserData = async (data: Partial<UserData>) => {
    if (!user) return

    const updates: Record<string, any> = {}
    Object.entries(data).forEach(([key, value]) => {
      updates[`users/${user.uid}/${key}`] = value
    })

    // Update in Firebase
    Object.entries(updates).forEach(async ([path, value]) => {
      await set(ref(database, path), value)
    })

    // Update local state
    setUserData((prev) => (prev ? { ...prev, ...data } : null))
  }

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

