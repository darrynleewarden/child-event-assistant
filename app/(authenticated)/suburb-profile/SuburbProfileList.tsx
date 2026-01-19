"use client"

import { useEffect, useState } from "react"

interface LocationData {
  id: string
  suburbName: string
  state: string
  medianHousePrice: number
  medianUnitPrice: number
  rentalPriceHouse: number
  rentalPriceUnit: number
  vacancyRate: number
  notes: string | null
  isFavorite: boolean
  demographicLifestyle: string | null
  createdAt: string
  updatedAt: string
}

interface SuburbProfileListProps {
  userId: string
  userEmail: string
}

export function SuburbProfileList({ userId, userEmail }: SuburbProfileListProps) {
  const [locations, setLocations] = useState<LocationData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSuburb, setSelectedSuburb] = useState<LocationData | null>(null)

  useEffect(() => {
    async function fetchLocations() {
      try {
        const response = await fetch("/api/location", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "get-location-data",
            userId,
            userEmail,
          }),
        })

        const data = await response.json()

        if (data.success) {
          setLocations(data.locationData || [])
        } else {
          setError(data.error || "Failed to fetch suburb data")
        }
      } catch (err) {
        setError("An error occurred while fetching suburb data")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    if (userId && userEmail) {
      fetchLocations()
    }
  }, [userId, userEmail])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-800">
        <p className="font-medium">Error loading suburb data</p>
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  if (locations.length === 0) {
    return (
      <div className="rounded-lg bg-gray-50 p-8 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No suburb profiles yet</h3>
        <p className="mt-1 text-sm text-gray-500">
          Use the Chat Assistant to research and save suburb data
        </p>
      </div>
    )
  }

  // Group locations by state
  const locationsByState = locations.reduce((acc, location) => {
    const state = location.state
    if (!acc[state]) {
      acc[state] = []
    }
    acc[state].push(location)
    return acc
  }, {} as Record<string, LocationData[]>)

  // Sort states alphabetically
  const sortedStates = Object.keys(locationsByState).sort()

  return (
    <div className="space-y-8">
      {sortedStates.map((state) => (
        <div key={state} className="space-y-4">
          {/* State Header */}
          <div className="border-b border-gray-200 pb-2">
            <h2 className="text-xl font-bold text-gray-900">{state}</h2>
            <p className="text-sm text-gray-500">
              {locationsByState[state].length} suburb{locationsByState[state].length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Grid of suburb cards for this state */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {locationsByState[state].map((location) => (
              <button
                key={location.id}
                onClick={() => setSelectedSuburb(location)}
                className="rounded-lg bg-white p-4 shadow-sm transition-all hover:shadow-md text-left"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {location.suburbName}
                    </h3>
                    <p className="text-sm text-gray-500">{location.state}</p>
                  </div>
                  {location.isFavorite && (
                    <svg
                      className="h-5 w-5 text-yellow-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  )}
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Median House</span>
                    <span className="font-medium text-gray-900">
                      ${location.medianHousePrice.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Median Unit</span>
                    <span className="font-medium text-gray-900">
                      ${location.medianUnitPrice.toLocaleString()}
                    </span>
                  </div>
                  {location.vacancyRate > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Vacancy Rate</span>
                      <span className="font-medium text-gray-900">
                        {location.vacancyRate}%
                      </span>
                    </div>
                  )}
                </div>

                {location.demographicLifestyle && (
                  <div className="mt-3 rounded bg-blue-50 px-2 py-1">
                    <p className="text-xs text-blue-700 font-medium">
                      Includes demographic & lifestyle data
                    </p>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Detailed Modal */}
      {selectedSuburb && (
        <SuburbDetailModal
          suburb={selectedSuburb}
          onClose={() => setSelectedSuburb(null)}
        />
      )}
    </div>
  )
}

function SuburbDetailModal({
  suburb,
  onClose,
}: {
  suburb: LocationData
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-30 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-4xl rounded-lg bg-white p-6 shadow-xl">
          {/* Header */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {suburb.suburbName}, {suburb.state}
              </h2>
              <p className="text-sm text-gray-500">
                Last updated: {new Date(suburb.updatedAt).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {/* Property Market Data */}
            <div>
              <h3 className="mb-3 text-lg font-semibold text-gray-900">
                Property Market Data
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-sm text-gray-600">Median House Price</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${suburb.medianHousePrice.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-sm text-gray-600">Median Unit Price</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${suburb.medianUnitPrice.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-sm text-gray-600">House Rental (weekly)</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${suburb.rentalPriceHouse.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-sm text-gray-600">Unit Rental (weekly)</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${suburb.rentalPriceUnit.toLocaleString()}
                  </p>
                </div>
                {suburb.vacancyRate > 0 && (
                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-sm text-gray-600">Vacancy Rate</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {suburb.vacancyRate}%
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Demographic & Lifestyle */}
            {suburb.demographicLifestyle && (
              <div>
                <h3 className="mb-3 text-lg font-semibold text-gray-900">
                  Demographics & Lifestyle
                </h3>
                <div className="rounded-lg bg-blue-50 p-4">
                  <p className="whitespace-pre-wrap text-sm text-gray-700">
                    {suburb.demographicLifestyle}
                  </p>
                </div>
              </div>
            )}

            {/* Notes */}
            {suburb.notes && (
              <div>
                <h3 className="mb-3 text-lg font-semibold text-gray-900">Notes</h3>
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="whitespace-pre-wrap text-sm text-gray-700">
                    {suburb.notes}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
