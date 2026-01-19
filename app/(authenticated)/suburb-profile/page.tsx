import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { SuburbProfileList } from "./SuburbProfileList"

export default async function SuburbProfilePage() {
  const session = await auth()

  // Restrict access to specific email
  if (session?.user?.email !== "drleewarden@gmail.com") {
    redirect("/dashboard")
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Suburb Profiles
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            View and manage your saved suburb research and data
          </p>
        </div>

        <SuburbProfileList userId={session?.user?.id || ""} userEmail={session?.user?.email || ""} />
      </div>
    </div>
  )
}
