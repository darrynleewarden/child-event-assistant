import Link from "next/link"
import { auth } from "@/auth"
import { Logo } from "@/app/components/Logo"

export default async function Home() {
  const session = await auth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-light to-tertiary-light">
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <nav className="mb-12 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="text-primary">
            <Logo className="h-10 w-auto" />
          </div>
          <div className="flex gap-2">
            {session?.user ? (
              <Link
                href="/dashboard"
                className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2"
              >
                Go to Dashboard
              </Link>
            ) : (
              <Link
                href="/auth/signin"
                className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2"
              >
                Sign In
              </Link>
            )}
          </div>
        </nav>

        <main className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-4xl font-bold text-gray-900 sm:text-5xl lg:text-6xl">
              Welcome to Your App
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-600 sm:text-xl">
              Built with Next.js 16, TypeScript, Tailwind CSS, Prisma, and NextAuth v5
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg bg-white p-6 shadow-md">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <svg
                  className="h-6 w-6 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">
                Next.js 16
              </h3>
              <p className="text-sm text-gray-600">
                The latest version with React 19 and App Router
              </p>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-md">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10">
                <svg
                  className="h-6 w-6 text-secondary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">
                Prisma + PostgreSQL
              </h3>
              <p className="text-sm text-gray-600">
                Type-safe database access with Prisma ORM
              </p>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-md">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-tertiary/10">
                <svg
                  className="h-6 w-6 text-tertiary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">
                NextAuth v5
              </h3>
              <p className="text-sm text-gray-600">
                Secure authentication with Auth.js integration
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
