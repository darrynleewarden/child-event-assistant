"use client"

interface Meal {
  id: string
  name: string
  description: string | null
  category: string
  allergyInfo: string | null
  prepTime: number | null
  isTemplate: boolean
}

interface MealCardProps {
  meal: Meal
  onClick?: () => void
  showAllergy?: boolean
  childAllergies?: string[]
}

// Helper function to get category color
function getCategoryColor(category: string) {
  const colors: Record<string, string> = {
    breakfast: "bg-yellow-100 border-yellow-300 text-yellow-800",
    lunch: "bg-green-100 border-green-300 text-green-800",
    dinner: "bg-blue-100 border-blue-300 text-blue-800",
    snack: "bg-orange-100 border-orange-300 text-orange-800",
  }
  return colors[category.toLowerCase()] || "bg-gray-100 border-gray-300 text-gray-800"
}

// Helper to check if meal has allergens
function hasAllergen(mealAllergyInfo: string | null, childAllergies?: string[]) {
  if (!mealAllergyInfo || !childAllergies || childAllergies.length === 0) {
    return false
  }

  try {
    const mealAllergens: string[] = JSON.parse(mealAllergyInfo)
    return mealAllergens.some((allergen) =>
      childAllergies.some((childAllergen) =>
        allergen.toLowerCase().includes(childAllergen.toLowerCase().trim())
      )
    )
  } catch {
    return false
  }
}

export function MealCard({ meal, onClick, showAllergy = false, childAllergies }: MealCardProps) {
  const categoryColor = getCategoryColor(meal.category)
  const hasAllergyWarning = showAllergy && hasAllergen(meal.allergyInfo, childAllergies)

  return (
    <div
      onClick={onClick}
      className={`rounded-lg bg-white p-4 shadow-sm transition-shadow ${
        onClick ? "cursor-pointer hover:shadow-md" : ""
      } ${hasAllergyWarning ? "border-2 border-red-300" : "border border-gray-200"}`}
    >
      {/* Allergy Warning */}
      {hasAllergyWarning && (
        <div className="mb-2 rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
          ⚠️ Allergy Warning
        </div>
      )}

      {/* Meal Name */}
      <h3 className="font-semibold text-gray-900 line-clamp-1">{meal.name}</h3>

      {/* Category Badge */}
      <div className="mt-2 flex items-center gap-2">
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${categoryColor}`}>
          {meal.category}
        </span>

        {meal.isTemplate && (
          <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
            Template
          </span>
        )}
      </div>

      {/* Description */}
      {meal.description && (
        <p className="mt-2 text-sm text-gray-600 line-clamp-2">{meal.description}</p>
      )}

      {/* Prep Time */}
      {meal.prepTime && (
        <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{meal.prepTime} min</span>
        </div>
      )}
    </div>
  )
}
