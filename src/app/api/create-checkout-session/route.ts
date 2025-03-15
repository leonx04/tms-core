import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { auth } from "@/lib/firebase-admin"
import { database } from "@/lib/firebase"
import { ref, get } from "firebase/database"

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
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const { packageId, billingCycle, userId, email } = await request.json()

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

    if (userSnapshot.exists()) {
      const userData = userSnapshot.val()

      // If user has a Stripe subscription ID, retrieve it to handle upgrades/downgrades
      if (userData.subscriptionId) {
        try {
          const subscription = await stripe.subscriptions.retrieve(userData.subscriptionId)

          // Cancel at period end instead of immediately
          await stripe.subscriptions.update(userData.subscriptionId, {
            cancel_at_period_end: true,
          })
        } catch (error) {
          console.log("No active subscription found or error retrieving:", error)
          // Continue with new subscription creation
        }
      }
    }

    // Create a checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `TMS ${packageId.charAt(0).toUpperCase() + packageId.slice(1)} Plan (${
                billingCycle === "monthly" ? "Monthly" : "Yearly"
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
      customer_email: email,
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

