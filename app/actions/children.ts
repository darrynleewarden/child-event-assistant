"use server"

import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function getChildren() {
    const session = await auth()

    if (!session?.user?.id) {
        throw new Error("Unauthorized")
    }

    const children = await prisma.childDetails.findMany({
        where: {
            userId: session.user.id,
        },
        include: {
            events: true,
        },
        orderBy: {
            createdAt: "desc",
        },
    })

    return children
}

export async function getAllChildren() {
    // For admin/demo purposes - get all children
    const children = await prisma.childDetails.findMany({
        include: {
            events: true,
            user: {
                select: {
                    name: true,
                    email: true,
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    })

    return children
}

export async function createChild(data: {
    firstName: string
    lastName?: string
    dateOfBirth: Date
    gender?: string
    allergies?: string
    medicalInfo?: string
    notes?: string
}) {
    const session = await auth()

    if (!session?.user?.id) {
        throw new Error("Unauthorized")
    }

    const child = await prisma.childDetails.create({
        data: {
            ...data,
            userId: session.user.id,
        },
    })

    revalidatePath("/children")
    return child
}

export async function updateChild(
    id: string,
    data: {
        firstName?: string
        lastName?: string
        dateOfBirth?: Date
        gender?: string
        allergies?: string
        medicalInfo?: string
        notes?: string
    }
) {
    const session = await auth()

    if (!session?.user?.id) {
        throw new Error("Unauthorized")
    }

    // Verify the child belongs to the user
    const existingChild = await prisma.childDetails.findFirst({
        where: {
            id,
            userId: session.user.id,
        },
    })

    if (!existingChild) {
        throw new Error("Child not found")
    }

    const child = await prisma.childDetails.update({
        where: { id },
        data,
    })

    revalidatePath("/children")
    return child
}

export async function deleteChild(id: string) {
    const session = await auth()

    if (!session?.user?.id) {
        throw new Error("Unauthorized")
    }

    // Verify the child belongs to the user
    const existingChild = await prisma.childDetails.findFirst({
        where: {
            id,
            userId: session.user.id,
        },
    })

    if (!existingChild) {
        throw new Error("Child not found")
    }

    await prisma.childDetails.delete({
        where: { id },
    })

    revalidatePath("/children")
}

export async function getChildEvents(childId: string) {
    const events = await prisma.childEvent.findMany({
        where: {
            childId,
        },
        orderBy: {
            createdAt: "desc",
        },
    })

    return events
}

export async function getChildWithEvents(childId: string) {
    const child = await prisma.childDetails.findUnique({
        where: {
            id: childId,
        },
        include: {
            events: {
                orderBy: {
                    createdAt: "desc",
                },
            },
        },
    })

    return child
}
