import { database } from "@/config/firebase"
import { get, ref, set, update } from "firebase/database"
import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia",
})

// This is your Stripe webhook secret for testing your endpoint locally
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(request: NextRequest) {
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
          stripeCustomerId: session.customer,
          billingCycle, // Save billing cycle
          subscriptionStatus: "active",
          lastPayment: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
        })

        // Add to payment history
        const paymentHistoryRef = ref(database, `paymentHistory/${userId}/${Date.now()}`)
        await set(paymentHistoryRef, {
          packageId,
          billingCycle,
          amount: session.amount_total,
          currency: session.currency,
          status: session.payment_status,
          timestamp: new Date().toISOString(),
          sessionId: session.id,
          subscriptionId: session.subscription,
        })

        // Add notification for user
        const notificationRef = ref(database, `notifications/${userId}/${Date.now()}`)
        await set(notificationRef, {
          userId,
          eventType: "SUBSCRIPTION_CREATED",
          referenceId: session.subscription,
          message: `Your subscription to the ${packageId.charAt(0).toUpperCase() + packageId.slice(1)} plan has been activated.`,
          status: "unread",
          createdAt: new Date().toISOString(),
        })

        console.log(`User ${userId} upgraded to ${packageId} package with ${billingCycle} billing`)
      }
      break
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice
      const subscriptionId = invoice.subscription as string

      if (subscriptionId) {
        // Find user with this subscription ID
        const usersRef = ref(database, "users")
        const usersSnapshot = await get(usersRef)

        if (usersSnapshot.exists()) {
          const users = usersSnapshot.val()
          let userId = null

          // Find user with matching subscription ID
          Object.keys(users).forEach((key) => {
            if (users[key].subscriptionId === subscriptionId) {
              userId = key
            }
          })

          if (userId) {
            // Update expiry date based on billing cycle
            const userRef = ref(database, `users/${userId}`)
            const userSnapshot = await get(userRef)

            if (userSnapshot.exists()) {
              const userData = userSnapshot.val()
              const expiryDate = new Date()

              if (userData.billingCycle === "yearly") {
                expiryDate.setFullYear(expiryDate.getFullYear() + 1)
              } else {
                expiryDate.setMonth(expiryDate.getMonth() + 1)
              }

              await update(userRef, {
                packageExpiry: expiryDate.toISOString(),
                lastPayment: new Date().toISOString(),
                subscriptionStatus: "active",
                lastUpdated: new Date().toISOString(),
              })

              // Add to payment history
              const paymentHistoryRef = ref(database, `paymentHistory/${userId}/${Date.now()}`)
              await set(paymentHistoryRef, {
                packageId: userData.packageId,
                billingCycle: userData.billingCycle,
                amount: invoice.amount_paid,
                currency: invoice.currency,
                status: invoice.status,
                timestamp: new Date().toISOString(),
                invoiceId: invoice.id,
                subscriptionId,
              })

              // Add notification for user
              const notificationRef = ref(database, `notifications/${userId}/${Date.now()}`)
              await set(notificationRef, {
                userId,
                eventType: "PAYMENT_SUCCEEDED",
                referenceId: invoice.id,
                message: `Your payment for the ${userData.packageId.charAt(0).toUpperCase() + userData.packageId.slice(1)} plan was successful. Your subscription has been renewed.`,
                status: "unread",
                createdAt: new Date().toISOString(),
              })
            }
          }
        }
      }
      break
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice
      const subscriptionId = invoice.subscription as string

      if (subscriptionId) {
        // Find user with this subscription ID
        const usersRef = ref(database, "users")
        const usersSnapshot = await get(usersRef)

        if (usersSnapshot.exists()) {
          const users = usersSnapshot.val()
          let userId = null

          // Find user with matching subscription ID
          Object.keys(users).forEach((key) => {
            if (users[key].subscriptionId === subscriptionId) {
              userId = key
            }
          })

          if (userId) {
            // Update subscription status
            const userRef = ref(database, `users/${userId}`)
            await update(userRef, {
              subscriptionStatus: "past_due",
              lastUpdated: new Date().toISOString(),
            })

            // Add notification for user
            const notificationRef = ref(database, `notifications/${userId}/${Date.now()}`)
            await set(notificationRef, {
              userId,
              eventType: "PAYMENT_FAILED",
              referenceId: invoice.id,
              message: "Your payment failed. Please update your payment method to continue your subscription.",
              status: "unread",
              createdAt: new Date().toISOString(),
            })
          }
        }
      }
      break
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription
      // Find user with this subscription ID
      const usersRef = ref(database, "users")
      const usersSnapshot = await get(usersRef)

      if (usersSnapshot.exists() && subscription.id) {
        const users = usersSnapshot.val()
        let userId = null

        // Find user with matching subscription ID
        Object.keys(users).forEach((key) => {
          if (users[key].subscriptionId === subscription.id) {
            userId = key
          }
        })

        if (userId) {
          // Update subscription status
          const userRef = ref(database, `users/${userId}`)
          await update(userRef, {
            subscriptionStatus: subscription.status,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            lastUpdated: new Date().toISOString(),
          })

          // If subscription was canceled but still active, notify user
          if (subscription.cancel_at_period_end && subscription.status === "active") {
            const notificationRef = ref(database, `notifications/${userId}/${Date.now()}`)
            await set(notificationRef, {
              userId,
              eventType: "SUBSCRIPTION_CANCELING",
              referenceId: subscription.id,
              message: "Your subscription has been set to cancel at the end of the current billing period.",
              status: "unread",
              createdAt: new Date().toISOString(),
            })
          }
        }
      }
      break
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription
      // Find user with this subscription ID
      const usersRef = ref(database, "users")
      const usersSnapshot = await get(usersRef)

      if (usersSnapshot.exists() && subscription.id) {
        const users = usersSnapshot.val()
        let userId = null

        // Find user with matching subscription ID
        Object.keys(users).forEach((key) => {
          if (users[key].subscriptionId === subscription.id) {
            userId = key
          }
        })

        if (userId) {
          // Downgrade user to basic plan
          const userRef = ref(database, `users/${userId}`)
          await update(userRef, {
            packageId: "basic",
            subscriptionId: null,
            subscriptionStatus: "canceled",
            lastUpdated: new Date().toISOString(),
          })

          // Add notification for user
          const notificationRef = ref(database, `notifications/${userId}/${Date.now()}`)
          await set(notificationRef, {
            userId,
            eventType: "SUBSCRIPTION_CANCELED",
            referenceId: subscription.id,
            message: "Your subscription has been canceled. Your account has been downgraded to the Basic plan.",
            status: "unread",
            createdAt: new Date().toISOString(),
          })

          console.log(`User ${userId} downgraded to basic package due to subscription cancellation`)
        }
      }
      break
    }

    default:
      console.log(`Unhandled event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}
