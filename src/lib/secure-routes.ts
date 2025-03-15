import { AES, enc } from "crypto-js"

/**
 * Utility for handling secure routes and sensitive information
 */
export const secureRoutes = {
  /**
   * Encrypts a route path for secure redirects
   * @param route The route to encrypt
   * @returns Encrypted route string
   */
  encryptRoute: (route: string): string => {
    const secretKey = process.env.NEXT_PUBLIC_ROUTE_SECRET || "default-secret-key"
    return encodeURIComponent(AES.encrypt(route, secretKey).toString())
  },

  /**
   * Decrypts an encrypted route path
   * @param encryptedRoute The encrypted route string
   * @returns Decrypted route path
   */
  decryptRoute: (encryptedRoute: string): string => {
    try {
      const secretKey = process.env.NEXT_PUBLIC_ROUTE_SECRET || "default-secret-key"
      const bytes = AES.decrypt(decodeURIComponent(encryptedRoute), secretKey)
      return bytes.toString(enc.Utf8)
    } catch (error) {
      console.error("Error decrypting route:", error)
      return "/"
    }
  },

  /**
   * Obscures part of a user ID for display purposes
   * @param userId The full user ID
   * @param visibleChars Number of characters to show at beginning and end
   * @returns Partially obscured user ID
   */
  obscureUserId: (userId: string, visibleChars = 4): string => {
    if (!userId || userId.length <= visibleChars * 2) {
      return userId
    }

    const prefix = userId.substring(0, visibleChars)
    const suffix = userId.substring(userId.length - visibleChars)
    const obscuredLength = userId.length - visibleChars * 2
    const obscured = "*".repeat(obscuredLength)

    return `${prefix}${obscured}${suffix}`
  },

  /**
   * Validates if a user has access to a specific route
   * @param userId The user ID
   * @param routePath The route path to check
   * @returns Boolean indicating if access is allowed
   */
  validateRouteAccess: (userId: string | null, routePath: string): boolean => {
    // Public routes that don't require authentication
    const publicRoutes = ["/login", "/signup", "/reset-password", "/upgrade", "/"]

    if (publicRoutes.includes(routePath)) {
      return true
    }

    // All other routes require authentication
    return !!userId
  },
}

