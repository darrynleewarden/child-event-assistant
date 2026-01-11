"use client"

import { useState } from "react"
import { Modal } from "@/app/components/Modal"
import { getChildEvents } from "@/app/actions/children"

// Helper function to calculate age
function calculateAge(dateOfBirth: Date): string {
  const today = new Date()
  const birthDate = new Date(dateOfBirth)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }

  return `${age} years old`
}

// Helper function to format date
function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

interface ChildEvent {
    id: string
    name: string
    eventType: string
    childId: string
    createdAt: Date
    updatedAt: Date
}

interface Child {
    id: string
    firstName: string
    lastName: string | null
    dateOfBirth: Date
    gender: string | null
    allergies: string | null
    medicalInfo: string | null
    notes: string | null
    events: ChildEvent[]
}

interface ChildCardProps {
    child: Child
}

// Event type icons and colors
const eventTypeConfig: Record<string, { icon: string; color: string; bgColor: string }> = {
    meal: { icon: "🍽️", color: "text-orange-600", bgColor: "bg-orange-100" },
    sleep: { icon: "😴", color: "text-blue-600", bgColor: "bg-blue-100" },
    activity: { icon: "🎨", color: "text-purple-600", bgColor: "bg-purple-100" },
    health: { icon: "🏥", color: "text-red-600", bgColor: "bg-red-100" },
    milestone: { icon: "⭐", color: "text-yellow-600", bgColor: "bg-yellow-100" },
    education: { icon: "📚", color: "text-green-600", bgColor: "bg-green-100" },
    default: { icon: "📌", color: "text-gray-600", bgColor: "bg-gray-100" },
}

function getEventConfig(eventType: string) {
    const type = eventType.toLowerCase()
    return eventTypeConfig[type] || eventTypeConfig.default
}

export function ChildCard({ child }: ChildCardProps) {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [events, setEvents] = useState<ChildEvent[]>(child.events)
    const [isLoading, setIsLoading] = useState(false)

    const handleViewEvents = async () => {
        setIsModalOpen(true)
        setIsLoading(true)

        try {
            // Fetch fresh events from AWS
            const freshEvents = await getChildEvents(child.id)
            setEvents(freshEvents)
        } catch (error) {
            console.error("Error fetching events:", error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <>
            <div className="rounded-lg bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-purple-600 font-semibold text-lg">
                            {child.firstName.charAt(0)}
                            {child.lastName?.charAt(0) || ""}
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">
                                {child.firstName} {child.lastName}
                            </h3>
                            <p className="text-sm text-gray-500">
                                {calculateAge(child.dateOfBirth)}
                            </p>
                        </div>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        {child.events.length} events
                    </span>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-500">Date of Birth:</span>
                        <span className="text-gray-900">{formatDate(child.dateOfBirth)}</span>
                    </div>
                    {child.gender && (
                        <div className="flex justify-between">
                            <span className="text-gray-500">Gender:</span>
                            <span className="text-gray-900">{child.gender}</span>
                        </div>
                    )}
                    {child.allergies && (
                        <div className="flex justify-between">
                            <span className="text-gray-500">Allergies:</span>
                            <span className="text-gray-900 text-right max-w-[60%]">{child.allergies}</span>
                        </div>
                    )}
                </div>

                {child.medicalInfo && (
                    <div className="mt-3 rounded-md bg-yellow-50 p-2">
                        <p className="text-xs text-yellow-800">
                            <span className="font-medium">Medical Info:</span> {child.medicalInfo}
                        </p>
                    </div>
                )}

                {child.notes && (
                    <div className="mt-3 border-t pt-3">
                        <p className="text-xs text-gray-500">{child.notes}</p>
                    </div>
                )}

                <div className="mt-4 flex gap-2">
                    <button className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                        Edit
                    </button>
                    <button
                        onClick={handleViewEvents}
                        className="flex-1 rounded-md bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
                    >
                        View Events
                    </button>
                </div>
            </div>

            {/* Events Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={`Events for ${child.firstName} ${child.lastName || ""}`}
            >
                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600"></div>
                        <span className="ml-3 text-gray-600">Loading events from AWS...</span>
                    </div>
                ) : events.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                            <span className="text-3xl">📅</span>
                        </div>
                        <p className="text-gray-600 font-medium">No events recorded yet</p>
                        <p className="text-sm text-gray-500 mt-1">
                            Events for {child.firstName} will appear here
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {/* Event Summary */}
                        <div className="mb-4 grid grid-cols-2 gap-3">
                            <div className="rounded-lg bg-purple-50 p-3">
                                <p className="text-xs text-purple-600 font-medium">Total Events</p>
                                <p className="text-xl font-bold text-purple-900">{events.length}</p>
                            </div>
                            <div className="rounded-lg bg-blue-50 p-3">
                                <p className="text-xs text-blue-600 font-medium">Event Types</p>
                                <p className="text-xl font-bold text-blue-900">
                                    {new Set(events.map(e => e.eventType)).size}
                                </p>
                            </div>
                        </div>

                        {/* Events List */}
                        <div className="space-y-2">
                            {events.map((event) => {
                                const config = getEventConfig(event.eventType)
                                return (
                                    <div
                                        key={event.id}
                                        className="flex items-start gap-3 rounded-lg border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
                                    >
                                        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${config.bgColor}`}>
                                            <span className="text-lg">{config.icon}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <h4 className="font-medium text-gray-900 truncate">
                                                    {event.name}
                                                </h4>
                                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.bgColor} ${config.color}`}>
                                                    {event.eventType}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {formatDate(event.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Footer */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <p className="text-xs text-gray-500 text-center">
                                📍 Data fetched from AWS RDS
                            </p>
                        </div>
                    </div>
                )}
            </Modal>
        </>
    )
}
