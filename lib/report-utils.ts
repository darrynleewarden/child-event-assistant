// Types and utilities for agent-triggered report generation

export interface AgentReportRequest {
    reportType?: "daily" | "weekly" | "monthly" | "custom"
    childName?: string
    startDate?: string
    endDate?: string
}

export interface AgentReportResponse {
    success: boolean
    message: string
    reportUrl?: string
    preview?: {
        period: string
        totalChildren: number
        totalEvents: number
        totalBookings: number
    }
}

/**
 * Parse natural language report request from agent
 */
export function parseReportRequest(input: string): AgentReportRequest {
    const lowerInput = input.toLowerCase()

    // Detect report type
    let reportType: AgentReportRequest["reportType"] = "weekly"
    if (lowerInput.includes("daily") || lowerInput.includes("today")) {
        reportType = "daily"
    } else if (lowerInput.includes("weekly") || lowerInput.includes("week")) {
        reportType = "weekly"
    } else if (lowerInput.includes("monthly") || lowerInput.includes("month")) {
        reportType = "monthly"
    }

    return { reportType }
}

/**
 * Format report response for chat display
 */
export function formatReportResponse(response: AgentReportResponse): string {
    if (!response.success) {
        return `I wasn't able to generate the report. ${response.message}`
    }

    let message = `📊 **Report Generated!**\n\n${response.message}\n\n`

    if (response.preview) {
        message += `**Summary:**\n`
        message += `- Period: ${response.preview.period}\n`
        message += `- Children: ${response.preview.totalChildren}\n`
        message += `- Events: ${response.preview.totalEvents}\n`
        message += `- Bookings: ${response.preview.totalBookings}\n\n`
    }

    message += `You can download the full PDF report from the [Reports page](/reports).`

    return message
}

/**
 * Check if a message is requesting a report
 */
export function isReportRequest(message: string): boolean {
    const reportKeywords = [
        "report",
        "generate report",
        "create report",
        "download report",
        "pdf",
        "export",
        "summary report",
        "activity report",
    ]

    const lowerMessage = message.toLowerCase()
    return reportKeywords.some((keyword) => lowerMessage.includes(keyword))
}
