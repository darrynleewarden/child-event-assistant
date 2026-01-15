"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { useAutoSpeak } from "@/app/contexts/AutoSpeakContext"
import { Logo } from "@/app/components/Logo"

export function Navigation() {
  const pathname = usePathname()
  const { autoSpeak, toggleAutoSpeak } = useAutoSpeak()
  const isOnChatPage = pathname === "/chat"

  const navItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/chat", label: "Chat" },
    { href: "/children", label: "Children" },
    { href: "/events", label: "Events" },
    { href: "/meals", label: "Meal Planner" },
    { href: "/calendar", label: "Calendar" },
    { href: "/reports", label: "Reports" },
    { href: "/profile", label: "Profile" },
  ]

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" })
  }

  return (
    <nav className="border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex">
            <div className="flex shrink-0 items-center">
              <Link href="/dashboard" className="text-primary">
                <Logo className="h-8 w-auto" />
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${isActive
                      ? "border-primary text-gray-900"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                      }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center sm:gap-4">
            {/* Auto-speak toggle - only shown on chat page */}
            {isOnChatPage && (
              <button
                onClick={toggleAutoSpeak}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors ${autoSpeak
                  ? "bg-tertiary/20 text-tertiary"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
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
            )}
            <button
              onClick={handleSignOut}
              className="rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-primary"
            >
              Sign Out
            </button>
          </div>
          <div className="flex items-center sm:hidden">
            <MobileMenu navItems={navItems} onSignOut={handleSignOut} isOnChatPage={isOnChatPage} autoSpeak={autoSpeak} toggleAutoSpeak={toggleAutoSpeak} />
          </div>
        </div>
      </div>
    </nav>
  )
}

function MobileMenu({
  navItems,
  onSignOut,
  isOnChatPage,
  autoSpeak,
  toggleAutoSpeak,
}: {
  navItems: { href: string; label: string }[]
  onSignOut: () => void
  isOnChatPage: boolean
  autoSpeak: boolean
  toggleAutoSpeak: () => void
}) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Auto-speak toggle for mobile - shown inline when on chat page */}
      {isOnChatPage && (
        <button
          onClick={toggleAutoSpeak}
          className={`mr-2 flex items-center gap-1 rounded-full px-2 py-1 text-xs transition-colors ${autoSpeak
            ? "bg-tertiary/20 text-tertiary"
            : "bg-gray-100 text-gray-500"
            }`}
          aria-label={autoSpeak ? "Disable auto-speak" : "Enable auto-speak"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-3.5 w-3.5"
          >
            <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 01-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
            <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
          </svg>
          {autoSpeak ? "On" : "Off"}
        </button>
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
        aria-label="Toggle menu"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d={
              isOpen
                ? "M6 18L18 6M6 6l12 12"
                : "M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            }
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-16 z-10 border-b border-gray-200 bg-white shadow-lg">
          <div className="space-y-1 px-2 pb-3 pt-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`block rounded-md px-3 py-2 text-base font-medium ${isActive
                    ? "bg-tertiary-light text-tertiary"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                >
                  {item.label}
                </Link>
              )
            })}
            <button
              onClick={() => {
                setIsOpen(false)
                onSignOut()
              }}
              className="block w-full rounded-md px-3 py-2 text-left text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </>
  )
}
