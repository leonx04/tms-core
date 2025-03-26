import { database } from "@/config/firebase"
import { auth } from "@/config/firebase-admin"
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
      if (!auth) {
        return NextResponse.json({ error: "Authentication service unavailable" }, { status: 500 })
      }
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

    const { packageId, billingCycle, userId, email } = body

    // Validate required fields
    if (!packageId || !billingCycle || !userId || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Verify user ID matches authenticated user
    if (userId !== decodedToken.uid) {
      return NextResponse.json({ error: "User ID mismatch" }, { status: 403 })
    }

    // Fetch subscription plans from database
    const plansRef = ref(database, "subscriptionPlans")
    const plansSnapshot = await get(plansRef)

    let prices

    if (plansSnapshot.exists()) {
      const plansData = plansSnapshot.val()
      prices = {
        basic: {
          monthly: 0,
          yearly: 0,
        },
        plus: {
          monthly: Math.round(plansData.plus.monthlyPrice * 100),
          yearly: Math.round(plansData.plus.yearlyPrice * 100),
        },
        premium: {
          monthly: Math.round(plansData.premium.monthlyPrice * 100),
          yearly: Math.round(plansData.premium.yearlyPrice * 100),
        },
      }
    } else {
      // Fallback to default prices
      prices = {
        basic: { monthly: 0, yearly: 0 },
        plus: { monthly: 999, yearly: 9590 },
        premium: { monthly: 1999, yearly: 19190 },
      }
    }

    // Skip payment for free tier
    if (packageId === "basic") {
      return NextResponse.json({
        success: true,
        free: true,
      })
    }

    // Check if user already has an active subscription
    const userRef = ref(database, `users/${userId}`)
    const userSnapshot = await get(userRef)
    let customerId: string | undefined

    if (userSnapshot.exists()) {
      const userData = userSnapshot.val()
      customerId = userData.stripeCustomerId

      // If user has a Stripe subscription ID, retrieve it to handle upgrades/downgrades
      if (userData.subscriptionId) {
        try {
          const subscription = await stripe.subscriptions.retrieve(userData.subscriptionId)

          // Cancel at period end instead of immediately
          await stripe.subscriptions.update(userData.subscriptionId, {
            cancel_at_period_end: true,
          })
        } catch (error: any) {
          console.log("No active subscription found or error retrieving:", error)
          // Continue with new subscription creation
        }
      }
    }

    // Create or retrieve Stripe customer
    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: {
          userId,
        },
      })
      customerId = customer.id
    }

    // Create a checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `TMC ${packageId.charAt(0).toUpperCase() + packageId.slice(1)} Plan (${billingCycle === "monthly" ? "Monthly" : "Yearly"
                })`,
              description: `Subscription to the ${packageId} plan`,
            },
            unit_amount: prices[packageId as keyof typeof prices][billingCycle as keyof typeof prices.plus],
            recurring: {
              interval: billingCycle === "monthly" ? "month" : "year",
            },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/upgrade?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/upgrade?canceled=true`,
      customer: customerId,
      customer_email: customerId ? undefined : email,
      client_reference_id: userId,
      metadata: {
        userId,
        packageId,
        billingCycle,
      },
    })

    return NextResponse.json({ sessionId: session.id })
  } catch (error: any) {
    console.error("Error creating checkout session:", error)
    return NextResponse.json(
      { error: error.message || "An error occurred while creating the checkout session" },
      { status: 500 },
    )
  }
}
