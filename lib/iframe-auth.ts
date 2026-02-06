/**
 * Utilities for handling authentication when the app is iframed
 */

export interface IframeUserData {
  id: string
  email: string
  name?: string | null
  image?: string | null
}

export interface IframeAuthMessage {
  type: "AUTH_USER_DATA"
  data: IframeUserData
  timestamp: number
}

/**
 * Checks if the application is running inside an iframe
 */
export function isInIframe(): boolean {
  if (typeof window === "undefined") return false
  return window.self !== window.top
}

/**
 * Sends a message to the parent window requesting user data
 */
export function requestUserDataFromParent(targetOrigin: string = "*"): void {
  if (typeof window === "undefined" || !isInIframe()) return

  window.parent.postMessage(
    {
      type: "REQUEST_USER_DATA",
      timestamp: Date.now(),
    },
    targetOrigin
  )
}

/**
 * Sets up a listener for user data from the parent window
 * @param callback Function to call when user data is received
 * @param allowedOrigins Array of allowed parent origins (for security)
 * @returns Cleanup function to remove the event listener
 */
export function listenForParentUserData(
  callback: (userData: IframeUserData) => void,
  allowedOrigins?: string[]
): () => void {
  if (typeof window === "undefined") return () => {}

  const handleMessage = (event: MessageEvent) => {
    // Security: Check origin if allowedOrigins is provided
    if (allowedOrigins && !allowedOrigins.includes(event.origin)) {
      console.warn("Received message from unauthorized origin:", event.origin)
      return
    }

    // Validate message structure
    if (!event.data || typeof event.data !== "object") return
    if (event.data.type !== "AUTH_USER_DATA") return

    const message = event.data as IframeAuthMessage

    // Validate user data
    if (!message.data || !message.data.id || !message.data.email) {
      console.error("Invalid user data received from parent")
      return
    }

    // Call the callback with validated user data
    callback(message.data)
  }

  window.addEventListener("message", handleMessage)

  // Return cleanup function
  return () => {
    window.removeEventListener("message", handleMessage)
  }
}

/**
 * Stores iframe user data in sessionStorage
 */
export function storeIframeUserData(userData: IframeUserData): void {
  if (typeof window === "undefined") return
  sessionStorage.setItem("iframe_user_data", JSON.stringify(userData))
}

/**
 * Retrieves iframe user data from sessionStorage
 */
export function getIframeUserData(): IframeUserData | null {
  if (typeof window === "undefined") return null
  const data = sessionStorage.getItem("iframe_user_data")
  if (!data) return null

  try {
    return JSON.parse(data) as IframeUserData
  } catch {
    return null
  }
}

/**
 * Clears iframe user data from sessionStorage
 */
export function clearIframeUserData(): void {
  if (typeof window === "undefined") return
  sessionStorage.removeItem("iframe_user_data")
}
