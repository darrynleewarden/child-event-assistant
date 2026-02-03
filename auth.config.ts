import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  providers: [],
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      // DEV MODE: Bypass all auth checks
      if (process.env.NEXT_PUBLIC_DEV === "true") {
        console.log("[DEV MODE] Bypassing authorization check for:", nextUrl.pathname)
        return true
      }

      // PRODUCTION MODE: Original logic
      const isLoggedIn = !!auth?.user
      const isAuthPage = nextUrl.pathname.startsWith("/auth")
      const isProtectedRoute =
        nextUrl.pathname.startsWith("/dashboard") ||
        nextUrl.pathname.startsWith("/chat") ||
        nextUrl.pathname.startsWith("/children") ||
        nextUrl.pathname.startsWith("/events") ||
        nextUrl.pathname.startsWith("/reports")

      // Redirect logged-in users away from auth pages
      if (isLoggedIn && isAuthPage) {
        return Response.redirect(new URL("/dashboard", nextUrl))
      }

      // Protect authenticated routes
      if (isProtectedRoute && !isLoggedIn) {
        return false // Will redirect to sign-in page
      }

      return true
    },
  },
} satisfies NextAuthConfig
