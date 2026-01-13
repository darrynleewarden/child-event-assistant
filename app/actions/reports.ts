"use server"

import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths } from "date-fns"

export type ReportType = "daily" | "weekly" | "monthly" | "custom"
export type ReportCategory = "all" | "events" | "bookings" | "children"

export interface ReportFilters {
    reportType: ReportType
    category: ReportCategory
    childId?: string
    startDate?: Date
    endDate?: Date
}

export interface ChildEventData {
    id: string
    name: string
    eventType: string
    createdAt: Date
    child: {
        id: string
        firstName: string
        lastName: string | null
    }
}

export interface BookingData {
    id: string
    name: string
    date: Date
    time: string
    notes: string | null
    child: {
        id: string
        firstName: string
        lastName: string | null
    } | null
}

export interface ChildSummary {
    id: string
    firstName: string
    lastName: string | null
    dateOfBirth: Date
    gender: string | null
    allergies: string | null
    medicalInfo: string | null
    eventCount: number
    bookingCount: number
}

export interface ReportData {
    generatedAt: Date
    reportType: ReportType
    category: ReportCategory
    dateRange: {
        start: Date
        end: Date
    }
    user: {
        name: string | null
        email: string
    }
    events: ChildEventData[]
    bookings: BookingData[]
    children: ChildSummary[]
    summary: {
        totalEvents: number
        totalBookings: number
        totalChildren: number
        eventsByType: Record<string, number>
    }
}

function getDateRange(reportType: ReportType, customStart?: Date, customEnd?: Date): { start: Date; end: Date } {
    const now = new Date()

    switch (reportType) {
        case "daily":
            return {
                start: startOfDay(now),
                end: endOfDay(now),
            }
        case "weekly":
            return {
                start: startOfWeek(now, { weekStartsOn: 1 }),
                end: endOfWeek(now, { weekStartsOn: 1 }),
            }
        case "monthly":
            return {
                start: startOfMonth(now),
                end: endOfMonth(now),
            }
        case "custom":
            return {
                start: customStart ? startOfDay(customStart) : subDays(now, 30),
                end: customEnd ? endOfDay(customEnd) : endOfDay(now),
            }
        default:
            return {
                start: startOfDay(now),
                end: endOfDay(now),
            }
    }
}

export async function generateReportData(filters: ReportFilters): Promise<ReportData> {
    const session = await auth()

    if (!session?.user?.id) {
        throw new Error("Unauthorized")
    }

    const dateRange = getDateRange(filters.reportType, filters.startDate, filters.endDate)

    // Fetch children
    const children = await prisma.childDetails.findMany({
        where: {
            userId: session.user.id,
            ...(filters.childId && { id: filters.childId }),
        },
        include: {
            events: {
                where: {
                    createdAt: {
                        gte: dateRange.start,
                        lte: dateRange.end,
                    },
                },
            },
            bookings: {
                where: {
                    date: {
                        gte: dateRange.start,
                        lte: dateRange.end,
                    },
                },
            },
        },
    })

    // Fetch events within date range
    const events = await prisma.childEvent.findMany({
        where: {
            child: {
                userId: session.user.id,
                ...(filters.childId && { id: filters.childId }),
            },
            createdAt: {
                gte: dateRange.start,
                lte: dateRange.end,
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
        orderBy: {
            createdAt: "desc",
        },
    })

    // Fetch bookings within date range
    const bookings = await prisma.booking.findMany({
        where: {
            userId: session.user.id,
            ...(filters.childId && { childId: filters.childId }),
            date: {
                gte: dateRange.start,
                lte: dateRange.end,
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
        orderBy: {
            date: "desc",
        },
    })

    // Calculate event types summary
    const eventsByType: Record<string, number> = {}
    events.forEach((event) => {
        eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1
    })

    // Build children summary
    const childrenSummary: ChildSummary[] = children.map((child) => ({
        id: child.id,
        firstName: child.firstName,
        lastName: child.lastName,
        dateOfBirth: child.dateOfBirth,
        gender: child.gender,
        allergies: child.allergies,
        medicalInfo: child.medicalInfo,
        eventCount: child.events.length,
        bookingCount: child.bookings.length,
    }))

    return {
        generatedAt: new Date(),
        reportType: filters.reportType,
        category: filters.category,
        dateRange,
        user: {
            name: session.user.name || null,
            email: session.user.email || "",
        },
        events: events.map((e) => ({
            id: e.id,
            name: e.name,
            eventType: e.eventType,
            createdAt: e.createdAt,
            child: e.child,
        })),
        bookings: bookings.map((b) => ({
            id: b.id,
            name: b.name,
            date: b.date,
            time: b.time,
            notes: b.notes,
            child: b.child,
        })),
        children: childrenSummary,
        summary: {
            totalEvents: events.length,
            totalBookings: bookings.length,
            totalChildren: children.length,
            eventsByType,
        },
    }
}

export async function getReportHistory() {
    const session = await auth()

    if (!session?.user?.id) {
        throw new Error("Unauthorized")
    }

    // For now, return empty array - could be extended to store generated reports
    return []
}
