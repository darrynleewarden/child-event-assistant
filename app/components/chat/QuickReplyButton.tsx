"use client"

interface QuickReplyButtonProps {
  children: React.ReactNode
  onClick?: () => void
}

export function QuickReplyButton({ children, onClick }: QuickReplyButtonProps) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-3xl border-2 border-orange-400 bg-white px-6 py-4 text-left text-gray-800 hover:bg-orange-50 transition-colors"
    >
      {children}
    </button>
  )
}
