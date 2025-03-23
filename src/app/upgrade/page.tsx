"use client"
import { loadStripe } from "@stripe/stripe-js"
import { onValue, ref, update } from "firebase/database"
import { AlertCircle, ArrowLeft, Calendar, Check, CheckCircle, History, Receipt, Sparkles } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"

import { database } from "@/config/firebase"
import { secureRoutes } from "@/config/secure-routes"
import { useAuth } from "@/contexts/auth-context"
import { type SubscriptionPlan, PACKAGE_LIMITS } from "@/types"

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "")

// PricingCard component
interface PricingCardProps {
  title: string
  price: string
  period?: string
  description: string
  features: string[]
  buttonText: string
  onClick: () => void
  disabled: boolean
  current: boolean
  highlighted: boolean
  processingPayment: boolean
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
  highlighted,
  processingPayment,
}: PricingCardProps) {
  return (
    <div
      className={`flex flex-col p-6 rounded-xl border ${
        highlighted ? "border-primary/50 bg-primary/5 shadow-md dark:bg-primary/10" : "border-border bg-card"
      }`}
    >
      {highlighted && <Badge className="self-start mb-4 bg-primary text-primary-foreground">Most Popular</Badge>}
      <h3 className="text-xl font-bold">{title}</h3>
      <p className="text-muted-foreground mt-2 mb-4">{description}</p>
      <div className="mt-2 mb-6">
        <span className="text-3xl font-bold">{price}</span>
        {period && <span className="text-muted-foreground ml-1">{period}</span>}
      </div>
      <ul className="space-y-3 mb-8 flex-1">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <Check className="h-5 w-5 text-green-500 mr-2 shrink-0" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <Button
        onClick={onClick}
        disabled={disabled}
        variant={current ? "outline" : highlighted ? "default" : "outline"}
        className={`mt-auto ${processingPayment ? "opacity-70 cursor-not-allowed" : ""}`}
      >
        {processingPayment ? "Processing..." : buttonText}
      </Button>
      {current && <p className="text-sm text-center mt-2 text-muted-foreground">Your current plan</p>}
    </div>
  )
}

