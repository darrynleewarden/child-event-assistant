import "dotenv/config"
import prisma from "../lib/prisma"
import { hash } from "bcryptjs"

async function main() {
  console.log("Creating development user...")

  // Check if dev user already exists
  const existing = await prisma.user.findUnique({
    where: { id: "dev-user-mock-id" },
  })

  if (existing) {
    console.log("✓ Development user already exists")
    console.log(`  ID: ${existing.id}`)
    console.log(`  Email: ${existing.email}`)
    console.log(`  Name: ${existing.name}`)
    return
  }

  // Create dev user
  const hashedPassword = await hash("dev-password", 10)

  const devUser = await prisma.user.create({
    data: {
      id: "dev-user-mock-id",
      email: "dev@example.com",
      name: "Development User",
      password: hashedPassword,
      emailVerified: new Date(),
    },
  })

  console.log("✓ Development user created successfully!")
  console.log(`  ID: ${devUser.id}`)
  console.log(`  Email: ${devUser.email}`)
  console.log(`  Name: ${devUser.name}`)
  console.log(`  Password: dev-password`)
}

main()
  .catch((e) => {
    console.error("Error creating development user:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
