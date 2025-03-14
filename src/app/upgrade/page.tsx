"use client"

import { loadStripe } from "@stripe/stripe-js"
import { onValue, ref, update } from "firebase/database"
import { ArrowLeft, Check, CreditCard, Lock, Shield, Users, Zap } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"

import { useAuth } from "@/contexts/auth-context"
import { database } from "@/lib/firebase"
import { secureRoutes } from "@/lib/secure-routes"
import { type SubscriptionPlan, PACKAGE_LIMITS } from "@/types"

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "")

export default function UpgradePage() {
  const [loading, setLoading] = useState(true)
  const [processingPayment, setProcessingPayment] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly")
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const { user, userData } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  // Định nghĩa default plans
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
        "1 year validity",
      ],
      popular: false,
    },
  ]

  // Fetch subscription plans từ Firebase. Nếu chưa đăng nhập, dùng luôn default plans
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
      }
    )

    return () => unsubscribe()
  }, [user])

  // Handle URL parameters for payment status
  useEffect(() => {
    const url = new URL(window.location.href)
    const successParam = url.searchParams.get("success")
    const canceledParam = url.searchParams.get("canceled")
    const sessionId = url.searchParams.get("session_id")

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
  }, [toast])

  const handleUpgrade = async (packageId: string) => {
    // Yêu cầu đăng nhập trước khi nâng cấp
    if (!user) {
      const encryptedReturnUrl = secureRoutes.encryptRoute("/upgrade")
      router.push(`/login?returnUrl=${encryptedReturnUrl}`)
      return
    }

    setProcessingPayment(true)
    setError(null)
    setSuccess(null)

    try {
      // Xử lý gói miễn phí không cần gọi API
      if (packageId === "basic") {
        await handleFreeUpgrade(packageId)
        return
      }

      // Lấy auth token
      const token = await user.getIdToken()

      // Tạo phiên thanh toán
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

      // Chuyển hướng đến Stripe Checkout
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
        <Link
          href="/profile"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Account
        </Link>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Upgrade Your Plan</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Choose the plan that's right for your team and unlock more features to boost your productivity.
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-8 max-w-3xl mx-auto">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-8 max-w-3xl mx-auto bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 border-green-200 dark:border-green-800">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
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
                        : plan.id === "basic"
                          ? "Downgrade"
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
                        : plan.id === "basic"
                          ? "Downgrade"
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

        <div className="max-w-3xl mx-auto bg-muted/40 p-8 rounded-xl border border-border shadow-sm">
          <div className="flex items-start">
            <Shield className="h-8 w-8 text-primary mr-4 mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-xl mb-3">Secure Payment Processing</h3>
              <p className="text-muted-foreground mb-5">
                All payments are securely processed through Stripe. Your payment information is never stored on our
                servers.
              </p>
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center space-x-3">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <span>All major credit cards accepted</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                  <span>256-bit SSL encryption</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Zap className="h-5 w-5 text-muted-foreground" />
                  <span>Instant account activation</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto mt-12 text-center">
          <h3 className="text-xl font-semibold mb-4">Need help choosing a plan?</h3>
          <p className="text-muted-foreground mb-6">
            Our team is ready to help you find the perfect plan for your needs.
          </p>
          <div className="flex justify-center gap-4">
            <Button variant="outline" className="gap-2">
              <Users className="h-4 w-4" />
              Contact Sales
            </Button>
            <Button variant="ghost" className="gap-2">
              View Plan Comparison
            </Button>
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
  processingPayment,
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
  processingPayment: boolean
}) {
  return (
    <Card
      className={`overflow-hidden transition-all duration-200 ${highlighted
          ? "border-primary shadow-lg dark:shadow-primary/10 scale-105 z-10"
          : "hover:border-border/80 hover:shadow-md"
        }`}
    >
      {highlighted && (
        <div className="bg-primary text-primary-foreground text-center py-2 text-sm font-medium">Most Popular</div>
      )}
      <CardHeader className={highlighted ? "pb-4" : "pb-2"}>
        <CardTitle className="text-2xl">{title}</CardTitle>
        <CardDescription className="text-base">{description}</CardDescription>
        <div className="mt-4">
          <span className="text-4xl font-bold">{price}</span>
          {period && <span className="text-muted-foreground ml-2">{period}</span>}
        </div>
      </CardHeader>
      <CardContent className="pb-6">
        <ul className="space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <Check className="h-5 w-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
              <span className="text-foreground/90">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="pt-2 pb-6">
        <Button
          onClick={onClick}
          disabled={disabled}
          variant={current ? "outline" : highlighted ? "default" : "outline"}
          className="w-full py-6 text-base"
          size="lg"
        >
          {buttonText}
          {processingPayment && (
            <div className="ml-2 animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current"></div>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
