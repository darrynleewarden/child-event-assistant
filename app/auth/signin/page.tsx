import Link from "next/link"
import { SignInForm } from "./signin-form"
import { Logo } from "@/app/components/Logo"

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string; error?: string }>
}) {
  const params = await searchParams

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-secondary-light to-tertiary-light px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center">
          <div className="text-primary">
            <Logo className="h-12 w-auto" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Don't have an account?{" "}
            <Link
              href="/auth/register"
              className="font-medium text-secondary hover:text-secondary/80"
            >
              Register here
            </Link>
          </p>
        </div>

        {params.registered && (
          <div className="rounded-md bg-green-50 p-4">
            <p className="text-sm text-green-800">
              Registration successful! Please sign in with your credentials.
            </p>
          </div>
        )}

        <SignInForm />

        <div className="text-center">
          <Link
            href="/"
            className="text-sm font-medium text-secondary hover:text-secondary/80"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
