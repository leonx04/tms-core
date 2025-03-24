import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getDatabase } from "firebase-admin/database"

// Initialize Firebase Admin only on the server side
function initializeFirebaseAdmin() {
  // Check if we're on the server side
  if (typeof window === "undefined") {
    const firebaseAdminConfig = {
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    }

    // Initialize the app if it hasn't been initialized already
    const apps = getApps()
    if (!apps.length) {
      return initializeApp(firebaseAdminConfig)
    } else {
      return apps[0]
    }
  }
  return null
}

// Initialize the app
const app = initializeFirebaseAdmin()

// Export the auth and database instances
export const auth = app ? getAuth(app) : null
export const adminDb = app ? getDatabase(app) : null

