import { database } from "@/lib/firebase/firebase"
import { auth } from "@/lib/firebase/firebase-admin"
import { get, ref } from "firebase/database"
import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
    apiVersion: "2025-02-24.acacia",
})

export async function POST(request: NextRequest) {
    try {
        // Verify authentication
        const authHeader = request.headers.get("authorization")
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const token = authHeader.split("Bearer ")[1]
        let decodedToken

        try {
            decodedToken = await auth.verifyIdToken(token)
        } catch (error) {
            console.error("Token verification error:", error)
            return NextResponse.json({ error: "Invalid token" }, { status: 401 })
        }

        // Parse request body
        let body
        try {
            body = await request.json()
        } catch (error) {
            console.error("JSON parsing error:", error)
            return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
        }

        const { action, userId } = body

        // Validate required fields
        if (!action || !userId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        // Verify user ID matches authenticated user
        if (userId !== decodedToken.uid) {
            return NextResponse.json({ error: "User ID mismatch" }, { status: 403 })
        }

        // Get user data
        const userRef = ref(database, `users/${userId}`)
        const userSnapshot = await get(userRef)

        if (!userSnapshot.exists()) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        const userData = userSnapshot.val()
        const { subscriptionId } = userData

        if (!subscriptionId) {
            return NextResponse.json({ error: "No active subscription found" }, { status: 400 })
        }

        // Handle different subscription management actions
        switch (action) {
            case "cancel": {
                // Cancel subscription at period end
                await stripe.subscriptions.update(subscriptionId, {
                    cancel_at_period_end: true,
                })
                return NextResponse.json({
                    success: true,
                    message: "Subscription will be canceled at the end of the billing period",
                })
            }

            case "reactivate": {
                // Reactivate a subscription that was set to cancel
                await stripe.subscriptions.update(subscriptionId, {
                    cancel_at_period_end: false,
                })
                return NextResponse.json({ success: true, message: "Subscription reactivated successfully" })
            }

            case "portal": {
                // Create a billing portal session for the customer
                if (!userData.stripeCustomerId) {
                    return NextResponse.json({ error: "No customer ID found" }, { status: 400 })
                }

                const portalSession = await stripe.billingPortal.sessions.create({
                    customer: userData.stripeCustomerId,
                    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile`,
                })

                return NextResponse.json({ url: portalSession.url })
            }

            default:
                return NextResponse.json({ error: "Invalid action" }, { status: 400 })
        }
    } catch (error: any) {
        console.error("Error managing subscription:", error)
        return NextResponse.json(
            { error: error.message || "An error occurred while managing the subscription" },
            { status: 500 },
        )
    }
}

