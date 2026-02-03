import { auth } from "@/lib/dev-auth"
import { redirect } from "next/navigation"
import { Navigation } from "../components/Navigation"

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/auth/signin")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main>{children}</main>
    </div>
  )
}
