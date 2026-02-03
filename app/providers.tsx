"use client"

import { SessionProvider } from "next-auth/react"
import { AutoSpeakProvider } from "@/app/contexts/AutoSpeakContext"

// Mock session for client-side dev mode
const DEV_MOCK_SESSION = {
  user: {
    id: "dev-user-mock-id",
    email: "dev@example.com",
    name: "Development User",
    image: null,
  },
  expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
}

export function Providers({ children }: { children: React.ReactNode }) {
  const isDevMode = process.env.NEXT_PUBLIC_DEV === "true"

  return (
    <SessionProvider session={isDevMode ? DEV_MOCK_SESSION : undefined}>
      <AutoSpeakProvider>{children}</AutoSpeakProvider>
    </SessionProvider>
  )
}
