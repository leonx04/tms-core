import { NextResponse } from "next/server"
import Stripe from "stripe"

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia",
})

export async function POST(request: Request) {
  try {
    const { packageId, billingCycle, userId, email } = await request.json()

    // Validate required fields
    if (!packageId || !billingCycle || !userId || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Define prices based on package and billing cycle
    const prices = {
      basic: { monthly: 0, yearly: 0 },
      plus: { monthly: 999, yearly: 9590 },
      premium: { monthly: 1999, yearly: 19190 },
    }

    // Skip payment for free tier
    if (packageId === "basic") {
      return NextResponse.json({
        success: true,
        free: true,
      })
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
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile/upgrade?canceled=true`,
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

