"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
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

interface ReportingChatProps {
    initialContext?: string
}

export function ReportingChat({ initialContext }: ReportingChatProps) {
    const { data: session } = useSession()
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome",
            content: initialContext ||
                "Hello! I'm your Reporting Assistant. I can help you generate comprehensive reports in various formats (Excel, CSV, PDF). " +
                "I can create daily, weekly, monthly, or custom reports for events, bookings, children, and more. What type of report would you like to generate?",
            variant: "bot",
            timestamp: new Date(),
            isNew: false,
        },
    ])
    const [isLoading, setIsLoading] = useState(false)
    const [chatSessionId, setChatSessionId] = useState<string>()
    const [error, setError] = useState<string>()
    const [isExpanded, setIsExpanded] = useState(false)

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
        setMessages((prev) => [
            ...prev,
            {
                id: `user-${Date.now()}`,
                content: message,
                variant: "user",
                timestamp: new Date(),
            },
        ])

        setIsLoading(true)
        setError(undefined)

        try {
            // Get user context from session
            const userContext = session?.user?.id
                ? {
                    userId: session.user.id,
                    email: session.user.email || undefined,
                    name: session.user.name || undefined,
                }
                : undefined

            const response = await invokeBedrockAgent(
                message,
                chatSessionId,
                userContext
            )

            if (response.sessionId && !chatSessionId) {
                setChatSessionId(response.sessionId)
            }

            addBotMessage(response.message)
        } catch (err) {
            console.error("Error sending message:", err)
            const errorMessage =
                err instanceof Error ? err.message : "Failed to send message"
            setError(errorMessage)
            addBotMessage(
                `Sorry, I encountered an error: ${errorMessage}. Please try again.`
            )
        } finally {
            setIsLoading(false)
        }
    }

    const handleQuickAction = (action: string) => {
        handleSend(action)
    }

    return (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            {/* Header */}
            <div
                className="flex cursor-pointer items-center justify-between border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white">
                        <svg
                            className="h-6 w-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                        </svg>
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">
                            AI Reporting Assistant
                        </h3>
                        <p className="text-sm text-gray-600">
                            Generate reports in Excel, CSV, or PDF format
                        </p>
                    </div>
                </div>
                <button
                    className="text-gray-600 hover:text-gray-900"
                    onClick={(e) => {
                        e.stopPropagation()
                        setIsExpanded(!isExpanded)
                    }}
                >
                    <svg
                        className={`h-5 w-5 transition-transform ${isExpanded ? "rotate-180" : ""
                            }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                        />
                    </svg>
                </button>
            </div>

            {/* Chat Content */}
            {isExpanded && (
                <div className="flex flex-col">
                    {/* Quick Actions */}
                    <div className="border-b border-gray-200 bg-gray-50 p-3">
                        <p className="mb-2 text-xs font-semibold text-gray-600">
                            Quick Actions:
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() =>
                                    handleQuickAction("Generate a daily report for today")
                                }
                                className="rounded-full bg-white px-3 py-1 text-xs text-gray-700 shadow-sm hover:bg-gray-100"
                            >
                                📊 Daily Report
                            </button>
                            <button
                                onClick={() =>
                                    handleQuickAction("Generate a weekly report for this week")
                                }
                                className="rounded-full bg-white px-3 py-1 text-xs text-gray-700 shadow-sm hover:bg-gray-100"
                            >
                                📅 Weekly Report
                            </button>
                            <button
                                onClick={() =>
                                    handleQuickAction("Generate a monthly report for this month")
                                }
                                className="rounded-full bg-white px-3 py-1 text-xs text-gray-700 shadow-sm hover:bg-gray-100"
                            >
                                📈 Monthly Report
                            </button>
                            <button
                                onClick={() =>
                                    handleQuickAction("Create an Excel report of all children")
                                }
                                className="rounded-full bg-white px-3 py-1 text-xs text-gray-700 shadow-sm hover:bg-gray-100"
                            >
                                👶 Children Report
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="h-96 space-y-4 overflow-y-auto p-4">
                        {messages.map((msg) => (
                            <ChatMessage
                                key={msg.id}
                                variant={msg.variant}
                                isNew={msg.isNew}
                            >
                                {msg.content}
                            </ChatMessage>
                        ))}
                        {isLoading && (
                            <ChatMessage variant="bot">
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 animate-bounce rounded-full bg-blue-600 [animation-delay:-0.3s]"></div>
                                    <div className="h-2 w-2 animate-bounce rounded-full bg-blue-600 [animation-delay:-0.15s]"></div>
                                    <div className="h-2 w-2 animate-bounce rounded-full bg-blue-600"></div>
                                </div>
                            </ChatMessage>
                        )}
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="border-t border-red-200 bg-red-50 p-3">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    {/* Input */}
                    <div className="border-t border-gray-200 p-3">
                        <ChatInput onSend={handleSend} disabled={isLoading} />
                    </div>
                </div>
            )}
        </div>
    )
}
