/**
 * User Data Service - Handles user data operations
 */
import { database } from "@/lib/firebase/firebase"
import { ref, update, get, set } from "firebase/database"
import type { UserData } from "@/types"

// Fetch user data from database
export const fetchUserData = async (userId: string): Promise<UserData | null> => {
  try {
    const userRef = ref(database, `users/${userId}`)
    const snapshot = await get(userRef)

    if (snapshot.exists()) {
      return snapshot.val() as UserData
    }
    return null
  } catch (error) {
    console.error("Error fetching user data:", error)
    return null
  }
}

// Create new user data
export const createUserData = async (userId: string, userData: UserData): Promise<boolean> => {
  try {
    const userRef = ref(database, `users/${userId}`)
    await set(userRef, userData)
    return true
  } catch (error) {
    console.error("Error creating user data:", error)
    return false
  }
}

// Update user data
export const updateUserData = async (userId: string, data: Partial<UserData>): Promise<boolean> => {
  try {
    const updates: Record<string, any> = {}
    Object.entries(data).forEach(([key, value]) => {
      updates[`users/${userId}/${key}`] = value
    })

    await update(ref(database), updates)
    return true
  } catch (error) {
    console.error("Update user data error:", error)
    return false
  }
}

// Update last active timestamp
export const updateLastActive = async (userId: string): Promise<void> => {
  try {
    const userRef = ref(database, `users/${userId}/lastActive`)
    await set(userRef, new Date().toISOString())
  } catch (error) {
    console.error("Error updating last active:", error)
  }
}

