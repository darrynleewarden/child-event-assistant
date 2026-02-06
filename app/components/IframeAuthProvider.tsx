"use client"

import { useEffect, useState } from "react"
import {
  isInIframe,
  requestUserDataFromParent,
  listenForParentUserData,
  storeIframeUserData,
  getIframeUserData,
  type IframeUserData,
} from "@/lib/iframe-auth"

interface IframeAuthProviderProps {
  children: React.ReactNode
  /**
   * Array of allowed parent origins for security
   * Leave undefined to allow all origins (less secure)
   * Example: ["https://parent-app.com", "https://staging.parent-app.com"]
   */
  allowedOrigins?: string[]
  /**
   * Callback when user data is received from parent
   */
  onUserDataReceived?: (userData: IframeUserData) => void
  /**
   * Whether to automatically request user data on mount
   * @default true
   */
  autoRequest?: boolean
}

export function IframeAuthProvider({
  children,
  allowedOrigins,
  onUserDataReceived,
  autoRequest = true,
}: IframeAuthProviderProps) {
  const [isIframed, setIsIframed] = useState(false)
  const [userData, setUserData] = useState<IframeUserData | null>(null)

  useEffect(() => {
    // Check if we're in an iframe
    const inIframe = isInIframe()
    setIsIframed(inIframe)

    if (!inIframe) return

    // Check if we already have user data in sessionStorage
    const existingData = getIframeUserData()
    if (existingData) {
      setUserData(existingData)
      onUserDataReceived?.(existingData)
      return
    }

    // Request user data from parent if autoRequest is enabled
    if (autoRequest) {
      requestUserDataFromParent()
    }

    // Listen for user data from parent
    const cleanup = listenForParentUserData((data) => {
      console.log("Received user data from parent:", data)
      setUserData(data)
      storeIframeUserData(data)
      onUserDataReceived?.(data)
    }, allowedOrigins)

    return cleanup
  }, [allowedOrigins, onUserDataReceived, autoRequest])

  // Expose iframe state via data attributes for debugging
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute(
        "data-is-iframed",
        isIframed ? "true" : "false"
      )
      document.documentElement.setAttribute(
        "data-has-iframe-user",
        userData ? "true" : "false"
      )
    }
  }, [isIframed, userData])

  return <>{children}</>
}
