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
    return publicRoutes.some((route) => path === route || path.startsWith(`${route}/`))
  }
  
  