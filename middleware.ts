import { jwtVerify } from "jose"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

// Khóa bí mật cho xác minh JWT - nên khớp với cấu hình Firebase của bạn
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key")

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Các tuyến công khai không yêu cầu xác thực
  const publicRoutes = [
    "/",
    "/login",
    "/register",
    "/reset-password",
    "/forgot-password",
    "/upgrade",
    // Trang footer
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

  // Kiểm tra xem tuyến có phải là công khai không
  const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))

  // Bỏ qua middleware cho tài sản tĩnh, tuyến API và tệp
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/static/") ||
    pathname.startsWith("/api/webhooks/") || // Đảm bảo webhooks luôn được cho phép
    pathname.includes(".") // Bỏ qua các tệp như favicon.ico, v.v.
  ) {
    return NextResponse.next()
  }

  // Kiểm tra đặc biệt cho các tuyến API khác
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/webhooks/")) {
    // Cho phép các tuyến API khác nhưng vẫn kiểm tra JWT
    const token = request.cookies.get("jwt")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
      await jwtVerify(token, JWT_SECRET)
      return NextResponse.next()
    } catch (error) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }
  }

  // Lấy JWT từ cookie (không từ header Authorization để tránh xung đột)
  const token = request.cookies.get("jwt")?.value

  let isValidToken = false

  if (token) {
    try {
      // Xác minh token
      await jwtVerify(token, JWT_SECRET)
      isValidToken = true
    } catch (error) {
      // Token không hợp lệ, chúng ta sẽ xử lý bên dưới
      console.error("Xác minh token thất bại:", error)
    }
  }

  // Nếu tuyến không phải là công khai và không có token hợp lệ, chuyển hướng đến đăng nhập
  if (!isPublicRoute && !isValidToken) {
    const url = new URL("/login", request.url)
    // Sử dụng tham số đặc biệt để chỉ ra đây là chuyển hướng middleware
    url.searchParams.set("callbackUrl", encodeURIComponent(pathname))
    url.searchParams.set("mw", "1") // Thêm cờ để chỉ ra chuyển hướng middleware

    return NextResponse.redirect(url)
  }

  // Nếu người dùng đã xác thực và đang cố truy cập đăng nhập/đăng ký, chuyển hướng đến projects
  if (isValidToken && (pathname === "/login" || pathname === "/register" || pathname === "/forgot-password")) {
    return NextResponse.redirect(new URL("/projects", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Khớp tất cả các đường dẫn yêu cầu ngoại trừ những đường dẫn bắt đầu bằng:
     * - api (tuyến API)
     * - _next/static (tệp tĩnh)
     * - _next/image (tệp tối ưu hóa hình ảnh)
     * - favicon.ico (tệp favicon)
     * - public (tệp công khai)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
  ],
}

