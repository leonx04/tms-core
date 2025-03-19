import { getApp, getApps, initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getDatabase } from "firebase/database"

// Your Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
const database = getDatabase(app)
const auth = getAuth(app)

// Add a connection test function
export const testDatabaseConnection = async () => {
  try {
    // Import these inside the function to avoid issues with SSR
    const { ref, get, set } = await import("firebase/database")

    const testRef = ref(database, "connectionTest")
    await set(testRef, {
      timestamp: new Date().toISOString(),
      message: "Connection test",
    })

    const snapshot = await get(testRef)
    return {
      success: true,
      data: snapshot.val(),
    }
  } catch (error) {
    console.error("Firebase connection test failed:", error)
    return {
      success: false,
      error: (error as Error).message,
    }
  }
}

export { auth, database }

