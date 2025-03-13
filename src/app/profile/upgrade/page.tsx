"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ref, update } from "firebase/database"
import { database } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Check, CreditCard, Shield } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PACKAGE_LIMITS } from "@/lib/utils"
import { loadStripe } from "@stripe/stripe-js"

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "")

export default function UpgradePage() {
  const [loading, setLoading] = useState(true)
  const [processingPayment, setProcessingPayment] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly")
  const { user, userData } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    setLoading(false)
  }, [user, router])

  const handleUpgrade = async (packageId: string) => {
    if (!user) return

    setProcessingPayment(true)
    setError(null)
    setSuccess(null)

    try {
      // Create a checkout session
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          packageId,
          billingCycle,
          userId: user.uid,
          email: user.email,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create checkout session")
      }

      const { sessionId } = await response.json()

      // Redirect to Stripe Checkout
      const stripe = await stripePromise
      if (!stripe) throw new Error("Failed to load Stripe")

      const { error } = await stripe.redirectToCheckout({ sessionId })

      if (error) {
        throw new Error(error.message || "Failed to redirect to checkout")
      }
    } catch (error: any) {
      console.error("Error upgrading package:", error)
      setError(error.message || "An error occurred while processing your payment")
    } finally {
      setProcessingPayment(false)
    }
  }

  // For demo purposes - simulate a successful payment without Stripe
  const handleDemoUpgrade = async (packageId: string) => {
    if (!user) return

    setProcessingPayment(true)
    setError(null)
    setSuccess(null)

    try {
      // Calculate expiry date (1 year from now)
      const expiryDate = new Date()
      expiryDate.setFullYear(expiryDate.getFullYear() + 1)

      // Update user package in database
      const userRef = ref(database, `users/${user.uid}`)
      await update(userRef, {
        packageId,
        packageExpiry: expiryDate.toISOString(),
      })

      setSuccess(`Successfully upgraded to ${packageId.charAt(0).toUpperCase() + packageId.slice(1)} package!`)

      // Redirect to projects page after a delay
      setTimeout(() => {
        router.push("/projects")
      }, 2000)
    } catch (error: any) {
      console.error("Error upgrading package:", error)
      setError("An error occurred while upgrading your package")
    } finally {
      setProcessingPayment(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <Link href="/projects" className="text-2xl font-bold text-primary">
            TMS <span className="text-sm text-muted-foreground">v5</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <Link
          href="/profile"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Account
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Upgrade Your Plan</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that's right for your team and unlock more features to boost your productivity.
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-md mb-6 max-w-2xl mx-auto">{error}</div>
        )}

        {success && (
          <div className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 p-4 rounded-md mb-6 max-w-2xl mx-auto">
            {success}
          </div>
        )}

        <div className="flex justify-center mb-8">
          <Tabs
            defaultValue="monthly"
            className="w-full max-w-2xl"
            onValueChange={(value) => setBillingCycle(value as "monthly" | "yearly")}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="monthly">Monthly Billing</TabsTrigger>
              <TabsTrigger value="yearly">
                Yearly Billing{" "}
                <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Save 20%</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="monthly">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <PricingCard
                  title="Basic"
                  price="Free"
                  description="Perfect for individuals or small teams"
                  features={[
                    `Up to ${PACKAGE_LIMITS.basic} projects`,
                    "Basic task management",
                    "Email notifications",
                    "1 year validity",
                  ]}
                  buttonText={userData?.packageId === "basic" ? "Current Plan" : "Downgrade"}
                  onClick={() => handleDemoUpgrade("basic")}
                  disabled={userData?.packageId === "basic" || processingPayment}
                  current={userData?.packageId === "basic"}
                />
                <PricingCard
                  title="Plus"
                  price="$9.99"
                  period="per month"
                  description="Ideal for growing teams"
                  features={[
                    `Up to ${PACKAGE_LIMITS.plus} projects`,
                    "Advanced task management",
                    "GitHub integration",
                    "Email & in-app notifications",
                    "1 year validity",
                  ]}
                  buttonText={userData?.packageId === "plus" ? "Current Plan" : "Upgrade"}
                  onClick={() => handleDemoUpgrade("plus")}
                  disabled={userData?.packageId === "plus" || processingPayment}
                  current={userData?.packageId === "plus"}
                  highlighted
                />
                <PricingCard
                  title="Premium"
                  price="$19.99"
                  period="per month"
                  description="For professional development teams"
                  features={[
                    "Unlimited projects",
                    "Full task management suite",
                    "Advanced GitHub integration",
                    "Priority support",
                    "Custom Cloudinary configuration",
                    "1 year validity",
                  ]}
                  buttonText={userData?.packageId === "premium" ? "Current Plan" : "Upgrade"}
                  onClick={() => handleDemoUpgrade("premium")}
                  disabled={userData?.packageId === "premium" || processingPayment}
                  current={userData?.packageId === "premium"}
                />
              </div>
            </TabsContent>
            <TabsContent value="yearly">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <PricingCard
                  title="Basic"
                  price="Free"
                  description="Perfect for individuals or small teams"
                  features={[
                    `Up to ${PACKAGE_LIMITS.basic} projects`,
                    "Basic task management",
                    "Email notifications",
                    "1 year validity",
                  ]}
                  buttonText={userData?.packageId === "basic" ? "Current Plan" : "Downgrade"}
                  onClick={() => handleDemoUpgrade("basic")}
                  disabled={userData?.packageId === "basic" || processingPayment}
                  current={userData?.packageId === "basic"}
                />
                <PricingCard
                  title="Plus"
                  price="$95.90"
                  period="per year"
                  description="Ideal for growing teams"
                  features={[
                    `Up to ${PACKAGE_LIMITS.plus} projects`,
                    "Advanced task management",
                    "GitHub integration",
                    "Email & in-app notifications",
                    "1 year validity",
                  ]}
                  buttonText={userData?.packageId === "plus" ? "Current Plan" : "Upgrade"}
                  onClick={() => handleDemoUpgrade("plus")}
                  disabled={userData?.packageId === "plus" || processingPayment}
                  current={userData?.packageId === "plus"}
                  highlighted
                />
                <PricingCard
                  title="Premium"
                  price="$191.90"
                  period="per year"
                  description="For professional development teams"
                  features={[
                    "Unlimited projects",
                    "Full task management suite",
                    "Advanced GitHub integration",
                    "Priority support",
                    "Custom Cloudinary configuration",
                    "1 year validity",
                  ]}
                  buttonText={userData?.packageId === "premium" ? "Current Plan" : "Upgrade"}
                  onClick={() => handleDemoUpgrade("premium")}
                  disabled={userData?.packageId === "premium" || processingPayment}
                  current={userData?.packageId === "premium"}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="max-w-2xl mx-auto bg-muted/30 p-6 rounded-lg border border-border">
          <div className="flex items-start">
            <Shield className="h-6 w-6 text-primary mr-3 mt-1" />
            <div>
              <h3 className="font-semibold mb-2">Secure Payment Processing</h3>
              <p className="text-sm text-muted-foreground mb-4">
                All payments are securely processed through Stripe. Your payment information is never stored on our
                servers.
              </p>
              <div className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm">We accept all major credit cards and PayPal</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function PricingCard({
  title,
  price,
  period,
  description,
  features,
  buttonText,
  onClick,
  disabled,
  current,
  highlighted = false,
}: {
  title: string
  price: string
  period?: string
  description: string
  features: string[]
  buttonText: string
  onClick: () => void
  disabled: boolean
  current: boolean
  highlighted?: boolean
}) {
  return (
    <Card className={`overflow-hidden ${highlighted ? "border-primary/20 shadow-lg" : ""}`}>
      {highlighted && (
        <div className="bg-primary text-primary-foreground text-center py-1 text-sm font-medium">Most Popular</div>
      )}
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <div className="mt-2">
          <span className="text-3xl font-bold">{price}</span>
          {period && <span className="text-muted-foreground ml-1">{period}</span>}
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <Check className="h-5 w-5 text-primary mr-2 shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          onClick={onClick}
          disabled={disabled}
          variant={current ? "outline" : highlighted ? "default" : "outline"}
          className="w-full"
        >
          {buttonText}
        </Button>
      </CardFooter>
    </Card>
  )
}

