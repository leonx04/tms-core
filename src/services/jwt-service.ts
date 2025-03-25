/**
 * JWT Service - Handles all JWT token operations
 */

// Update token in localStorage and cookie
export const updateAuthToken = async (user: any): Promise<string | null> => {
  try {
    const token = await user.getIdToken(true) // Force refresh
    localStorage.setItem("jwt", token)

    // Set token expiry (1 hour instead of 30 minutes to reduce refreshes)
    const expiryTime = Date.now() + 60 * 60 * 1000
    localStorage.setItem("jwt_expiry", expiryTime.toString())

    // Set last activity time
    localStorage.setItem("last_activity", Date.now().toString())

    // Mark the session as valid
    setAuthSessionValid()

    // Set token in cookie for middleware
    document.cookie = `jwt=${token}; path=/; max-age=${60 * 60}; SameSite=Strict; Secure`

    return token
  } catch (error) {
    console.error("Error getting token:", error)
    return null
  }
}

// Clear all auth tokens
export const clearAuthTokens = (): void => {
  localStorage.removeItem("jwt")
  localStorage.removeItem("jwt_expiry")
  localStorage.removeItem("auth_session_valid")
  localStorage.removeItem("last_activity")
  localStorage.removeItem("session_start")
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

// Set a flag indicating the auth session is valid
export const setAuthSessionValid = (): void => {
  localStorage.setItem("auth_session_valid", "true")

  // Set session start time if not already set
  if (!localStorage.getItem("session_start")) {
    localStorage.setItem("session_start", Date.now().toString())
  }

  // Update last activity time
  updateLastActivity()
}

// Update last activity time
export const updateLastActivity = (): void => {
  localStorage.setItem("last_activity", Date.now().toString())
}

// Check if the auth session is marked as valid
export const isAuthSessionValid = (): boolean => {
  // Check session valid flag
  const isValid = localStorage.getItem("auth_session_valid") === "true"

  if (!isValid) return false

  // Check inactivity time
  const lastActivity = localStorage.getItem("last_activity")
  if (lastActivity) {
    const inactiveTime = Date.now() - Number.parseInt(lastActivity)
    // Log out after 24 hours of inactivity
    const maxInactiveTime = 24 * 60 * 60 * 1000
    if (inactiveTime > maxInactiveTime) {
      clearAuthTokens()
      return false
    }
  }

  // Check total session duration
  const sessionStart = localStorage.getItem("session_start")
  if (sessionStart) {
    const sessionDuration = Date.now() - Number.parseInt(sessionStart)
    // Force logout after 7 days from session start
    const maxSessionDuration = 15 * 60 * 1000
    if (sessionDuration > maxSessionDuration) {
      clearAuthTokens()
      return false
    }
  }

  return true
}

// Check and refresh session when returning to the website
export const validateSessionOnReturn = (): boolean => {
  // Check if token exists
  const token = localStorage.getItem("jwt")
  if (!token) return false

  // Check session validity
  if (!isAuthSessionValid()) {
    clearAuthTokens()
    return false
  }

  // Check token expiry
  if (checkTokenExpiry()) {
    // Token is expired, but we'll let the refresh process handle it
    // in auth-context or auth-session-manager
    return false
  }

  // Update activity time
  updateLastActivity()
  return true
}

