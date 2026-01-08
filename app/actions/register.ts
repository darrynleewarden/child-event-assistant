"use server"

import { hash } from "bcryptjs"
import prisma from "@/lib/prisma"
import { redirect } from "next/navigation"

export async function registerUser(formData: FormData) {
  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!email || !password) {
    return { error: "Email and password are required" }
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters" }
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return { error: "User with this email already exists" }
    }

    const hashedPassword = await hash(password, 12)

    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    })
  } catch (error) {
    console.error("Registration error:", error)
    return { error: "Failed to create user. Please try again." }
  }

  redirect("/auth/signin?registered=true")
}