// Component that uses useSearchParams
function UpgradePageContent() {
  const [loading, setLoading] = useState(true)
  const [processingPayment, setProcessingPayment] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly")
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const { user, userData } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  // Get search params in a client component
  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "")

  // Define default plans
  const defaultPlans: SubscriptionPlan[] = [
    {
      id: "basic",
      name: "Basic",
      description: "Perfect for individuals or small teams",
      monthlyPrice: 0,
      yearlyPrice: 0,
      features: [
        `Up to ${PACKAGE_LIMITS.basic} projects`,
        "Basic task management",
        "Email notifications",
        "1 year validity",
      ],
      popular: false,
    },
    {
      id: "plus",
      name: "Plus",
      description: "Ideal for growing teams",
      monthlyPrice: 9.99,
      yearlyPrice: 95.9,
      features: [
        `Up to ${PACKAGE_LIMITS.plus} projects`,
        "Advanced task management",
        "GitHub integration",
        "Email & in-app notifications",
        "Priority email support",
        "1 year validity",
      ],
      popular: true,
    },
    {
      id: "premium",
      name: "Premium",
      description: "For professional development teams",
      monthlyPrice: 19.99,
      yearlyPrice: 191.9,
      features: [
        "Unlimited projects",
        "Full task management suite",
        "Advanced GitHub integration",
        "Priority support",
        "Custom Cloudinary configuration",
        "Advanced analytics",
        "1 year validity",
      ],
      popular: false,
    },
  ]

  // Fetch subscription plans from Firebase. If not logged in, use default plans
  useEffect(() => {
    if (!user) {
      setPlans(defaultPlans)
      setLoading(false)
      return
    }

    const plansRef = ref(database, "subscriptionPlans")

    const unsubscribe = onValue(
      plansRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const plansData = snapshot.val()
          const plansArray = Object.keys(plansData).map((key) => ({
            id: key,
            ...plansData[key],
          }))
          setPlans(plansArray)
        } else {
          setPlans(defaultPlans)
        }
        setLoading(false)
      },
      (error) => {
        console.error("Error fetching subscription plans:", error)
        setPlans(defaultPlans)
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [user])

  // Handle URL parameters for payment status
  useEffect(() => {
    const successParam = searchParams.get("success")
    const canceledParam = searchParams.get("canceled")
    const sessionId = searchParams.get("session_id")

    if (successParam === "true" && sessionId) {
      setSuccess("Payment successful! Your subscription has been upgraded.")
      toast({
        title: "Payment Successful",
        description: "Your subscription has been upgraded successfully.",
        variant: "default",
      })

      // Clear URL parameters
      window.history.replaceState({}, document.title, "/upgrade")
    } else if (canceledParam === "true") {
      setError("Payment was canceled. Please try again if you wish to upgrade.")

      // Clear URL parameters
      window.history.replaceState({}, document.title, "/upgrade")
    }
  }, [toast, searchParams])

  const handleUpgrade = async (packageId: string) => {
    // Require login before upgrading
    if (!user) {
      const encryptedReturnUrl = secureRoutes.encryptRoute("/upgrade")
      router.push(`/login?returnUrl=${encryptedReturnUrl}`)
      return
    }

    setProcessingPayment(true)
    setError(null)
    setSuccess(null)

    try {
      // Handle free tier without calling API
      if (packageId === "basic") {
        await handleFreeUpgrade(packageId)
        return
      }

      // Get auth token
      const token = await user.getIdToken()

      // Create checkout session
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          packageId,
          billingCycle,
          userId: user.uid,
          email: user.email,
        }),
      })

      if (!response.ok) {
        const text = await response.text()
        let errorMessage

        try {
          const errorData = JSON.parse(text)
          errorMessage = errorData.error || "Failed to create checkout session"
        } catch (e) {
          console.error("Non-JSON response:", text)
          errorMessage = "Server error. Please try again later."
        }

        throw new Error(errorMessage)
      }

      const data = await response.json()

      // Redirect to Stripe Checkout
      const stripe = await stripePromise
      if (!stripe) throw new Error("Failed to load Stripe")

      const { error } = await stripe.redirectToCheckout({ sessionId: data.sessionId })

      if (error) {
        throw new Error(error.message || "Failed to redirect to checkout")
      }
    } catch (error: any) {
      console.error("Error upgrading package:", error)
      setError(error.message || "An error occurred while processing your payment")
      toast({
        title: "Error",
        description: error.message || "An error occurred while processing your payment",
        variant: "destructive",
      })
    } finally {
      setProcessingPayment(false)
    }
  }

  const handleFreeUpgrade = async (packageId: string) => {
    if (!user) {
      const encryptedReturnUrl = secureRoutes.encryptRoute("/upgrade")
      router.push(`/login?returnUrl=${encryptedReturnUrl}`)
      return
    }

    try {
      const userRef = ref(database, `users/${user.uid}`)
      const expiryDate = new Date()
      expiryDate.setFullYear(expiryDate.getFullYear() + 1)

      await update(userRef, {
        packageId,
        packageExpiry: expiryDate.toISOString(),
        billingCycle,
        lastUpdated: new Date().toISOString(),
      })

      setSuccess(`Successfully switched to ${packageId.charAt(0).toUpperCase() + packageId.slice(1)} package!`)
      toast({
        title: "Plan Updated",
        description: `Successfully switched to ${packageId.charAt(0).toUpperCase() + packageId.slice(1)} package!`,
        variant: "default",
      })

      setTimeout(() => {
        router.push("/projects")
      }, 2000)
    } catch (error: any) {
      console.error("Error upgrading package:", error)
      setError("An error occurred while upgrading your package")
      toast({
        title: "Error",
        description: "An error occurred while upgrading your package",
        variant: "destructive",
      })
    } finally {
      setProcessingPayment(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-6 py-10 max-w-7xl">
          <div className="flex flex-col items-center space-y-8">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-6 w-96" />

            <div className="w-full max-w-4xl mt-12">
              <Skeleton className="h-12 w-full mb-8" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex flex-col space-y-4 p-6 border rounded-lg">
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-10 w-32" />
                    <div className="space-y-2">
                      {[1, 2, 3, 4].map((j) => (
                        <Skeleton key={j} className="h-5 w-full" />
                      ))}
                    </div>
                    <Skeleton className="h-12 w-full mt-4" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-6 py-10 max-w-7xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <Link
            href="/profile"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Account
          </Link>

          <div className="flex items-center gap-3 mt-4 sm:mt-0">
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
              <Link href="/subscription-history" className="flex items-center gap-1.5">
                <History className="h-4 w-4" />
                Payment History
              </Link>
            </Button>
          </div>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Upgrade Your Plan</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Choose the plan that's right for your team and unlock more features to boost your productivity.
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-8 max-w-3xl mx-auto animate-in fade-in-50 slide-in-from-top-5">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-8 max-w-3xl mx-auto bg-green-50 text-green-800 dark:bg-green-900/50 dark:text-green-200 border-green-200 dark:border-green-800 animate-in fade-in-50 slide-in-from-top-5">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Current Plan Banner */}
        {userData?.packageId && (
          <div className="mb-10 max-w-4xl mx-auto">
            <div className="bg-muted/50 border border-border rounded-lg p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-full">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">
                    Current Plan:{" "}
                    <span className="font-bold text-primary">
                      {userData.packageId.charAt(0).toUpperCase() + userData.packageId.slice(1)}
                    </span>
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {userData.packageExpiry
                        ? new Date(userData.packageExpiry).toLocaleDateString()
                        : "No expiration date"}
                    </div>

                    {userData.billingCycle && (
                      <div className="flex items-center gap-1">
                        <Receipt className="h-3.5 w-3.5" />
                        <span className="capitalize">{userData.billingCycle} billing</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Badge
                  variant={
                    userData.packageId === "basic" ? "outline" : userData.packageId === "plus" ? "secondary" : "default"
                  }
                  className="px-3 py-1"
                >
                  {userData.packageId.charAt(0).toUpperCase() + userData.packageId.slice(1)}
                </Badge>

                <Button variant="outline" size="sm" asChild className="h-7">
                  <Link href="/subscription-history" className="flex items-center gap-1.5">
                    <History className="h-3.5 w-3.5" />
                    View History
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-center mb-12">
          <Tabs
            defaultValue="monthly"
            className="w-full max-w-4xl"
            onValueChange={(value) => setBillingCycle(value as "monthly" | "yearly")}
          >
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="monthly" className="text-base py-3">
                Monthly Billing
              </TabsTrigger>
              <TabsTrigger value="yearly" className="text-base py-3">
                Yearly Billing{" "}
                <Badge variant="outline" className="ml-2 bg-primary/10 text-primary border-0">
                  Save 20%
                </Badge>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="monthly" className="animate-in fade-in-50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-6">
                {plans.map((plan) => (
                  <PricingCard
                    key={plan.id}
                    title={plan.name}
                    price={plan.monthlyPrice === 0 ? "Free" : `$${plan.monthlyPrice}`}
                    period={plan.monthlyPrice === 0 ? undefined : "per month"}
                    description={plan.description}
                    features={plan.features}
                    buttonText={
                      userData?.packageId === plan.id && userData?.billingCycle === "monthly"
                        ? "Current Plan"
                        : userData?.packageId === "premium" && plan.id !== "premium"
                          ? "Downgrade"
                          : plan.id === "basic"
                            ? "Switch to Basic"
                            : "Upgrade"
                    }
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={
                      (userData?.packageId === plan.id && userData?.billingCycle === "monthly") || processingPayment
                    }
                    current={userData?.packageId === plan.id && userData?.billingCycle === "monthly"}
                    highlighted={plan.popular}
                    processingPayment={processingPayment}
                  />
                ))}
              </div>
            </TabsContent>
            <TabsContent value="yearly" className="animate-in fade-in-50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-6">
                {plans.map((plan) => (
                  <PricingCard
                    key={plan.id}
                    title={plan.name}
                    price={plan.yearlyPrice === 0 ? "Free" : `$${plan.yearlyPrice}`}
                    period={plan.yearlyPrice === 0 ? undefined : "per year"}
                    description={plan.description}
                    features={plan.features}
                    buttonText={
                      userData?.packageId === plan.id && userData?.billingCycle === "yearly"
                        ? "Current Plan"
                        : userData?.packageId === "premium" && plan.id !== "premium"
                          ? "Downgrade"
                          : plan.id === "basic"
                            ? "Switch to Basic"
                            : "Upgrade"
                    }
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={
                      (userData?.packageId === plan.id && userData?.billingCycle === "yearly") || processingPayment
                    }
                    current={userData?.packageId === plan.id && userData?.billingCycle === "yearly"}
                    highlighted={plan.popular}
                    processingPayment={processingPayment}
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Plan Comparison Table */}
        <div className="max-w-4xl mx-auto mb-16 overflow-hidden rounded-xl border border-border">
          <div className="bg-muted/50 p-4 border-b border-border">
            <h3 className="text-xl font-semibold">Plan Comparison</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/30">
                  <th className="py-4 px-6 text-left font-medium">Features</th>
                  <th className="py-4 px-6 text-center font-medium">Basic</th>
                  <th className="py-4 px-6 text-center font-medium">Plus</th>
                  <th className="py-4 px-6 text-center font-medium">Premium</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="py-4 px-6">Projects</td>
                  <td className="py-4 px-6 text-center">Up to 3</td>
                  <td className="py-4 px-6 text-center">Up to 10</td>
                  <td className="py-4 px-6 text-center">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-4 px-6">Task Management</td>
                  <td className="py-4 px-6 text-center">Basic</td>
                  <td className="py-4 px-6 text-center">Advanced</td>
                  <td className="py-4 px-6 text-center">Full Suite</td>
                </tr>
                <tr>
                  <td className="py-4 px-6">GitHub Integration</td>
                  <td className="py-4 px-6 text-center">
                    <AlertCircle className="h-5 w-5 text-muted-foreground mx-auto" />
                  </td>
                  <td className="py-4 px-6 text-center">
                    <Check className="h-5 w-5 text-green-500 mx-auto" />
                  </td>
                  <td className="py-4 px-6 text-center">
                    <Check className="h-5 w-5 text-green-500 mx-auto" />
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-6">Email Notifications</td>
                  <td className="py-4 px-6 text-center">
                    <Check className="h-5 w-5 text-green-500 mx-auto" />
                  </td>
                  <td className="py-4 px-6 text-center">
                    <Check className="h-5 w-5 text-green-500 mx-auto" />
                  </td>
                  <td className="py-4 px-6 text-center">
                    <Check className="h-5 w-5 text-green-500 mx-auto" />
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-6">In-app Notifications</td>
                  <td className="py-4 px-6 text-center">
                    <AlertCircle className="h-5 w-5 text-muted-foreground mx-auto" />
                  </td>
                  <td className="py-4 px-6 text-center">
                    <Check className="h-5 w-5 text-green-500 mx-auto" />
                  </td>
                  <td className="py-4 px-6 text-center">
                    <Check className="h-5 w-5 text-green-500 mx-auto" />
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-6">Priority Support</td>
                  <td className="py-4 px-6 text-center">
                    <AlertCircle className="h-5 w-5 text-muted-foreground mx-auto" />
                  </td>
                  <td className="py-4 px-6 text-center">Email Only</td>
                  <td className="py-4 px-6 text-center">Email & Chat</td>
                </tr>
                <tr>
                  <td className="py-4 px-6">Custom Cloudinary Config</td>
                  <td className="py-4 px-6 text-center">
                    <AlertCircle className="h-5 w-5 text-muted-foreground mx-auto" />
                  </td>
                  <td className="py-4 px-6 text-center">
                    <AlertCircle className="h-5 w-5 text-muted-foreground mx-auto" />
                  </td>
                  <td className="py-4 px-6 text-center">
                    <Check className="h-5 w-5 text-green-500 mx-auto" />
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-6">Analytics</td>
                  <td className="py-4 px-6 text-center">Basic</td>
                  <td className="py-4 px-6 text-center">Standard</td>
                  <td className="py-4 px-6 text-center">Advanced</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="max-w-3xl mx-auto bg-muted/40 p-8 rounded-xl border border-border shadow-sm">
          <h3 className="text-xl font-semibold mb-4">Frequently Asked Questions</h3>
          <div className="space-y-6">
            <div>
              <h4 className="font-medium mb-2">How do I change my plan?</h4>
              <p className="text-muted-foreground">
                You can upgrade or downgrade your plan at any time from this page. Changes take effect immediately.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Will I be charged immediately?</h4>
              <p className="text-muted-foreground">
                Yes, when upgrading to a paid plan, you'll be charged immediately. For yearly plans, you'll be billed
                for the entire year upfront.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Can I get a refund?</h4>
              <p className="text-muted-foreground">
                We offer a 14-day money-back guarantee. If you're not satisfied with your purchase, please contact our
                support team.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">What payment methods do you accept?</h4>
              <p className="text-muted-foreground">
                We accept all major credit cards (Visa, Mastercard, American Express) through our secure payment
                processor, Stripe.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function Page() {
  return <UpgradePageContent />
}

