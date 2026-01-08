import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  providers: [],
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isAuthPage = nextUrl.pathname.startsWith("/auth")
      const isProtectedRoute =
        nextUrl.pathname.startsWith("/dashboard") ||
        nextUrl.pathname.startsWith("/chat") ||
        nextUrl.pathname.startsWith("/children") ||
        nextUrl.pathname.startsWith("/events")

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
