import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { generateReportData, ReportFilters, ReportType } from "@/app/actions/reports"
import { format } from "date-fns"
import prisma from "@/lib/prisma"

interface AgentGenerateRequest {
    userId: string
    reportType?: ReportType
    childName?: string
    startDate?: string
    endDate?: string
}

export async function POST(request: NextRequest) {
    try {
        const body: AgentGenerateRequest = await request.json()

        if (!body.userId) {
            return NextResponse.json(
                { success: false, message: "User ID is required" },
                { status: 400 }
            )
        }

        // Find child by name if provided
        let childId: string | undefined
        if (body.childName) {
            const child = await prisma.childDetails.findFirst({
                where: {
                    userId: body.userId,
                    OR: [
                        { firstName: { contains: body.childName, mode: "insensitive" } },
                        { lastName: { contains: body.childName, mode: "insensitive" } },
                    ],
                },
            })
            if (child) {
                childId = child.id
            }
        }

        // Build filters
        const filters: ReportFilters = {
            reportType: body.reportType || "weekly",
            category: "all",
            childId,
            startDate: body.startDate ? new Date(body.startDate) : undefined,
            endDate: body.endDate ? new Date(body.endDate) : undefined,
        }

        // Generate report data (we'll return a summary, not the full PDF via agent)
        // The user can then download the PDF from the reports page
        const reportData = await generateReportData(filters)

        const reportTypeLabels: Record<ReportType, string> = {
            daily: "daily",
            weekly: "weekly",
            monthly: "monthly",
            custom: "custom",
        }

        const period = `${format(new Date(reportData.dateRange.start), "MMM d, yyyy")} - ${format(
            new Date(reportData.dateRange.end),
            "MMM d, yyyy"
        )}`

        return NextResponse.json({
            success: true,
            message: `I've prepared your ${reportTypeLabels[filters.reportType]} report. Here's a summary:`,
            preview: {
                period,
                totalChildren: reportData.summary.totalChildren,
                totalEvents: reportData.summary.totalEvents,
                totalBookings: reportData.summary.totalBookings,
                eventsByType: reportData.summary.eventsByType,
            },
            downloadUrl: "/reports",
            instructions: "Visit the Reports page to download the full PDF report.",
        })
    } catch (error) {
        console.error("Agent report generation error:", error)
        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : "Failed to generate report",
            },
            { status: 500 }
        )
    }
}
