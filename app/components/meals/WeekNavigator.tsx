"use client"

import { useRouter } from "next/navigation"
import { addWeeks, startOfWeek, endOfWeek, format } from "date-fns"

interface WeekNavigatorProps {
    currentWeekOffset: number
}

export default function WeekNavigator({ currentWeekOffset }: WeekNavigatorProps) {
    const router = useRouter()

    const targetDate = addWeeks(new Date(), currentWeekOffset)
    const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 })

    const goToPreviousWeek = () => {
        const newOffset = currentWeekOffset - 1
        router.push(`/meals?week=${newOffset}`)
    }

    const goToNextWeek = () => {
        const newOffset = currentWeekOffset + 1
        router.push(`/meals?week=${newOffset}`)
    }

    const goToCurrentWeek = () => {
        router.push(`/meals`)
    }

    const isCurrentWeek = currentWeekOffset === 0

    return (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-white p-4 shadow-sm">
            <button
                onClick={goToPreviousWeek}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
                <svg
                    className="-ml-1 mr-2 h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                    />
                </svg>
                Previous Week
            </button>

            <div className="flex flex-col items-center">
                <div className="text-lg font-semibold text-gray-900">
                    {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
                </div>
                {!isCurrentWeek && (
                    <button
                        onClick={goToCurrentWeek}
                        className="mt-1 text-sm text-purple-600 hover:text-purple-800 underline"
                    >
                        Go to Current Week
                    </button>
                )}
                {isCurrentWeek && (
                    <span className="mt-1 text-sm text-gray-500">This Week</span>
                )}
            </div>

            <button
                onClick={goToNextWeek}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
                Next Week
                <svg
                    className="-mr-1 ml-2 h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                    />
                </svg>
            </button>
        </div>
    )
}
