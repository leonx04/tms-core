"use client"

import Footer from "@/components/layout/footer"
import Header from "@/components/layout/header"
import { usePathname } from "next/navigation"
import React from "react"

export default function LayoutWrapper({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()

    const authRoutes = ['/login', '/register', '/forgot-password']

    const isAuthRoute = authRoutes.includes(pathname)

    return (
        <>
            {!isAuthRoute && <Header />}
            <main>{children}</main>
            {!isAuthRoute && <Footer />}
        </>
    )
}