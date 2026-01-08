"use client"

interface ActionButtonProps {
  children: React.ReactNode
  onClick?: () => void
}

export function ActionButton({ children, onClick }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="rounded-full bg-purple-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-purple-600 transition-colors"
    >
      {children}
    </button>
  )
}
