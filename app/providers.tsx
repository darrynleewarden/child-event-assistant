"use client"

import { SessionProvider } from "next-auth/react"
import { AutoSpeakProvider } from "@/app/contexts/AutoSpeakContext"
import { IframeAuthProvider } from "@/app/components/IframeAuthProvider"
import { useState, useEffect, useCallback } from "react"
import { getIframeUserData, isInIframe } from "@/lib/iframe-auth"

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
  const [iframeSession, setIframeSession] = useState<any>(null)

  useEffect(() => {
    // Check if we're in an iframe and have user data
    if (isInIframe()) {
      const userData = getIframeUserData()
      if (userData) {
        setIframeSession({
          user: userData,
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
      }
    }
  }, [])

  // Determine which session to use (priority: iframe > dev mock > undefined)
  const session = iframeSession || (isDevMode ? DEV_MOCK_SESSION : undefined)

  const handleUserDataReceived = useCallback((userData: any) => {
    // Update session when iframe user data is received
    setIframeSession({
      user: userData,
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
  }, [])

  return (
    <IframeAuthProvider
      allowedOrigins={process.env.NEXT_PUBLIC_ALLOWED_IFRAME_ORIGINS?.split(",")}
      onUserDataReceived={handleUserDataReceived}
    >
      <SessionProvider session={session}>
        <AutoSpeakProvider>{children}</AutoSpeakProvider>
      </SessionProvider>
    </IframeAuthProvider>
  )
}
