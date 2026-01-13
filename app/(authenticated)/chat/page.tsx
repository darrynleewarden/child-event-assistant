"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { ChatMessage } from "@/app/components/chat/ChatMessage"
import { ChatInput } from "@/app/components/chat/ChatInput"
import { invokeBedrockAgent } from "@/lib/bedrock-api"
import { useAutoSpeak } from "@/app/contexts/AutoSpeakContext"

interface Message {
  id: string
  content: string
  variant: "bot" | "user"
  timestamp: Date
  isNew?: boolean
}

export default function ChatPage() {
  const { data: session } = useSession()
  const { autoSpeak } = useAutoSpeak()
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
  const [chatSessionId, setChatSessionId] = useState<string>()
  const [error, setError] = useState<string>()

  const addBotMessage = (content: string) => {
    const botMessage: Message = {
      id: `bot-${Date.now()}`,
      content,
      variant: "bot",
      timestamp: new Date(),
      isNew: true,
    }

    setMessages((prev) => [...prev, botMessage])

    setTimeout(() => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMessage.id ? { ...msg, isNew: false } : msg
        )
      )
    }, 100)

    return botMessage
  }

  const handleSend = async (message: string) => {
    if (!message.trim() || isLoading) return

    // Add user message
    setMessages((prev) => [...prev, {
      id: `user-${Date.now()}`,
      content: message,
      variant: "user",
      timestamp: new Date(),
    }])

    setIsLoading(true)
    setError(undefined)

    try {
      // Get user context from session
      const userContext = session?.user?.id ? {
        userId: session.user.id,
        email: session.user.email || undefined,
        name: session.user.name || undefined,
      } : undefined

      const response = await invokeBedrockAgent(message, chatSessionId, userContext)

      if (response.sessionId && !chatSessionId) {
        setChatSessionId(response.sessionId)
      }

      addBotMessage(response.message)
    } catch (err) {
      console.error("Error sending message:", err)
      const errorMessage =
        err instanceof Error ? err.message : "Failed to send message"
      setError(errorMessage)
      addBotMessage(`Sorry, I encountered an error: ${errorMessage}. Please try again.`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <div className="space-y-4">
          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              variant={msg.variant}
              textContent={msg.content}
              autoSpeak={autoSpeak && msg.isNew && msg.variant === "bot"}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </ChatMessage>
          ))}

          {isLoading && (
            <ChatMessage variant="bot">
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 animate-bounce rounded-full bg-tertiary"></div>
                <div className="h-2 w-2 animate-bounce rounded-full bg-tertiary" style={{ animationDelay: "0.1s" }}></div>
                <div className="h-2 w-2 animate-bounce rounded-full bg-tertiary" style={{ animationDelay: "0.2s" }}></div>
              </div>
            </ChatMessage>
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
      <div className="border-t border-gray-100 bg-white">
        <div className="mx-auto w-full max-w-3xl px-4 py-4">
          <ChatInput
            onSend={handleSend}
            placeholder="Enter text here"
          />
        </div>
      </div>
    </div>
  )
}
