"use client"

import { useState, useEffect, useCallback } from "react"

interface ChatMessageProps {
  children: React.ReactNode
  variant?: "bot" | "user"
  autoSpeak?: boolean
  textContent?: string
  isNew?: boolean
}

// Helper function to convert URLs in text to clickable links
function linkifyText(text: string): React.ReactNode[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts = text.split(urlRegex)

  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline break-all"
        >
          {part}
        </a>
      )
    }
    return part
  })
}

export function ChatMessage({
  children,
  variant = "bot",
  autoSpeak = false,
  textContent,
  isNew = false
}: ChatMessageProps) {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    setIsSupported(typeof window !== "undefined" && "speechSynthesis" in window)
  }, [])

  // Auto-speak when message appears (only for bot messages)
  useEffect(() => {
    if (autoSpeak && variant === "bot" && textContent && isSupported) {
      speak()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSpeak, textContent, isSupported])

  const speak = useCallback(() => {
    if (!isSupported || !textContent) return

    // Cancel any ongoing speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(textContent)
    utterance.rate = 1.0
    utterance.pitch = 1.0
    utterance.volume = 1.0

    // Try to use a natural-sounding voice
    const voices = window.speechSynthesis.getVoices()
    const preferredVoice = voices.find(
      (voice) =>
        voice.lang.startsWith("en") &&
        (voice.name.includes("Natural") ||
          voice.name.includes("Samantha") ||
          voice.name.includes("Google") ||
          voice.name.includes("Microsoft"))
    ) || voices.find((voice) => voice.lang.startsWith("en"))

    if (preferredVoice) {
      utterance.voice = preferredVoice
    }

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    window.speechSynthesis.speak(utterance)
  }, [isSupported, textContent])

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
  }, [])

  const toggleSpeech = () => {
    if (isSpeaking) {
      stopSpeaking()
    } else {
      speak()
    }
  }

  const borderColor = variant === "bot" ? "border-tertiary" : "border-primary"

  // Alignment based on variant - bot on left, user on right
  const alignment = variant === "bot" ? "mr-auto" : "ml-auto"
  const maxWidth = "max-w-[85%]"

  return (
    <div className={`flex ${variant === "user" ? "justify-end" : "justify-start"}`}>
      <div
        className={`${maxWidth} ${alignment} rounded-2xl border ${borderColor} bg-white px-5 py-4 text-gray-800 shadow-sm`}
      >
        <div className="prose prose-sm max-w-none whitespace-pre-wrap">
          {typeof children === "string" ? linkifyText(children) : children}
        </div>

        {/* Speaker button for bot messages */}
        {variant === "bot" && textContent && isSupported && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={toggleSpeech}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors ${isSpeaking
                ? "bg-tertiary/20 text-tertiary"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              aria-label={isSpeaking ? "Stop speaking" : "Read aloud"}
            >
              {isSpeaking ? (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-4 w-4"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Stop
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-4 w-4"
                  >
                    <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 01-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
                    <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
                  </svg>
                  Listen
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
