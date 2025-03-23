/**
 * JWT Service - Handles all JWT token operations
 */

// Function to update token in localStorage and cookie
export const updateAuthToken = async (user: any): Promise<string | null> => {
  try {
    const token = await user.getIdToken(true) // Force refresh
    localStorage.setItem("jwt", token)

    // Set token expiry (1 hour instead of 30 minutes to reduce refreshes)
    const expiryTime = Date.now() + 60 * 60 * 1000
    localStorage.setItem("jwt_expiry", expiryTime.toString())

    // Also set token in cookie for middleware
    document.cookie = `jwt=${token}; path=/; max-age=${60 * 60}; SameSite=Strict; Secure`

    return token
  } catch (error) {
    console.error("Error getting token:", error)
    return null
  }
}

// Function to clear auth tokens
export const clearAuthTokens = (): void => {
  localStorage.removeItem("jwt")
  localStorage.removeItem("jwt_expiry")
  document.cookie = "jwt=; path=/; max-age=0; SameSite=Strict; Secure"
}

// Check if the JWT token is expired
export const checkTokenExpiry = (): boolean => {
  const expiryTime = localStorage.getItem("jwt_expiry")
  // If no expiry, consider it expired
  if (!expiryTime) return true
  // Check if token is expired
  return Date.now() > Number.parseInt(expiryTime)
}

