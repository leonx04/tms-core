"use client"

import Footer from "@/components/layout/footer"
import Header from "@/components/layout/header"
import { usePathname } from "next/navigation"
import type React from "react"

export default function LayoutWrapper({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()

    const authRoutes = ["/login", "/register", "/forgot-password"]
    const specialRoutes = ["/not-found", "/404"]

    const isAuthRoute = authRoutes.includes(pathname)
    const isSpecialRoute = specialRoutes.includes(pathname)

    return (
        <>
            {!isAuthRoute && !isSpecialRoute && <Header />}
            <main>{children}</main>
            {!isAuthRoute && !isSpecialRoute && <Footer />}
        </>
    )
}

