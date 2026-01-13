"use client"

import { useState } from "react"

interface CalendarEvent {
    id: string
    name: string
    eventType: string
    childName: string
    date: Date
}

// Helper to get days in a month
function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate()
}

// Helper to get the first day of the month (0 = Sunday, 1 = Monday, etc.)
function getFirstDayOfMonth(year: number, month: number): number {
    return new Date(year, month, 1).getDay()
}

// Month names
const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
]

// Day names
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

// Event type colors
const EVENT_TYPE_COLORS: Record<string, string> = {
    Medical: "bg-red-100 text-red-800 border-red-200",
    Education: "bg-blue-100 text-blue-800 border-blue-200",
    Sports: "bg-green-100 text-green-800 border-green-200",
    Arts: "bg-purple-100 text-purple-800 border-purple-200",
    Social: "bg-yellow-100 text-yellow-800 border-yellow-200",
    Celebration: "bg-pink-100 text-pink-800 border-pink-200",
    default: "bg-gray-100 text-gray-800 border-gray-200",
}

export default function CalendarPage() {
    const today = new Date()
    const [currentMonth, setCurrentMonth] = useState(today.getMonth())
    const [currentYear, setCurrentYear] = useState(today.getFullYear())
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)

    // Mock events for demonstration - in production, fetch from API
    const [events] = useState<CalendarEvent[]>([
        {
            id: "1",
            name: "Doctor's Appointment",
            eventType: "Medical",
            childName: "Emma",
            date: new Date(currentYear, currentMonth, 15),
        },
        {
            id: "2",
            name: "Soccer Practice",
            eventType: "Sports",
            childName: "Emma",
            date: new Date(currentYear, currentMonth, 18),
        },
        {
            id: "3",
            name: "Piano Lesson",
            eventType: "Arts",
            childName: "Lucas",
            date: new Date(currentYear, currentMonth, 20),
        },
        {
            id: "4",
            name: "Birthday Party",
            eventType: "Celebration",
            childName: "Emma",
            date: new Date(currentYear, currentMonth, 25),
        },
    ])

    const daysInMonth = getDaysInMonth(currentYear, currentMonth)
    const firstDayOfMonth = getFirstDayOfMonth(currentYear, currentMonth)

    // Navigate to previous month
    const goToPreviousMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11)
            setCurrentYear(currentYear - 1)
        } else {
            setCurrentMonth(currentMonth - 1)
        }
    }

    // Navigate to next month
    const goToNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0)
            setCurrentYear(currentYear + 1)
        } else {
            setCurrentMonth(currentMonth + 1)
        }
    }

    // Go to today
    const goToToday = () => {
        setCurrentMonth(today.getMonth())
        setCurrentYear(today.getFullYear())
        setSelectedDate(today)
    }

    // Get events for a specific date
    const getEventsForDate = (day: number): CalendarEvent[] => {
        return events.filter((event) => {
            const eventDate = new Date(event.date)
            return (
                eventDate.getDate() === day &&
                eventDate.getMonth() === currentMonth &&
                eventDate.getFullYear() === currentYear
            )
        })
    }

    // Check if a date is today
    const isToday = (day: number): boolean => {
        return (
            day === today.getDate() &&
            currentMonth === today.getMonth() &&
            currentYear === today.getFullYear()
        )
    }

    // Check if a date is selected
    const isSelected = (day: number): boolean => {
        if (!selectedDate) return false
        return (
            day === selectedDate.getDate() &&
            currentMonth === selectedDate.getMonth() &&
            currentYear === selectedDate.getFullYear()
        )
    }

    // Build calendar grid
    const calendarDays: (number | null)[] = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
        calendarDays.push(null)
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        calendarDays.push(day)
    }

    // Get selected date events
    const selectedDateEvents = selectedDate
        ? events.filter((event) => {
            const eventDate = new Date(event.date)
            return (
                eventDate.getDate() === selectedDate.getDate() &&
                eventDate.getMonth() === selectedDate.getMonth() &&
                eventDate.getFullYear() === selectedDate.getFullYear()
            )
        })
        : []

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl">
                {/* Header */}
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                            Calendar
                        </h1>
                        <p className="mt-1 text-sm text-gray-600">
                            View and manage events across all children
                        </p>
                    </div>
                    <button
                        onClick={goToToday}
                        className="inline-flex items-center rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                    >
                        Today
                    </button>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Calendar Grid */}
                    <div className="lg:col-span-2">
                        <div className="rounded-lg bg-white shadow-sm">
                            {/* Calendar Header */}
                            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                                <button
                                    onClick={goToPreviousMonth}
                                    className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                                    aria-label="Previous month"
                                >
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <h2 className="text-lg font-semibold text-gray-900">
                                    {MONTH_NAMES[currentMonth]} {currentYear}
                                </h2>
                                <button
                                    onClick={goToNextMonth}
                                    className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                                    aria-label="Next month"
                                >
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>

                            {/* Day Headers */}
                            <div className="grid grid-cols-7 border-b border-gray-200">
                                {DAY_NAMES.map((day) => (
                                    <div
                                        key={day}
                                        className="py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500"
                                    >
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* Calendar Days */}
                            <div className="grid grid-cols-7">
                                {calendarDays.map((day, index) => {
                                    const dayEvents = day ? getEventsForDate(day) : []
                                    const hasEvents = dayEvents.length > 0

                                    return (
                                        <div
                                            key={index}
                                            className={`min-h-[100px] border-b border-r border-gray-100 p-2 ${day ? "cursor-pointer hover:bg-gray-50" : "bg-gray-50"
                                                }`}
                                            onClick={() => day && setSelectedDate(new Date(currentYear, currentMonth, day))}
                                        >
                                            {day && (
                                                <>
                                                    <div
                                                        className={`mb-1 flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium ${isToday(day)
                                                                ? "bg-purple-600 text-white"
                                                                : isSelected(day)
                                                                    ? "bg-purple-100 text-purple-700"
                                                                    : "text-gray-900"
                                                            }`}
                                                    >
                                                        {day}
                                                    </div>
                                                    {hasEvents && (
                                                        <div className="space-y-1">
                                                            {dayEvents.slice(0, 2).map((event) => (
                                                                <div
                                                                    key={event.id}
                                                                    className={`truncate rounded px-1.5 py-0.5 text-xs ${EVENT_TYPE_COLORS[event.eventType] || EVENT_TYPE_COLORS.default
                                                                        }`}
                                                                >
                                                                    {event.name}
                                                                </div>
                                                            ))}
                                                            {dayEvents.length > 2 && (
                                                                <div className="text-xs text-gray-500">
                                                                    +{dayEvents.length - 2} more
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar - Selected Date Events */}
                    <div className="lg:col-span-1">
                        <div className="rounded-lg bg-white p-6 shadow-sm">
                            <h3 className="mb-4 text-lg font-semibold text-gray-900">
                                {selectedDate
                                    ? selectedDate.toLocaleDateString("en-US", {
                                        weekday: "long",
                                        month: "long",
                                        day: "numeric",
                                    })
                                    : "Select a date"}
                            </h3>

                            {selectedDate ? (
                                selectedDateEvents.length > 0 ? (
                                    <div className="space-y-3">
                                        {selectedDateEvents.map((event) => (
                                            <div
                                                key={event.id}
                                                className={`rounded-lg border p-3 ${EVENT_TYPE_COLORS[event.eventType] || EVENT_TYPE_COLORS.default
                                                    }`}
                                            >
                                                <div className="font-medium">{event.name}</div>
                                                <div className="mt-1 text-sm opacity-75">
                                                    {event.childName} • {event.eventType}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500">No events on this date.</p>
                                )
                            ) : (
                                <p className="text-gray-500">
                                    Click on a date to view its events.
                                </p>
                            )}

                            {/* Quick Actions */}
                            <div className="mt-6 border-t border-gray-200 pt-6">
                                <h4 className="mb-3 text-sm font-medium text-gray-900">
                                    Quick Actions
                                </h4>
                                <div className="space-y-2">
                                    <a
                                        href="/chat"
                                        className="flex items-center gap-2 rounded-md bg-purple-50 px-3 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100"
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Add Event via Chat
                                    </a>
                                    <a
                                        href="/events"
                                        className="flex items-center gap-2 rounded-md bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                        </svg>
                                        View All Events
                                    </a>
                                </div>
                            </div>

                            {/* Event Type Legend */}
                            <div className="mt-6 border-t border-gray-200 pt-6">
                                <h4 className="mb-3 text-sm font-medium text-gray-900">
                                    Event Types
                                </h4>
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.entries(EVENT_TYPE_COLORS)
                                        .filter(([key]) => key !== "default")
                                        .map(([type, colors]) => (
                                            <div
                                                key={type}
                                                className={`rounded px-2 py-1 text-xs ${colors}`}
                                            >
                                                {type}
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
