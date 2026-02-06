import { auth } from "@/lib/dev-auth"
import { redirect } from "next/navigation"
import { getMealPlanForWeek, createMealPlan } from "@/app/actions/meals"
import { WeeklyMealGrid } from "@/app/components/meals/WeeklyMealGrid"
import Link from "next/link"
import { addWeeks, startOfWeek } from "date-fns"
import WeekNavigator from "@/app/components/meals/WeekNavigator"

export default async function MealsPage(props: {
  searchParams: Promise<{ week?: string }>
}) {
  const searchParams = await props.searchParams
  const session = await auth()

  if (!session?.user) {
    redirect("/auth/signin")
  }

  // Calculate the target week based on the week offset
  const weekOffset = searchParams.week ? parseInt(searchParams.week) : 0
  const targetDate = addWeeks(new Date(), weekOffset)

  // Get or create meal plan for the target week
  let mealPlan = await getMealPlanForWeek(targetDate)

  console.log('Target date:', targetDate)
  console.log('Meal plan found:', mealPlan ? `${mealPlan.id} - ${mealPlan.name}` : 'null')
  console.log('Entries count:', mealPlan?.entries?.length || 0)

  if (!mealPlan) {
    // Create a new meal plan for this week
    await createMealPlan(targetDate)
    // Fetch it with entries
    mealPlan = await getMealPlanForWeek(targetDate)
    console.log('Created new meal plan:', mealPlan ? `${mealPlan.id} - ${mealPlan.name}` : 'null')
  }

  const entries = mealPlan?.entries || []

  return (
    <div className="mx-auto max-w-7xl">
      {/* Page Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Meal Planner
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Plan your family's weekly meals
          </p>
        </div>

        <Link
          href="/meals/library"
          className="inline-flex items-center justify-center rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        >
          Meal Library
        </Link>
      </div>

      {/* Week Navigation */}
      <WeekNavigator currentWeekOffset={weekOffset} />

      {/* Debug Info */}
      <div className="mb-4 rounded-lg bg-blue-50 p-4 text-sm">
        <h3 className="font-semibold text-blue-900 mb-2">Debug Info:</h3>
        <div className="space-y-1 text-blue-800">
          <p>Week Offset: {weekOffset}</p>
          <p>Target Date: {targetDate.toISOString()}</p>
          <p>Meal Plan: {mealPlan ? `${mealPlan.id} - ${mealPlan.name}` : 'None'}</p>
          <p>Start Date: {mealPlan ? new Date(mealPlan.startDate).toISOString() : 'N/A'}</p>
          <p>End Date: {mealPlan ? new Date(mealPlan.endDate).toISOString() : 'N/A'}</p>
          <p>Entries Count: {entries.length}</p>
          {entries.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer font-semibold">View Entries</summary>
              <pre className="mt-2 text-xs">{JSON.stringify(entries, null, 2)}</pre>
            </details>
          )}
        </div>
      </div>

      {/* Weekly Meal Grid */}
      <WeeklyMealGrid entries={entries} />

      {/* Info Cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <h3 className="text-sm font-medium text-gray-900">Quick Actions</h3>
          <ul className="mt-2 space-y-2 text-sm text-gray-600">
            <li>• Click a cell to add a meal</li>
            <li>• Visit the Meal Library to create meals</li>
            <li>• Use templates for quick planning</li>
          </ul>
        </div>

        {
          mealPlan && mealPlan.childPlans.length > 0 && (
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <h3 className="text-sm font-medium text-gray-900">Linked Children</h3>
              <ul className="mt-2 space-y-1 text-sm text-gray-600">
                {mealPlan.childPlans.map((cp) => (
                  <li key={cp.id}>
                    • {cp.child.firstName} {cp.child.lastName}
                  </li>
                ))}
              </ul>
            </div>
          )
        }

        <div className="rounded-lg bg-purple-50 p-4 shadow-sm">
          <h3 className="text-sm font-medium text-purple-900">Tips</h3>
          <p className="mt-2 text-sm text-purple-700">
            Plan meals in advance to save time and ensure balanced nutrition for your family.
          </p>
        </div>
      </div>
    </div>
  )
}
