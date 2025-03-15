"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { auth } from "@/lib/firebase"
import { zodResolver } from "@hookform/resolvers/zod"
import { sendPasswordResetEmail } from "firebase/auth"
import { AlertCircle, ArrowLeft, CheckCircle, Mail } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
})

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  })

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      await sendPasswordResetEmail(auth, data.email)
      setSuccess("Password reset email sent. Please check your inbox.")
    } catch (error: any) {
      console.error("Error sending password reset email:", error)
      if (error.code === "auth/user-not-found") {
        setError("No account found with this email address.")
      } else {
        setError("An error occurred. Please try again later.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="container mx-auto px-4 py-8 flex justify-between items-center">
        <Link href="/" className="inline-flex items-center text-sm hover:text-primary transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-block">
              <div className="flex items-center justify-center">
                <div className="bg-foreground text-background w-10 h-10 rounded-md flex items-center justify-center font-bold text-xl">
                  T
                </div>
                <span className="text-2xl font-bold ml-2">TMC</span>
                <span className="text-xs text-muted-foreground ml-1 mt-1">v1</span>
              </div>
            </Link>
            <h1 className="text-2xl font-bold mt-6">Reset your password</h1>
            <p className="text-muted-foreground mt-2">
              Enter your email address and we'll send you a link to reset your password
            </p>
          </div>

          <Card className="shadow-modern animate-fadeIn">
            <CardContent className="p-8">
              {error && (
                <div className="bg-destructive/10 text-destructive p-4 rounded-lg mb-6 flex items-start">
                  <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 p-4 rounded-lg mb-6 flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      id="email"
                      type="email"
                      {...register("email")}
                      className="w-full pl-10 pr-4 py-3 rounded-lg shadow-sm bg-background focus:ring-2 focus:ring-primary/20 transition-colors"
                      disabled={isLoading}
                      placeholder="your@email.com"
                    />
                  </div>
                  {errors.email && <p className="text-destructive text-sm mt-1">{errors.email.message}</p>}
                </div>

                <Button type="submit" className="w-full py-3 rounded-lg" disabled={isLoading}>
                  {isLoading ? "Sending..." : "Send Reset Link"}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">Remember your password?</span>{" "}
                <Link href="/login" className="text-primary hover:underline font-medium">
                  Back to login
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

