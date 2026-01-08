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
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      content:
        "Hello! I'm your Child Event Assistant. I can help you log and manage child events like meals, sleep, activities, and more. How can I help you today?",
      variant: "bot",
      timestamp: new Date(),
    },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string>()
  const [error, setError] = useState<string>()

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
      }

      setMessages((prev) => [...prev, botMessage])
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
      <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <div className="space-y-6">
          {messages.map((msg) => (
            <div key={msg.id}>
              <ChatMessage variant={msg.variant}>
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
