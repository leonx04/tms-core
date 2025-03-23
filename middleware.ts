import { jwtVerify } from "jose"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

// Secret key for JWT verification - should match your Firebase config
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key")

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes that don't require authentication
  const publicRoutes = [
    "/",
    "/login",
    "/register",
    "/reset-password",
    "/forgot-password",
    "/upgrade",
    // Footer pages
    "/roadmap",
    "/changelog",
    "/about",
    "/blog",
    "/careers",
    "/contact",
    "/terms",
    "/privacy",
    "/cookies",
  ]

  // Check if the route is public
  const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))

  // Skip middleware for static assets, API routes, and files
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/static/") ||
    pathname.startsWith("/api/webhooks/") || // Ensure webhooks are always allowed
    pathname.includes(".") // Skip files like favicon.ico, etc.
  ) {
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
      await jwtVerify(token, JWT_SECRET)
      return NextResponse.next()
    } catch (error) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }
  }

  // Get JWT from cookie only (not from Authorization header to avoid conflicts)
  const token = request.cookies.get("jwt")?.value

  let isValidToken = false

  if (token) {
    try {
      // Verify the token
      await jwtVerify(token, JWT_SECRET)
      isValidToken = true
    } catch (error) {
      // Token is invalid, we'll handle this below
      console.error("Token verification failed:", error)
    }
  }

  // If the route is not public and there's no valid token, redirect to login
  if (!isPublicRoute && !isValidToken) {
    const url = new URL("/login", request.url)
    // Use a special parameter to indicate this is a middleware redirect
    url.searchParams.set("callbackUrl", encodeURIComponent(pathname))
    url.searchParams.set("mw", "1") // Add a flag to indicate middleware redirect

    return NextResponse.redirect(url)
  }

  // If the user is authenticated and trying to access login/register, redirect to projects
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
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
  ],
}

