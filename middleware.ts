import { jwtVerify } from "jose"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

// Secret key for JWT verification - should match your Firebase config
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key")

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes that don't require authentication
  const publicRoutes = ["/", "/login", "/register", "/reset-password", "/forgot-password", "/upgrade"]

  // Check if the route is public
  const isPublicRoute = publicRoutes.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  )

  // Get JWT from Authorization header or cookie
  const authHeader = request.headers.get("authorization")
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7)
    : request.cookies.get("jwt")?.value

  let isValidToken = false

  if (token) {
    try {
      // Verify the token
      await jwtVerify(token, JWT_SECRET)
      isValidToken = true
    } catch (error) {
      console.error("Token verification failed:", error)
      // Token is invalid, we'll handle this below
    }
  }

  // If the route is not public and there's no valid token, redirect to login
  if (!isPublicRoute && !isValidToken) {
    const url = new URL("/login", request.url)
    url.searchParams.set("callbackUrl", encodeURIComponent(pathname))

    // Create a response with a redirect
    const response = NextResponse.redirect(url)

    // Add a header to indicate authentication is required (for client-side handling)
    response.headers.set("X-Auth-Required", "true")

    return response
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
