import { auth } from "@/lib/dev-auth"
import { redirect } from "next/navigation"
import { getMeals, getMealTemplates } from "@/app/actions/meals"
import { MealCard } from "@/app/components/meals/MealCard"
import Link from "next/link"

export default async function MealLibraryPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/auth/signin")
  }

  const [userMeals, templates] = await Promise.all([
    getMeals(),
    getMealTemplates(),
  ])

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Page Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Meal Library
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Browse and manage your meals
            </p>
          </div>

          <Link
            href="/meals"
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          >
            ← Back to Planner
          </Link>
        </div>

        {/* My Meals Section */}
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              My Meals ({userMeals.length})
            </h2>
            <button className="inline-flex items-center rounded-md bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700">
              + Create Meal
            </button>
          </div>

          {userMeals.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {userMeals.map((meal) => (
                <MealCard key={meal.id} meal={meal} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg bg-white p-8 text-center shadow-sm">
              <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <span className="text-3xl">🍽️</span>
              </div>
              <p className="text-gray-600 font-medium">No meals yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Create your first meal to get started
              </p>
            </div>
          )}
        </div>

        {/* Meal Templates Section */}
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Meal Templates ({templates.length})
            </h2>
            <p className="text-sm text-gray-600">
              Pre-made meal ideas to help you plan
            </p>
          </div>

          {templates.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {templates.map((meal) => (
                <MealCard key={meal.id} meal={meal} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg bg-white p-8 text-center shadow-sm">
              <p className="text-gray-600">No templates available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
