"use server"

import { auth } from "@/lib/dev-auth"
import prisma from "@/lib/prisma"

export async function getUserProfile() {
    const session = await auth()

    if (!session?.user?.id) {
        throw new Error("Unauthorized")
    }

    const user = await prisma.user.findUnique({
        where: {
            id: session.user.id,
        },
        select: {
            id: true,
            name: true,
            email: true,
            emailVerified: true,
            image: true,
            createdAt: true,
            updatedAt: true,
        },
    })

    if (!user) {
        throw new Error("User not found")
    }

    return user
}
