/**
 * JWT Service - Manages all JWT token related operations
 */

const AUTH_TOKEN_KEY = "auth_token"
const AUTH_TOKEN_EXPIRY_KEY = "auth_token_expiry"
const AUTH_SESSION_VALID_KEY = "auth_session_valid"
const AUTH_LAST_ACTIVITY_KEY = "auth_last_activity"
const AUTH_SESSION_START_KEY = "auth_session_start"

// Update token in localStorage and cookie
export const updateAuthToken = async (user: any): Promise<string | null> => {
  try {
    const token = await user.getIdToken(true) // Force token refresh

    // Check if token is valid before saving
    if (!token) {
      console.error("Token is invalid or empty")
      return null
    }

    // Save token to localStorage
    localStorage.setItem(AUTH_TOKEN_KEY, token)

    // Set expiry time (1 hour instead of 30 minutes to reduce refresh frequency)
    const expiryTime = Date.now() + 60 * 60 * 1000
    localStorage.setItem(AUTH_TOKEN_EXPIRY_KEY, expiryTime.toString())

    // Set last activity time
    localStorage.setItem(AUTH_LAST_ACTIVITY_KEY, Date.now().toString())

    // Mark login session as valid
    setAuthSessionValid()

    // Set token in cookie for middleware with SameSite and Secure
    document.cookie = `jwt=${token}; path=/; max-age=${60 * 60}; SameSite=Strict; Secure`

    return token
  } catch (error) {
    console.error("Error getting token:", error)
    return null
  }
}

// Clear all authentication tokens
export const clearAuthTokens = (): void => {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(AUTH_TOKEN_EXPIRY_KEY)
    localStorage.removeItem(AUTH_SESSION_VALID_KEY)
    localStorage.removeItem(AUTH_LAST_ACTIVITY_KEY)
    localStorage.removeItem(AUTH_SESSION_START_KEY)

    // Clear JWT cookie
    document.cookie = "jwt=; path=/; max-age=0; SameSite=Strict; Secure"

    // Dispatch event to sync between tabs
    window.dispatchEvent(new Event("auth_logout"))
  } catch (error) {
    console.error("Error clearing tokens:", error)
  }
}

// Check if JWT token has expired
export const checkTokenExpiry = (): boolean => {
  try {
    const expiryTime = localStorage.getItem(AUTH_TOKEN_EXPIRY_KEY)
    // If no expiry time, consider expired
    if (!expiryTime) return true
    // Check if token has expired
    return Date.now() > Number.parseInt(expiryTime)
  } catch (error) {
    console.error("Error checking token expiry:", error)
    return true // Consider expired if error
  }
}

// Set flag indicating authentication session is valid
export const setAuthSessionValid = (): void => {
  try {
    localStorage.setItem(AUTH_SESSION_VALID_KEY, "true")

    // Set session start time if not already set
    if (!localStorage.getItem(AUTH_SESSION_START_KEY)) {
      localStorage.setItem(AUTH_SESSION_START_KEY, Date.now().toString())
    }

    // Update last activity time
    updateLastActivity()

    // Dispatch event to sync between tabs
    window.dispatchEvent(new Event("auth_session_update"))
  } catch (error) {
    console.error("Error setting valid session:", error)
  }
}

// Update last activity time
export const updateLastActivity = (): void => {
  try {
    localStorage.setItem(AUTH_LAST_ACTIVITY_KEY, Date.now().toString())
  } catch (error) {
    console.error("Error updating last activity time:", error)
  }
}

// Check if authentication session is marked as valid
export const isAuthSessionValid = (): boolean => {
  try {
    // Check valid session flag
    const isValid = localStorage.getItem(AUTH_SESSION_VALID_KEY) === "true"

    if (!isValid) return false

    // Check inactivity time
    const lastActivity = localStorage.getItem(AUTH_LAST_ACTIVITY_KEY)
    if (lastActivity) {
      const inactiveTime = Date.now() - Number.parseInt(lastActivity)
      // Logout after 8 hours of inactivity
      const maxInactiveTime = 8 * 60 * 60 * 1000
      if (inactiveTime > maxInactiveTime) {
        clearAuthTokens()
        return false
      }
    }

    // Check total session time
    const sessionStart = localStorage.getItem(AUTH_SESSION_START_KEY)
    if (sessionStart) {
      const sessionDuration = Date.now() - Number.parseInt(sessionStart)
      // Force logout after 7 days from session start
      const maxSessionDuration = 7 * 24 * 60 * 60 * 1000
      if (sessionDuration > maxSessionDuration) {
        clearAuthTokens()
        return false
      }
    }

    return true
  } catch (error) {
    console.error("Error checking valid session:", error)
    return false // Consider invalid if error
  }
}

// Check and refresh session when returning to website
export const validateSessionOnReturn = (): boolean => {
  try {
    // Check if token exists
    const token = localStorage.getItem(AUTH_TOKEN_KEY)
    if (!token) return false

    // Check session validity
    if (!isAuthSessionValid()) {
      clearAuthTokens()
      return false
    }

    // Check token expiry
    if (checkTokenExpiry()) {
      // Token has expired, but we'll let the refresh process handle it
      return false
    }

    // Update activity time
    updateLastActivity()
    return true
  } catch (error) {
    console.error("Error validating session:", error)
    return false
  }
}

// Sync login state between tabs
export const setupAuthSyncBetweenTabs = (onLogout: () => void, onSessionUpdate: () => void): (() => void) => {
  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === AUTH_TOKEN_KEY && event.newValue === null) {
      // Token was removed in another tab
      onLogout()
    }
  }

  const handleLogoutEvent = () => {
    onLogout()
  }

  const handleSessionUpdateEvent = () => {
    onSessionUpdate()
  }

  // Listen for storage events
  window.addEventListener("storage", handleStorageChange)

  // Listen for custom events
  window.addEventListener("auth_logout", handleLogoutEvent)
  window.addEventListener("auth_session_update", handleSessionUpdateEvent)

  // Return cleanup function
  return () => {
    window.removeEventListener("storage", handleStorageChange)
    window.removeEventListener("auth_logout", handleLogoutEvent)
    window.removeEventListener("auth_session_update", handleSessionUpdateEvent)
  }
}

// Get current token from localStorage
export const getCurrentToken = (): string | null => {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY)
  } catch (error) {
    console.error("Error getting current token:", error)
    return null
  }
}

