import { auth } from "@/auth"
import Link from "next/link"

export default async function DashboardPage() {
  const session = await auth()

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Welcome back, {session?.user?.name || session?.user?.email}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/chat"
            className="rounded-lg bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-gray-900">
              Chat Assistant
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Log child events using our AI chat assistant. Track meals, sleep,
              and more.
            </p>
          </Link>

          <Link
            href="/children"
            className="rounded-lg bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-gray-900">
              Child Details
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              View and manage information about your children.
            </p>
          </Link>

          <Link
            href="/events"
            className="rounded-lg bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-gray-900">
              Event History
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Review all logged events and activities.
            </p>
          </Link>
        </div>
      </div>
    </div>
  )
}
