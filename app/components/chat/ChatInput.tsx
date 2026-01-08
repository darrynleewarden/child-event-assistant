"use client"

import { useState } from "react"

interface ChatInputProps {
  onSend?: (message: string) => void
  placeholder?: string
}

export function ChatInput({ onSend, placeholder = "[Mic Output]" }: ChatInputProps) {
  const [message, setMessage] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && onSend) {
      onSend(message)
      setMessage("")
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">AI responses can be inaccurate</p>
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-center gap-3 rounded-full border-2 border-gray-300 bg-white px-4 py-3">
          <button
            type="button"
            className="flex-shrink-0 text-gray-600 hover:text-gray-800"
            aria-label="Voice input"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-6 w-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
              />
            </svg>
          </button>

          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-gray-800 placeholder-gray-400 outline-none"
          />

          <button
            type="submit"
            className="flex-shrink-0 text-gray-600 hover:text-gray-800"
            aria-label="Send message"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-6 w-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
              />
            </svg>
          </button>
        </div>
      </form>
    </div>
  )
}
