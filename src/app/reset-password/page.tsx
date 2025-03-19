"use client"

import { Suspense } from "react"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { auth } from "@/lib/firebase"
import { zodResolver } from "@hookform/resolvers/zod"
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth"
import { AlertCircle, ArrowLeft, CheckCircle, Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

const resetPasswordSchema = z
  .object({
    password: z.string().min(6, { message: "Password must be at least 6 characters" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

function ResetPasswordContent() {
  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const router = useRouter()

  // Get oobCode from URL on client side
  const [oobCode, setOobCode] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      setOobCode(params.get("oobCode"))
    }
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  })

  useEffect(() => {
    const verifyCode = async () => {
      if (!oobCode) {
        setError("Invalid or expired password reset link.")
        setIsVerifying(false)
        return
      }

      try {
        const email = await verifyPasswordResetCode(auth, oobCode)
        setEmail(email)
        setIsVerifying(false)
      } catch (error) {
        console.error("Error verifying reset code:", error)
        setError("Invalid or expired password reset link.")
        setIsVerifying(false)
      }
    }

    if (oobCode) {
      verifyCode()
    }
  }, [oobCode])

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!oobCode) return

    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      await confirmPasswordReset(auth, oobCode, data.password)
      setSuccess("Your password has been reset successfully.")
      setTimeout(() => {
        router.push("/login")
      }, 3000)
    } catch (error: any) {
      console.error("Error resetting password:", error)
      setError("An error occurred while resetting your password. Please try again.")
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
        <ThemeToggle />
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
            {email && <p className="text-muted-foreground mt-2">Create a new password for {email}</p>}
          </div>

          <Card className="shadow-modern animate-fadeIn">
            <CardContent className="p-8">
              {isVerifying ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : (
                <>
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

                  {!error && !success && (
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                      <div>
                        <label htmlFor="password" className="block text-sm font-medium mb-1">
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            {...register("password")}
                            className="w-full p-3 rounded-lg shadow-sm bg-background focus:ring-2 focus:ring-primary/20 transition-colors"
                            disabled={isLoading}
                            placeholder="••••••••"
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                        {errors.password && <p className="text-destructive text-sm mt-1">{errors.password.message}</p>}
                      </div>

                      <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
                          Confirm New Password
                        </label>
                        <div className="relative">
                          <input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            {...register("confirmPassword")}
                            className="w-full p-3 rounded-lg shadow-sm bg-background focus:ring-2 focus:ring-primary/20 transition-colors"
                            disabled={isLoading}
                            placeholder="••••••••"
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                        {errors.confirmPassword && (
                          <p className="text-destructive text-sm mt-1">{errors.confirmPassword.message}</p>
                        )}
                      </div>

                      <Button type="submit" className="w-full py-3 rounded-lg" disabled={isLoading}>
                        {isLoading ? "Resetting..." : "Reset Password"}
                      </Button>
                    </form>
                  )}

                  {error && (
                    <div className="mt-6 text-center">
                      <Link href="/forgot-password">
                        <Button variant="outline" className="rounded-lg">
                          Try Again
                        </Button>
                      </Link>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  )
}

