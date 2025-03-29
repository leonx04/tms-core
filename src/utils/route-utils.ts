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
]

// Helper function to check if a route is public
export const isPublicRoute = (path: string): boolean => {
  // Always consider these paths as public regardless of what comes after
  const alwaysPublicPrefixes = ["/static/", "/_next/", "/images/", "/api/webhooks/", "/favicon.ico"]

  // Check if path starts with any always-public prefix
  for (const prefix of alwaysPublicPrefixes) {
    if (path.startsWith(prefix)) {
      return true
    }
  }

  // Check if path is in the public routes list
  return publicRoutes.some((route) => {
    // Exact match
    if (path === route) return true

    // Path starts with route/ (for nested routes)
    if (path.startsWith(`${route}/`)) return true

    return false
  })
}

