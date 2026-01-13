"use server"

import { signIn } from "@/auth"
import { AuthError } from "next-auth"
import { isRedirectError } from "next/dist/client/components/redirect-error"

export async function loginUser(
  prevState: { error?: string } | undefined,
  formData: FormData
) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!email || !password) {
    return { error: "Email and password are required" }
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard",
    })
  } catch (error) {
    // NextAuth throws a redirect error on successful login - rethrow it
    if (isRedirectError(error)) {
      throw error
    }

    if (error instanceof AuthError) {
      console.error("Auth error type:", error.type, "message:", error.message)
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid email or password" }
        case "CallbackRouteError":
          return { error: "Invalid email or password" }
        default:
          return { error: `Authentication error: ${error.type}` }
      }
    }

    console.error("Unexpected login error:", error)
    return { error: "Something went wrong. Please try again." }
  }
}
