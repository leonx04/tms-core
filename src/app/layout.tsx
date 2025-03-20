import LayoutWrapper from "@/components/layout/layout-wrapper"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/contexts/auth-context"
import { Analytics } from "@vercel/analytics/react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import Script from "next/script"
import type React from "react"
import "./globals.css"
import { AuthSessionManager } from "@/components/auth-session-manager"
import { EnhancedToaster } from "@/components/ui/enhanced-toaster"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "TMC - Task Management Core",
  description: "A comprehensive task management for software development teams",
}

const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="google-site-verification" content="uPN5UdwQjwKQot2cX_IHUf696zu9aj__Dx0k7mPHwc4" />
        <meta name="robots" content="index, follow" />

        {/* Open Graph Meta Tags */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="TMC - Task Management Core" />
        <meta
          property="og:description"
          content="A comprehensive task management system for software development teams."
        />
        <meta
          property="og:image"
          content="https://raw.githubusercontent.com/leonx04/tms-core/refs/heads/master/public/tmc.png"
        />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:url" content="https://tms-core.vercel.app/" />
        <meta property="og:site_name" content="TMC" />

        {/* Twitter Card for better social preview */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="TMC - Task Management Core" />
        <meta
          name="twitter:description"
          content="A comprehensive task management system for software development teams."
        />
        <meta
          name="twitter:image"
          content="https://raw.githubusercontent.com/leonx04/tms-core/refs/heads/master/public/tmc.png"
        />
        {/* Google Analytics */}
        {GA_TRACKING_ID && (
          <>
            <Script strategy="afterInteractive" src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`} />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){window.dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_TRACKING_ID}', { page_path: window.location.pathname });
              `}
            </Script>
          </>
        )}
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <ThemeProvider defaultTheme="system">
            <AuthSessionManager />
            <LayoutWrapper>{children}</LayoutWrapper>
            <EnhancedToaster />
          </ThemeProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}

