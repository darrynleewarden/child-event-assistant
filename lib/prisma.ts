import { PrismaClient } from "@prisma/client"

const prismaClientSingleton = () => {
  // During build time or when DATABASE_URL is not set, return a basic client
  // The adapter will be configured at runtime when the database is actually needed
  if (!process.env.DATABASE_URL) {
    console.warn("DATABASE_URL not set, using basic Prisma client")
    return new PrismaClient()
  }

  // Only import pg adapter when we actually have a database URL
  // This prevents build-time errors
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaPg } = require("@prisma/adapter-pg")
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool } = require("pg")

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes("localhost")
        ? undefined
        : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    })
    const adapter = new PrismaPg(pool)
    return new PrismaClient({ adapter })
  } catch {
    console.warn("Failed to initialize pg adapter, using basic Prisma client")
    return new PrismaClient()
  }
}

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton> | undefined
} & typeof global

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma
