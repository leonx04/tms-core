/**
 * Route Security Service - Handles route encryption/decryption and user ID obfuscation
 */
import { secureRoutes } from "@/config/secure-routes"

// Encrypt route
export const encryptRoute = (route: string): string => {
  return secureRoutes.encryptRoute(route)
}

// Decrypt route
export const decryptRoute = (encryptedRoute: string): string => {
  return secureRoutes.decryptRoute(encryptedRoute)
}

// Obscure user ID
export const obscureUserId = (userId: string, visibleChars = 4): string => {
  return secureRoutes.obscureUserId(userId, visibleChars)
}

