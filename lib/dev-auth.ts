import { auth as nextAuth } from "@/auth"

// Mock session for development mode
const DEV_MOCK_SESSION = {
  user: {
    id: "dev-user-mock-id",
    email: "dev@example.com",
    name: "Development User",
    image: null,
  },
  expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
}

/**
 * Development-aware auth wrapper
 * Returns mock session when NEXT_PUBLIC_DEV=true, otherwise returns real session
 */
export async function auth() {
  // Check if we're in dev bypass mode
  const isDevMode = process.env.NEXT_PUBLIC_DEV === "true"

  // Safety check: prevent dev mode in production
  if (isDevMode && process.env.NODE_ENV === "production") {
    console.error(
      "CRITICAL: NEXT_PUBLIC_DEV is enabled in production! Falling back to real auth."
    )
    return nextAuth()
  }

  if (isDevMode) {
    console.log("[DEV MODE] Using mock authentication session")
    return DEV_MOCK_SESSION
  }

  // Production mode - use real NextAuth
  return nextAuth()
}
