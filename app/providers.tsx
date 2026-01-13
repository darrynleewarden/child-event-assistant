"use client"

import { SessionProvider } from "next-auth/react"
import { AutoSpeakProvider } from "@/app/contexts/AutoSpeakContext"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AutoSpeakProvider>{children}</AutoSpeakProvider>
    </SessionProvider>
  )
}
