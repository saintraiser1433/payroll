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
      const adminRoutes = ["/employees", "/schedules", "/payroll", "/departments", "/benefits", "/holidays", "/salary-grades"]
      const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route))

      if (isAdminRoute && userRole !== "ADMIN") {
        // Redirect to appropriate dashboard based on role
        if (userRole === "DEPARTMENT_HEAD") {
          return NextResponse.redirect(new URL("/department-head-dashboard", req.url))
        } else {
          return NextResponse.redirect(new URL("/employee-dashboard", req.url))
        }
      }

      // Department head-only routes
      if (pathname.startsWith("/department-head-dashboard") && userRole !== "DEPARTMENT_HEAD") {
        if (userRole === "ADMIN") {
          return NextResponse.redirect(new URL("/", req.url))
        } else {
          return NextResponse.redirect(new URL("/employee-dashboard", req.url))
        }
      }

      // Employee-only routes
      if (pathname.startsWith("/employee-dashboard") && userRole !== "EMPLOYEE") {
        if (userRole === "ADMIN") {
          return NextResponse.redirect(new URL("/", req.url))
        } else {
          return NextResponse.redirect(new URL("/department-head-dashboard", req.url))
        }
      }

      // Redirect to appropriate dashboard based on role
      if (pathname === "/" && userRole !== "ADMIN") {
        if (userRole === "DEPARTMENT_HEAD") {
          return NextResponse.redirect(new URL("/department-head-dashboard", req.url))
        } else {
          return NextResponse.redirect(new URL("/employee-dashboard", req.url))
        }
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
     * - static files (images, etc.)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|logo.png|trop.jpg|placeholder).*)",
  ],
}

