"use server"

import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { startOfMonth, endOfMonth } from "date-fns"

export interface CalendarEvent {
    id: string
    name: string
    eventType: string
    childName: string
    childId: string
    date: Date
    time?: string
    type: "event" | "booking"
}

export interface CalendarData {
    events: CalendarEvent[]
    children: { id: string; firstName: string; lastName: string | null }[]
}

export async function getCalendarData(
    year: number,
    month: number
): Promise<CalendarData> {
    const session = await auth()

    if (!session?.user?.id) {
        return { events: [], children: [] }
    }

    const userId = session.user.id

    // Get date range for the month
    const startDate = startOfMonth(new Date(year, month))
    const endDate = endOfMonth(new Date(year, month))

    // Fetch user's children
    const children = await prisma.childDetails.findMany({
        where: { userId },
        select: {
            id: true,
            firstName: true,
            lastName: true,
        },
    })

    // Fetch bookings for the month
    const bookings = await prisma.booking.findMany({
        where: {
            userId,
            date: {
                gte: startDate,
                lte: endDate,
            },
        },
        include: {
            child: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                },
            },
        },
        orderBy: { date: "asc" },
    })

    // Fetch child events for the month (using createdAt as the date)
    const childEvents = await prisma.childEvent.findMany({
        where: {
            child: {
                userId,
            },
            createdAt: {
                gte: startDate,
                lte: endDate,
            },
        },
        include: {
            child: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                },
            },
        },
        orderBy: { createdAt: "asc" },
    })

    // Convert to calendar events
    const calendarEvents: CalendarEvent[] = [
        // Add bookings
        ...bookings.map((booking) => ({
            id: booking.id,
            name: booking.name,
            eventType: "Booking",
            childName: booking.child
                ? `${booking.child.firstName}${booking.child.lastName ? ` ${booking.child.lastName}` : ""}`
                : "General",
            childId: booking.childId || "",
            date: booking.date,
            time: booking.time,
            type: "booking" as const,
        })),
        // Add child events
        ...childEvents.map((event) => ({
            id: event.id,
            name: event.name,
            eventType: event.eventType,
            childName: `${event.child.firstName}${event.child.lastName ? ` ${event.child.lastName}` : ""}`,
            childId: event.childId,
            date: event.createdAt,
            type: "event" as const,
        })),
    ]

    // Sort by date
    calendarEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return {
        events: calendarEvents,
        children,
    }
}
