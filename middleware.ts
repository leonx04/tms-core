import { jwtVerify } from "jose"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { isPublicRoute } from "@/utils/route-utils"

// Secret key for JWT verification - should match your Firebase config
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key")

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for static assets, API routes, and files
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/static/") ||
    pathname.startsWith("/api/webhooks/") || // Ensure webhooks are always allowed
    pathname.includes(".") // Skip files like favicon.ico, etc.
  ) {
    return NextResponse.next()
  }

  // Always allow access to public routes without authentication
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // Special check for other API routes
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/webhooks/")) {
    // Allow other API routes but still check JWT
    const token = request.cookies.get("jwt")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
      // Add specific try-catch for JWT
      await jwtVerify(token, JWT_SECRET)
      return NextResponse.next()
    } catch (error) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }
  }

  // Get JWT from cookie
  const token = request.cookies.get("jwt")?.value

  let isValidToken = false

  if (token) {
    try {
      // Verify token with short timeout to avoid hanging
      const verifyPromise = jwtVerify(token, JWT_SECRET)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("JWT verification timeout")), 2000),
      )

      await Promise.race([verifyPromise, timeoutPromise])
      isValidToken = true
    } catch (error) {
      // Invalid token, we'll handle below
    }
  }

  // If route is not public and no valid token, redirect to login
  if (!isValidToken) {
    const url = new URL("/login", request.url)
    // Use special parameter to indicate this is a middleware redirect
    url.searchParams.set("callbackUrl", encodeURIComponent(pathname))
    url.searchParams.set("mw", "1") // Add flag to indicate middleware redirect

    return NextResponse.redirect(url)
  }

  // If user is authenticated and trying to access login/register, redirect to projects
  if (isValidToken && (pathname === "/login" || pathname === "/register" || pathname === "/forgot-password")) {
    return NextResponse.redirect(new URL("/projects", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (optimized images)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
  ],
}

