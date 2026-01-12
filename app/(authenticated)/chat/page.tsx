"use client"

import { useState } from "react"
import { ChatMessage } from "@/app/components/chat/ChatMessage"
import { ChatInput } from "@/app/components/chat/ChatInput"
import { invokeBedrockAgent } from "@/lib/bedrock-api"

interface Message {
  id: string
  content: string
  variant: "bot" | "user"
  timestamp: Date
  isNew?: boolean
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      content:
        "Hello! I'm your Child Event Assistant. I can help you log and manage child events like meals, sleep, activities, and more. How can I help you today?",
      variant: "bot",
      timestamp: new Date(),
      isNew: false,
    },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string>()
  const [error, setError] = useState<string>()
  const [autoSpeak, setAutoSpeak] = useState(false)

  const handleSend = async (message: string) => {
    if (!message.trim() || isLoading) return

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: message,
      variant: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)
    setError(undefined)

    try {
      // Call Bedrock API
      const response = await invokeBedrockAgent(message, sessionId)

      // Update session ID if provided
      if (response.sessionId && !sessionId) {
        setSessionId(response.sessionId)
      }

      // Add bot response
      const botMessage: Message = {
        id: `bot-${Date.now()}`,
        content: response.message,
        variant: "bot",
        timestamp: new Date(),
        isNew: true,
      }

      setMessages((prev) => [...prev, botMessage])

      // Mark message as not new after a short delay
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMessage.id ? { ...msg, isNew: false } : msg
          )
        )
      }, 100)
    } catch (err) {
      console.error("Error sending message:", err)
      const errorMessage =
        err instanceof Error ? err.message : "Failed to send message"
      setError(errorMessage)

      // Add error message to chat
      const errorBotMessage: Message = {
        id: `error-${Date.now()}`,
        content: `Sorry, I encountered an error: ${errorMessage}. Please try again.`,
        variant: "bot",
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, errorBotMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Auto-speak toggle */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-2">
          <h1 className="text-lg font-semibold text-gray-800">Chat</h1>
          <button
            onClick={() => setAutoSpeak(!autoSpeak)}
            className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors ${autoSpeak
                ? "bg-purple-100 text-purple-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            aria-label={autoSpeak ? "Disable auto-speak" : "Enable auto-speak"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 01-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
              <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
            </svg>
            Auto-speak {autoSpeak ? "On" : "Off"}
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <div className="space-y-6">
          {messages.map((msg) => (
            <div key={msg.id}>
              <ChatMessage
                variant={msg.variant}
                textContent={msg.content}
                autoSpeak={autoSpeak && msg.isNew && msg.variant === "bot"}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </ChatMessage>
            </div>
          ))}

          {isLoading && (
            <div>
              <ChatMessage variant="bot">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-purple-500"></div>
                  <div
                    className="h-2 w-2 animate-bounce rounded-full bg-purple-500"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="h-2 w-2 animate-bounce rounded-full bg-purple-500"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
              </ChatMessage>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
              <p className="font-medium">Error: {error}</p>
              <p className="mt-1 text-xs">
                Make sure NEXT_PUBLIC_BEDROCK_API_URL is configured in your
                .env file
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Fixed Input at Bottom */}
      <div className="border-t border-gray-200 bg-white">
        <div className="mx-auto w-full max-w-4xl px-4 py-4">
          <ChatInput onSend={handleSend} placeholder="Type your message..." />
        </div>
      </div>
    </div>
  )
}
