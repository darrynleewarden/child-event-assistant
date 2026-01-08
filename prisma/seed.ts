import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import * as bcrypt from "bcryptjs"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("Starting database seed...")

  // Create a test user
  const hashedPassword = await bcrypt.hash("password123", 10)

  const user = await prisma.user.upsert({
    where: { email: "test@example.com" },
    update: {},
    create: {
      email: "test@example.com",
      name: "Test User",
      password: hashedPassword,
    },
  })

  console.log("Created user:", user.email)

  // Create child details with events
  const child1 = await prisma.childDetails.create({
    data: {
      firstName: "Emma",
      lastName: "Johnson",
      dateOfBirth: new Date("2018-05-15"),
      gender: "Female",
      allergies: "Peanuts, Dairy",
      medicalInfo: "Asthma - uses inhaler",
      notes: "Loves reading and drawing",
      userId: user.id,
      events: {
        create: [
          {
            name: "First Day of School",
            eventType: "Education",
          },
          {
            name: "Birthday Party",
            eventType: "Celebration",
          },
          {
            name: "Doctor Checkup",
            eventType: "Medical",
          },
        ],
      },
    },
  })

  console.log("Created child:", child1.firstName, child1.lastName)

  const child2 = await prisma.childDetails.create({
    data: {
      firstName: "Liam",
      lastName: "Johnson",
      dateOfBirth: new Date("2020-08-22"),
      gender: "Male",
      allergies: "None",
      medicalInfo: "No known conditions",
      notes: "Very active, loves soccer",
      userId: user.id,
      events: {
        create: [
          {
            name: "Soccer Practice",
            eventType: "Sports",
          },
          {
            name: "Dentist Appointment",
            eventType: "Medical",
          },
          {
            name: "Playdate at Park",
            eventType: "Social",
          },
          {
            name: "Swimming Lessons",
            eventType: "Sports",
          },
        ],
      },
    },
  })

  console.log("Created child:", child2.firstName, child2.lastName)

  const child3 = await prisma.childDetails.create({
    data: {
      firstName: "Sophia",
      lastName: "Johnson",
      dateOfBirth: new Date("2019-11-03"),
      gender: "Female",
      allergies: "Shellfish",
      medicalInfo: "Wears glasses",
      notes: "Enjoys music and dance classes",
      userId: user.id,
      events: {
        create: [
          {
            name: "Piano Recital",
            eventType: "Arts",
          },
          {
            name: "Dance Class",
            eventType: "Arts",
          },
          {
            name: "Eye Exam",
            eventType: "Medical",
          },
        ],
      },
    },
  })

  console.log("Created child:", child3.firstName, child3.lastName)

  // Count total records
  const childCount = await prisma.childDetails.count()
  const eventCount = await prisma.childEvent.count()

  console.log("\n✅ Seed completed!")
  console.log(`- Total children: ${childCount}`)
  console.log(`- Total events: ${eventCount}`)
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
