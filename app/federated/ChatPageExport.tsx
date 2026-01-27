"use client"

/**
 * Module Federation Export for Chat Page
 * This wrapper makes the chat page safely exportable to other micro-frontends
 */

import dynamic from "next/dynamic"
import { SessionProvider } from "next-auth/react"
import { AutoSpeakProvider } from "@/app/contexts/AutoSpeakContext"

// Dynamically import the chat page to avoid SSR issues
const ChatPage = dynamic(() => import("@/app/(authenticated)/chat/page"), {
    ssr: false,
    loading: () => (
        <div className="flex min-h-screen items-center justify-center">
            <p>Loading chat...</p>
        </div>
    ),
})

interface ChatPageExportProps {
    session?: any
}

export default function ChatPageExport({ session }: ChatPageExportProps) {
    return (
        <SessionProvider session={session}>
            <AutoSpeakProvider>
                <ChatPage />
            </AutoSpeakProvider>
        </SessionProvider>
    )
}
