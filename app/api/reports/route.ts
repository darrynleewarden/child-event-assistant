import { NextRequest, NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { auth } from "@/lib/dev-auth"
import { generateReportData, ReportFilters } from "@/app/actions/reports"
import { ReportPDF } from "@/app/components/reports/ReportPDF"
import { format } from "date-fns"

export async function POST(request: NextRequest) {
    try {
        const session = await auth()

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const filters: ReportFilters = {
            reportType: body.reportType || "weekly",
            category: body.category || "all",
            childId: body.childId,
            startDate: body.startDate ? new Date(body.startDate) : undefined,
            endDate: body.endDate ? new Date(body.endDate) : undefined,
        }

        // Generate report data
        const reportData = await generateReportData(filters)

        // Generate PDF
        const pdfBuffer = await renderToBuffer(
            ReportPDF({ data: reportData })
        )

        // Generate filename
        const dateStr = format(new Date(), "yyyy-MM-dd")
        const filename = `child-assistant-${filters.reportType}-report-${dateStr}.pdf`

        // Return PDF as download - convert Buffer to Uint8Array for NextResponse
        return new NextResponse(new Uint8Array(pdfBuffer), {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        })
    } catch (error) {
        console.error("Error generating report:", error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to generate report" },
            { status: 500 }
        )
    }
}

export async function GET(request: NextRequest) {
    try {
        const session = await auth()

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const searchParams = request.nextUrl.searchParams
        const filters: ReportFilters = {
            reportType: (searchParams.get("reportType") as ReportFilters["reportType"]) || "weekly",
            category: (searchParams.get("category") as ReportFilters["category"]) || "all",
            childId: searchParams.get("childId") || undefined,
            startDate: searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : undefined,
            endDate: searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : undefined,
        }

        // Generate report data (for preview without PDF)
        const reportData = await generateReportData(filters)

        return NextResponse.json(reportData)
    } catch (error) {
        console.error("Error generating report data:", error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to generate report" },
            { status: 500 }
        )
    }
}
