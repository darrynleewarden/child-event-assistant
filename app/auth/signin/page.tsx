import Link from "next/link"
import Image from "next/image"
import { SignInForm } from "./signin-form"
import { Logo } from "@/app/components/Logo"

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string; error?: string }>
}) {
  const params = await searchParams

  return (
    <div className="flex min-h-screen">
      {/* Left side - Sign in form (30%) */}
      <div className="w-[30%] flex flex-col justify-center px-8 lg:px-12 bg-white">
        <div className="w-full max-w-md mx-auto space-y-6">
          <div className="flex flex-col">
            <div className="text-primary mb-6">
              <Logo className="h-12 w-auto" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-2">
              Sign in to your account
            </h2>
            <p className="text-sm text-gray-600">
              Or{" "}
              <Link
                href="/auth/register"
                className="font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                create a new account
              </Link>
            </p>
          </div>

          {params.registered && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-4">
              <p className="text-sm text-green-800">
                Registration successful! Please sign in with your credentials.
              </p>
            </div>
          )}

          <SignInForm />

          <div className="text-left">
            <Link
              href="/"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← Back to home
            </Link>
          </div>
        </div>
      </div>

      {/* Right side - Image (70%) */}
      <div className="w-[70%] relative">
        <Image
          src="/login_splash.png"
          alt="Login splash"
          fill
          className="object-cover"
          priority
        />
      </div>
    </div>
  )
}
