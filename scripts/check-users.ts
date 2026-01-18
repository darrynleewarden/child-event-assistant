import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
    console.log("Checking database users and location data...\n")

    try {
        // Get all users
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
            }
        })

        console.log(`Found ${users.length} users:`)
        users.forEach(user => {
            console.log(`- ${user.email} (ID: ${user.id})`)
        })

        // Get location data count
        const locationCount = await prisma.locationData.count()
        console.log(`\nTotal location records: ${locationCount}`)

        if (locationCount > 0) {
            const locations = await prisma.locationData.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' }
            })
            console.log('\nRecent locations:')
            locations.forEach(loc => {
                console.log(`- ${loc.suburbName}, ${loc.state} (User: ${loc.userId})`)
            })
        }

    } catch (error) {
        console.error("Error:", error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
