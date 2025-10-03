import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const isAuth = !!token
    const isAuthPage = req.nextUrl.pathname.startsWith("/auth")

    // If user is on auth page and already authenticated, redirect to dashboard
    if (isAuthPage && isAuth) {
      return NextResponse.redirect(new URL("/", req.url))
    }

    // If user is not authenticated and trying to access protected routes
    if (!isAuthPage && !isAuth) {
      return NextResponse.redirect(new URL("/auth/signin", req.url))
    }

    // Role-based access control
    if (isAuth && token) {
      const { pathname } = req.nextUrl
      const userRole = token.role

      // Admin-only routes
      const adminRoutes = ["/employees", "/schedules", "/payroll"]
      const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route))

      if (isAdminRoute && userRole !== "ADMIN") {
        return NextResponse.redirect(new URL("/employee-dashboard", req.url))
      }

      // Employee-only routes
      if (pathname.startsWith("/employee-dashboard") && userRole !== "EMPLOYEE") {
        return NextResponse.redirect(new URL("/", req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to auth pages without token
        if (req.nextUrl.pathname.startsWith("/auth")) {
          return true
        }
        // Require token for all other pages
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)",
  ],
}

