import { auth } from "@/lib/dev-auth"
import { redirect } from "next/navigation"
import { ChatClient } from "./ChatClient"

export default async function ChatPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  return (
    <ChatClient
      userId={session.user.id}
      userEmail={session.user.email || ""}
      userName={session.user.name || ""}
    />
  )
}
