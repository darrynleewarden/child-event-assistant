interface ChatMessageProps {
  children: React.ReactNode
  variant?: "bot" | "user"
}

export function ChatMessage({ children, variant = "bot" }: ChatMessageProps) {
  const borderColor = variant === "bot" ? "border-purple-300" : "border-orange-300"
  const bgColor = variant === "bot" ? "bg-purple-50/30" : "bg-orange-50/30"

  return (
    <div
      className={`rounded-3xl border-2 ${borderColor} ${bgColor} px-6 py-5 text-gray-800`}
    >
      <div className="prose prose-sm max-w-none">
        {children}
      </div>
    </div>
  )
}
