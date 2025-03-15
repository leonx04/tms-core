import { emailTemplates, sendEmail } from "@/lib/email"
import { auth, database } from "@/lib/firebase"
import { sendPasswordResetEmail } from "firebase/auth"
import { get, ref } from "firebase/database"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Check if the user exists
    const usersRef = ref(database, "users")
    const usersSnapshot = await get(usersRef)

    if (!usersSnapshot.exists()) {
      // Don't reveal if the user exists or not for security reasons
      return NextResponse.json({ success: true })
    }

    const users = usersSnapshot.val()
    let userName = ""
    let userExists = false

    // Find the user by email
    Object.values(users).forEach((user: any) => {
      if (user.email === email) {
        userName = user.displayName || ""
        userExists = true
      }
    })

    if (!userExists) {
      // Don't reveal if the user exists or not for security reasons
      return NextResponse.json({ success: true })
    }

    // Send password reset email through Firebase
    await sendPasswordResetEmail(auth, email)

    // Also send a custom email with our template
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`

    await sendEmail(email, "Reset Your Password - TMC", emailTemplates.resetPassword(resetLink, userName))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error sending password reset email:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

