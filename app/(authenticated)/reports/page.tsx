"use client"

import { useState, useEffect } from "react"
import { getChildren } from "@/app/actions/children"
import { format } from "date-fns"
import { ReportingChat } from "@/app/components/reports/ReportingChat"

type ReportType = "daily" | "weekly" | "monthly" | "custom"
type ReportCategory = "all" | "events" | "bookings" | "children"

interface Child {
    id: string
    firstName: string
    lastName: string | null
}

interface ReportPreview {
    summary: {
        totalEvents: number
        totalBookings: number
        totalChildren: number
        eventsByType: Record<string, number>
    }
    dateRange: {
        start: string
        end: string
    }
}

export default function ReportsPage() {
    const [reportType, setReportType] = useState<ReportType>("weekly")
    const [category, setCategory] = useState<ReportCategory>("all")
    const [childId, setChildId] = useState<string>("")
    const [startDate, setStartDate] = useState<string>("")
    const [endDate, setEndDate] = useState<string>("")
    const [children, setChildren] = useState<Child[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [preview, setPreview] = useState<ReportPreview | null>(null)
    const [error, setError] = useState<string>("")

    useEffect(() => {
        loadChildren()
    }, [])

    useEffect(() => {
        if (reportType !== "custom") {
            loadPreview()
        } else if (startDate && endDate) {
            loadPreview()
        }
    }, [reportType, category, childId, startDate, endDate])

    const loadChildren = async () => {
        try {
            const data = await getChildren()
            setChildren(data)
        } catch (err) {
            console.error("Failed to load children:", err)
        }
    }

    const loadPreview = async () => {
        setIsLoading(true)
        setError("")
        try {
            const params = new URLSearchParams({
                reportType,
                category,
                ...(childId && { childId }),
                ...(startDate && { startDate }),
                ...(endDate && { endDate }),
            })

            const response = await fetch(`/api/reports?${params}`)
            if (!response.ok) throw new Error("Failed to load preview")

            const data = await response.json()
            setPreview({
                summary: data.summary,
                dateRange: data.dateRange,
            })
        } catch (err) {
            console.error("Failed to load preview:", err)
            setError("Failed to load report preview")
        } finally {
            setIsLoading(false)
        }
    }

    const handleGenerateReport = async () => {
        setIsGenerating(true)
        setError("")

        try {
            const response = await fetch("/api/reports", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    reportType,
                    category,
                    childId: childId || undefined,
                    startDate: startDate || undefined,
                    endDate: endDate || undefined,
                }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || "Failed to generate report")
            }

            // Download the PDF
            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `report-${format(new Date(), "yyyy-MM-dd")}.pdf`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            a.remove()
        } catch (err) {
            console.error("Failed to generate report:", err)
            setError(err instanceof Error ? err.message : "Failed to generate report")
        } finally {
            setIsGenerating(false)
        }
    }

    const reportTypeOptions = [
        { value: "daily", label: "Daily", description: "Today's activity" },
        { value: "weekly", label: "Weekly", description: "This week's summary" },
        { value: "monthly", label: "Monthly", description: "This month's overview" },
        { value: "custom", label: "Custom", description: "Choose your date range" },
    ]

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="mx-auto max-w-4xl px-4">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
                    <p className="mt-2 text-gray-600">
                        Generate and download PDF reports of your children&apos;s activities
                    </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Report Configuration */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Report Type Selection */}
                        <div className="rounded-xl bg-white p-6 shadow-sm">
                            <h2 className="mb-4 text-lg font-semibold text-gray-900">
                                Report Period
                            </h2>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                {reportTypeOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => setReportType(option.value as ReportType)}
                                        className={`rounded-lg border-2 p-4 text-left transition-all ${reportType === option.value
                                            ? "border-primary bg-primary/5"
                                            : "border-gray-200 hover:border-gray-300"
                                            }`}
                                    >
                                        <span className={`block font-medium ${reportType === option.value ? "text-primary" : "text-gray-900"
                                            }`}>
                                            {option.label}
                                        </span>
                                        <span className="mt-1 block text-xs text-gray-500">
                                            {option.description}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {/* Custom Date Range */}
                            {reportType === "custom" && (
                                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">
                                            Start Date
                                        </label>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">
                                            End Date
                                        </label>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Filters */}
                        <div className="rounded-xl bg-white p-6 shadow-sm">
                            <h2 className="mb-4 text-lg font-semibold text-gray-900">Filters</h2>

                            <div className="space-y-4">
                                {/* Child Filter */}
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Child
                                    </label>
                                    <select
                                        value={childId}
                                        onChange={(e) => setChildId(e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                    >
                                        <option value="">All Children</option>
                                        {children.map((child) => (
                                            <option key={child.id} value={child.id}>
                                                {child.firstName} {child.lastName || ""}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Category Filter */}
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Include in Report
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { value: "all", label: "Everything" },
                                            { value: "events", label: "Events Only" },
                                            { value: "bookings", label: "Bookings Only" },
                                        ].map((option) => (
                                            <button
                                                key={option.value}
                                                onClick={() => setCategory(option.value as ReportCategory)}
                                                className={`rounded-full px-4 py-2 text-sm transition-colors ${category === option.value
                                                    ? "bg-secondary text-white"
                                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                                    }`}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
                                <p className="font-medium">{error}</p>
                            </div>
                        )}

                        {/* Generate Button */}
                        <button
                            onClick={handleGenerateReport}
                            disabled={isGenerating || (reportType === "custom" && (!startDate || !endDate))}
                            className="w-full rounded-xl bg-primary px-6 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isGenerating ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                            fill="none"
                                        />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        />
                                    </svg>
                                    Generating PDF...
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                        className="h-5 w-5"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M12 2.25a.75.75 0 01.75.75v11.69l3.22-3.22a.75.75 0 111.06 1.06l-4.5 4.5a.75.75 0 01-1.06 0l-4.5-4.5a.75.75 0 111.06-1.06l3.22 3.22V3a.75.75 0 01.75-.75zm-9 13.5a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                    Download PDF Report
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Preview Panel */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-4 rounded-xl bg-white p-6 shadow-sm">
                            <h2 className="mb-4 text-lg font-semibold text-gray-900">
                                Report Preview
                            </h2>

                            {isLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                                </div>
                            ) : preview ? (
                                <div className="space-y-4">
                                    {/* Date Range */}
                                    <div className="rounded-lg bg-gray-50 p-3">
                                        <p className="text-xs font-medium text-gray-500">Period</p>
                                        <p className="text-sm text-gray-900">
                                            {format(new Date(preview.dateRange.start), "MMM d, yyyy")} -{" "}
                                            {format(new Date(preview.dateRange.end), "MMM d, yyyy")}
                                        </p>
                                    </div>

                                    {/* Summary Stats */}
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="rounded-lg bg-primary/10 p-3 text-center">
                                            <p className="text-2xl font-bold text-primary">
                                                {preview.summary.totalChildren}
                                            </p>
                                            <p className="text-xs text-gray-600">Children</p>
                                        </div>
                                        <div className="rounded-lg bg-tertiary/10 p-3 text-center">
                                            <p className="text-2xl font-bold text-tertiary">
                                                {preview.summary.totalEvents}
                                            </p>
                                            <p className="text-xs text-gray-600">Events</p>
                                        </div>
                                        <div className="rounded-lg bg-secondary/10 p-3 text-center">
                                            <p className="text-2xl font-bold text-secondary">
                                                {preview.summary.totalBookings}
                                            </p>
                                            <p className="text-xs text-gray-600">Bookings</p>
                                        </div>
                                    </div>

                                    {/* Event Types */}
                                    {Object.keys(preview.summary.eventsByType).length > 0 && (
                                        <div>
                                            <p className="mb-2 text-sm font-medium text-gray-700">
                                                Event Types
                                            </p>
                                            <div className="space-y-1">
                                                {Object.entries(preview.summary.eventsByType).map(
                                                    ([type, count]) => (
                                                        <div
                                                            key={type}
                                                            className="flex items-center justify-between rounded bg-gray-50 px-3 py-1.5"
                                                        >
                                                            <span className="text-sm capitalize text-gray-700">
                                                                {type}
                                                            </span>
                                                            <span className="text-sm font-medium text-tertiary">
                                                                {count}
                                                            </span>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {preview.summary.totalEvents === 0 &&
                                        preview.summary.totalBookings === 0 && (
                                            <p className="text-center text-sm text-gray-500 py-4">
                                                No data found for this period
                                            </p>
                                        )}
                                </div>
                            ) : (
                                <p className="text-center text-sm text-gray-500 py-8">
                                    Select report options to see preview
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* AI Reporting Assistant */}
                <div className="mt-8">
                    <ReportingChat initialContext="I can help you generate reports in Excel, CSV, or PDF format. What type of report would you like to create?" />
                </div>
            </div>
        </div>
    )
}
