import { NextResponse } from "next/server"
import Stripe from "stripe"
import { database } from "@/lib/firebase"
import { ref, update } from "firebase/database"

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia",
})

// This is your Stripe webhook secret for testing your endpoint locally
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(request: Request) {
  const payload = await request.text()
  const signature = request.headers.get("stripe-signature") || ""

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(payload, signature, endpointSecret || "")
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session

      // Extract metadata
      const userId = session.client_reference_id
      const packageId = session.metadata?.packageId
      const billingCycle = session.metadata?.billingCycle

      if (userId && packageId) {
        // Calculate expiry date based on billing cycle
        const expiryDate = new Date()
        if (billingCycle === "yearly") {
          expiryDate.setFullYear(expiryDate.getFullYear() + 1)
        } else {
          expiryDate.setMonth(expiryDate.getMonth() + 1)
        }

        // Update user package in database
        const userRef = ref(database, `users/${userId}`)
        await update(userRef, {
          packageId,
          packageExpiry: expiryDate.toISOString(),
          subscriptionId: session.subscription,
          billingCycle,
          lastPayment: new Date().toISOString(),
        })

        console.log(`User ${userId} upgraded to ${packageId} package`)
      }
      break
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription
      // Handle subscription updates
      break
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription
      // Handle subscription cancellations
      // You might want to downgrade the user to the basic plan
      break
    }

    default:
      console.log(`Unhandled event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}

