/**
 * JWT Service - Quản lý tất cả các hoạt động liên quan đến token JWT
 */

// Cập nhật token trong localStorage và cookie
export const updateAuthToken = async (user: any): Promise<string | null> => {
  try {
    const token = await user.getIdToken(true) // Buộc làm mới token

    // Lưu token vào localStorage
    localStorage.setItem("auth_token", token)

    // Thiết lập thời gian hết hạn (1 giờ thay vì 30 phút để giảm số lần làm mới)
    const expiryTime = Date.now() + 60 * 60 * 1000
    localStorage.setItem("auth_token_expiry", expiryTime.toString())

    // Thiết lập thời gian hoạt động cuối cùng
    localStorage.setItem("auth_last_activity", Date.now().toString())

    // Đánh dấu phiên đăng nhập là hợp lệ
    setAuthSessionValid()

    // Thiết lập token trong cookie cho middleware
    document.cookie = `jwt=${token}; path=/; max-age=${60 * 60}; SameSite=Strict; Secure`

    return token
  } catch (error) {
    console.error("Lỗi khi lấy token:", error)
    return null
  }
}

// Xóa tất cả các token xác thực
export const clearAuthTokens = (): void => {
  localStorage.removeItem("auth_token")
  localStorage.removeItem("auth_token_expiry")
  localStorage.removeItem("auth_session_valid")
  localStorage.removeItem("auth_last_activity")
  localStorage.removeItem("auth_session_start")

  // Xóa cookie JWT
  document.cookie = "jwt=; path=/; max-age=0; SameSite=Strict; Secure"

  // Phát sự kiện để đồng bộ hóa giữa các tab
  try {
    window.dispatchEvent(new Event("auth_logout"))
  } catch (error) {
    console.error("Lỗi khi phát sự kiện logout:", error)
  }
}

// Kiểm tra xem token JWT có hết hạn không
export const checkTokenExpiry = (): boolean => {
  const expiryTime = localStorage.getItem("auth_token_expiry")
  // Nếu không có thời gian hết hạn, coi như đã hết hạn
  if (!expiryTime) return true
  // Kiểm tra xem token có hết hạn không
  return Date.now() > Number.parseInt(expiryTime)
}

// Thiết lập cờ chỉ ra rằng phiên xác thực là hợp lệ
export const setAuthSessionValid = (): void => {
  localStorage.setItem("auth_session_valid", "true")

  // Thiết lập thời gian bắt đầu phiên nếu chưa được thiết lập
  if (!localStorage.getItem("auth_session_start")) {
    localStorage.setItem("auth_session_start", Date.now().toString())
  }

  // Cập nhật thời gian hoạt động cuối cùng
  updateLastActivity()

  // Phát sự kiện để đồng bộ hóa giữa các tab
  try {
    window.dispatchEvent(new Event("auth_session_update"))
  } catch (error) {
    console.error("Lỗi khi phát sự kiện cập nhật phiên:", error)
  }
}

// Cập nhật thời gian hoạt động cuối cùng
export const updateLastActivity = (): void => {
  localStorage.setItem("auth_last_activity", Date.now().toString())
}

// Kiểm tra xem phiên xác thực có được đánh dấu là hợp lệ không
export const isAuthSessionValid = (): boolean => {
  // Kiểm tra cờ phiên hợp lệ
  const isValid = localStorage.getItem("auth_session_valid") === "true"

  if (!isValid) return false

  // Kiểm tra thời gian không hoạt động
  const lastActivity = localStorage.getItem("auth_last_activity")
  if (lastActivity) {
    const inactiveTime = Date.now() - Number.parseInt(lastActivity)
    // Đăng xuất sau 8 giờ không hoạt động
    const maxInactiveTime = 8 * 60 * 60 * 1000
    if (inactiveTime > maxInactiveTime) {
      clearAuthTokens()
      return false
    }
  }

  // Kiểm tra tổng thời gian phiên
  const sessionStart = localStorage.getItem("auth_session_start")
  if (sessionStart) {
    const sessionDuration = Date.now() - Number.parseInt(sessionStart)
    // Buộc đăng xuất sau 7 ngày kể từ khi bắt đầu phiên
    const maxSessionDuration = 7 * 24 * 60 * 60 * 1000
    if (sessionDuration > maxSessionDuration) {
      clearAuthTokens()
      return false
    }
  }

  return true
}

// Kiểm tra và làm mới phiên khi quay lại trang web
export const validateSessionOnReturn = (): boolean => {
  // Kiểm tra xem token có tồn tại không
  const token = localStorage.getItem("auth_token")
  if (!token) return false

  // Kiểm tra tính hợp lệ của phiên
  if (!isAuthSessionValid()) {
    clearAuthTokens()
    return false
  }

  // Kiểm tra thời gian hết hạn của token
  if (checkTokenExpiry()) {
    // Token đã hết hạn, nhưng chúng ta sẽ để quá trình làm mới xử lý nó
    // trong auth-context hoặc auth-session-manager
    return false
  }

  // Cập nhật thời gian hoạt động
  updateLastActivity()
  return true
}

// Đồng bộ hóa trạng thái đăng nhập giữa các tab
export const setupAuthSyncBetweenTabs = (onLogout: () => void, onSessionUpdate: () => void): (() => void) => {
  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === "auth_token" && event.newValue === null) {
      // Token đã bị xóa trong tab khác
      onLogout()
    }
  }

  const handleLogoutEvent = () => {
    onLogout()
  }

  const handleSessionUpdateEvent = () => {
    onSessionUpdate()
  }

  // Lắng nghe sự kiện storage
  window.addEventListener("storage", handleStorageChange)

  // Lắng nghe sự kiện tùy chỉnh
  window.addEventListener("auth_logout", handleLogoutEvent)
  window.addEventListener("auth_session_update", handleSessionUpdateEvent)

  // Trả về hàm dọn dẹp
  return () => {
    window.removeEventListener("storage", handleStorageChange)
    window.removeEventListener("auth_logout", handleLogoutEvent)
    window.removeEventListener("auth_session_update", handleSessionUpdateEvent)
  }
}

// Lấy token hiện tại từ localStorage
export const getCurrentToken = (): string | null => {
  return localStorage.getItem("auth_token")
}

