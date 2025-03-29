// Define public routes that don't require authentication
export const publicRoutes = [
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
  // Add any additional public routes here
]

// Static assets and API routes that should always be accessible
export const alwaysPublicPrefixes = [
  "/static/",
  "/_next/",
  "/images/",
  "/api/webhooks/",
  "/favicon.ico",
  "/assets/",
  "/fonts/",
]

/**
 * Checks if a route is public and doesn't require authentication
 * @param path The path to check
 * @returns boolean indicating if the path is public
 */
export const isPublicRoute = (path: string): boolean => {
  // First check static assets and API routes
  for (const prefix of alwaysPublicPrefixes) {
    if (path.startsWith(prefix)) {
      return true
    }
  }

  // Check exact matches and nested routes
  for (const route of publicRoutes) {
    // Exact match
    if (path === route) return true

    // Path starts with route/ (for nested routes)
    if (path.startsWith(`${route}/`)) return true
  }

  // If we get here, the route is not public
  return false
}

/**
 * Checks if a route is a login-related route
 * @param path The path to check
 * @returns boolean indicating if the path is a login-related route
 */
export const isAuthRoute = (path: string): boolean => {
  const authRoutes = ["/login", "/register", "/forgot-password", "/reset-password"]
  return authRoutes.includes(path)
}

