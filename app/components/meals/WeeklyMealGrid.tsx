"use client"

import { MealCard } from "./MealCard"

interface Meal {
  id: string
  name: string
  description: string | null
  category: string
  allergyInfo: string | null
  prepTime: number | null
  isTemplate: boolean
}

interface MealPlanEntry {
  id: string
  dayOfWeek: number
  mealTime: string
  meal: Meal
}

interface WeeklyMealGridProps {
  entries: MealPlanEntry[]
  onCellClick?: (dayOfWeek: number, mealTime: string) => void
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
const MEAL_TIMES = ["breakfast", "lunch", "dinner", "snack"]

export function WeeklyMealGrid({ entries, onCellClick }: WeeklyMealGridProps) {
  // Helper to get meal for specific day/time
  const getMealForSlot = (day: number, mealTime: string) => {
    return entries.find((entry) => entry.dayOfWeek === day && entry.mealTime === mealTime)
  }

  return (
    <div className="rounded-lg bg-white shadow-sm overflow-hidden">
      {/* Day Headers */}
      <div className="grid grid-cols-8 border-b border-gray-200 bg-gray-50">
        <div className="p-3 text-sm font-semibold text-gray-700">{/* Empty corner */}</div>
        {DAYS.map((day, index) => (
          <div key={day} className="p-3 text-center text-sm font-semibold text-gray-700">
            {day}
          </div>
        ))}
      </div>

      {/* Meal Time Rows */}
      {MEAL_TIMES.map((mealTime) => (
        <div key={mealTime} className="grid grid-cols-8 border-b border-gray-200 last:border-b-0">
          {/* Meal Time Label */}
          <div className="flex items-center justify-center border-r border-gray-200 bg-gray-50 p-3">
            <span className="text-sm font-semibold capitalize text-gray-700">{mealTime}</span>
          </div>

          {/* Day Cells */}
          {DAYS.map((_, dayIndex) => {
            const entry = getMealForSlot(dayIndex, mealTime)

            return (
              <div
                key={`${dayIndex}-${mealTime}`}
                onClick={() => onCellClick?.(dayIndex, mealTime)}
                className={`min-h-[100px] border-r border-gray-100 p-2 last:border-r-0 ${
                  onCellClick ? "cursor-pointer hover:bg-gray-50" : ""
                }`}
              >
                {entry ? (
                  <MealCard meal={entry.meal} />
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-400">
                    <span className="text-xs">+</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
