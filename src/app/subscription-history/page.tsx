"use client"

import { onValue, ref } from "firebase/database"
import { ArrowLeft, Calendar, Clock, CreditCard, Download, ExternalLink, FileText, Receipt } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"

import { useAuth } from "@/contexts/auth-context"
import { database } from "@/lib/firebase/firebase"

type PaymentRecord = {
    packageId: string
    billingCycle: "monthly" | "yearly"
    amount: number
    currency: string
    status: string
    timestamp: string
    sessionId?: string
    subscriptionId?: string
    invoiceId?: string
}

export default function SubscriptionHistoryPage() {
    const [loading, setLoading] = useState(true)
    const [paymentHistory, setPaymentHistory] = useState<Record<string, PaymentRecord>>({})
    const { user, userData } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!user) {
            router.push("/login")
            return
        }

        const historyRef = ref(database, `paymentHistory/${user.uid}`)

        const unsubscribe = onValue(
            historyRef,
            (snapshot) => {
                if (snapshot.exists()) {
                    setPaymentHistory(snapshot.val())
                }
                setLoading(false)
            },
            (error) => {
                console.error("Error fetching payment history:", error)
                setLoading(false)
            },
        )

        return () => unsubscribe()
    }, [user, router])

    // Format currency amount
    const formatAmount = (amount: number, currency: string) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: currency.toUpperCase(),
        }).format(amount / 100)
    }

    // Format date
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        })
    }

    // Format time
    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
        })
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-background">
                <main className="container mx-auto px-6 py-10 max-w-5xl">
                    <Skeleton className="h-6 w-40 mb-8" />
                    <Skeleton className="h-10 w-64 mb-4" />
                    <Skeleton className="h-6 w-96 mb-12" />

                    <div className="space-y-6">
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-24 w-full" />
                        ))}
                    </div>
                </main>
            </div>
        )
    }

    // Sort payment records by timestamp (newest first)
    const sortedPaymentRecords = Object.entries(paymentHistory)
        .map(([id, record]) => ({ id, ...record }))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return (
        <div className="min-h-screen bg-background">
            <main className="container mx-auto px-6 py-10 max-w-5xl">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
                    <Link
                        href="/profile"
                        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Account
                    </Link>

                    <div className="flex items-center gap-3 mt-4 sm:mt-0">
                        <Button variant="outline" size="sm" asChild>
                            <Link href="/upgrade" className="flex items-center gap-1.5">
                                <CreditCard className="h-4 w-4" />
                                Manage Subscription
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="mb-12">
                    <h1 className="text-3xl font-bold mb-2">Subscription History</h1>
                    <p className="text-muted-foreground">View your payment history and subscription details</p>
                </div>

                {/* Current Subscription Card */}
                {userData?.packageId && (
                    <Card className="mb-10">
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <CreditCard className="h-5 w-5 text-primary" />
                                Current Subscription
                            </CardTitle>
                            <CardDescription>Your active subscription details</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Plan</h3>
                                    <div className="flex items-center gap-2">
                                        <p className="text-lg font-semibold">
                                            {userData.packageId.charAt(0).toUpperCase() + userData.packageId.slice(1)}
                                        </p>
                                        <Badge
                                            variant={
                                                userData.packageId === "premium"
                                                    ? "default"
                                                    : userData.packageId === "plus"
                                                        ? "secondary"
                                                        : "outline"
                                            }
                                            className="font-normal"
                                        >
                                            {userData.packageId}
                                        </Badge>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Status</h3>
                                    <Badge
                                        variant={
                                            userData.subscriptionStatus === "active"
                                                ? "default"
                                                : userData.subscriptionStatus === "past_due"
                                                    ? "destructive"
                                                    : "outline"
                                        }
                                        className="font-normal"
                                    >
                                        {userData.subscriptionStatus
                                            ? userData.subscriptionStatus.charAt(0).toUpperCase() + userData.subscriptionStatus.slice(1)
                                            : "Active"}
                                    </Badge>
                                    {userData.cancelAtPeriodEnd && (
                                        <p className="text-xs text-muted-foreground mt-1">Cancels at period end</p>
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Expires</h3>
                                    <div className="flex items-center">
                                        <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                                        <p>{userData.packageExpiry ? formatDate(userData.packageExpiry) : "N/A"}</p>
                                    </div>
                                </div>
                                {userData.billingCycle && (
                                    <div>
                                        <h3 className="text-sm font-medium text-muted-foreground mb-1">Billing Cycle</h3>
                                        <div className="flex items-center">
                                            <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                                            <p className="capitalize">{userData.billingCycle}</p>
                                        </div>
                                    </div>
                                )}
                                {userData.lastPayment && (
                                    <div>
                                        <h3 className="text-sm font-medium text-muted-foreground mb-1">Last Payment</h3>
                                        <p>{formatDate(userData.lastPayment)}</p>
                                    </div>
                                )}
                                {userData.subscriptionId && (
                                    <div>
                                        <h3 className="text-sm font-medium text-muted-foreground mb-1">Subscription ID</h3>
                                        <p className="text-sm font-mono bg-muted/50 p-1 rounded">
                                            {userData.subscriptionId.substring(0, 14)}...
                                        </p>
                                    </div>
                                )}
                            </div>

                            {userData.subscriptionId && (
                                <div className="mt-8 flex flex-wrap gap-4">
                                    <Button variant="default" className="gap-2" asChild>
                                        <Link href="/upgrade">
                                            <CreditCard className="h-4 w-4" />
                                            Change Plan
                                        </Link>
                                    </Button>
                                    <Button variant="outline" className="gap-2">
                                        <Receipt className="h-4 w-4" />
                                        Manage Billing
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Payment History */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Receipt className="h-5 w-5 text-primary" />
                            Payment History
                        </CardTitle>
                        <CardDescription>Your past transactions and invoices</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {sortedPaymentRecords.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                                <p className="text-lg font-medium mb-2">No payment records found</p>
                                <p className="max-w-md mx-auto mb-6">
                                    Your payment history will appear here once you've made a payment or subscription change.
                                </p>
                                <Button variant="outline" asChild>
                                    <Link href="/upgrade">
                                        <CreditCard className="mr-2 h-4 w-4" />
                                        View Subscription Plans
                                    </Link>
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {sortedPaymentRecords.map((record) => (
                                    <div
                                        key={record.id}
                                        className="flex flex-col md:flex-row justify-between p-5 border rounded-lg hover:bg-muted/20 transition-colors"
                                    >
                                        <div className="space-y-2 mb-4 md:mb-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-medium text-lg">
                                                    {record.packageId.charAt(0).toUpperCase() + record.packageId.slice(1)} Plan
                                                </h3>
                                                <Badge
                                                    variant={
                                                        record.status === "paid" || record.status === "complete"
                                                            ? "default"
                                                            : record.status === "failed"
                                                                ? "destructive"
                                                                : "outline"
                                                    }
                                                    className="capitalize"
                                                >
                                                    {record.status}
                                                </Badge>
                                            </div>

                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    {formatDate(record.timestamp)}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Clock className="h-3.5 w-3.5" />
                                                    {formatTime(record.timestamp)}
                                                </div>
                                                <div className="flex items-center gap-1 capitalize">
                                                    <Receipt className="h-3.5 w-3.5" />
                                                    {record.billingCycle} billing
                                                </div>
                                            </div>

                                            {record.invoiceId && (
                                                <p className="text-xs font-mono text-muted-foreground">
                                                    Invoice: {record.invoiceId.substring(0, 14)}...
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex flex-col md:items-end justify-between">
                                            <p className="text-xl font-bold">{formatAmount(record.amount, record.currency)}</p>
                                            <div className="flex gap-2 mt-2">
                                                <Button variant="ghost" size="sm" className="gap-1 h-8">
                                                    <Download className="h-3.5 w-3.5" />
                                                    Receipt
                                                </Button>
                                                <Button variant="ghost" size="sm" className="gap-1 h-8">
                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                    Details
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <Separator className="my-8" />

                        <div className="text-center">
                            <h3 className="text-lg font-medium mb-2">Need help with billing?</h3>
                            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                                If you have any questions about your subscription or billing, our support team is here to help.
                            </p>
                            <div className="flex flex-wrap justify-center gap-4">
                                <Button variant="outline" className="gap-2">
                                    Contact Support
                                </Button>
                                <Button variant="ghost" asChild className="gap-2">
                                    <Link href="/upgrade">View Plans</Link>
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}

