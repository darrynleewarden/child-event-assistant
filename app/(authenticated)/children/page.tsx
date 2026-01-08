import { getAllChildren } from "@/app/actions/children"
import { ChildCard } from "@/app/components/ChildCard"

export default async function ChildrenPage() {
  const children = await getAllChildren()

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Children
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage your children&apos;s information
            </p>
          </div>
          <button className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors">
            + Add Child
          </button>
        </div>

        {children.length === 0 ? (
          <div className="rounded-lg bg-white p-6 shadow-sm text-center">
            <p className="text-gray-600">No children added yet.</p>
            <p className="text-sm text-gray-500 mt-2">
              Click &quot;Add Child&quot; to get started.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {children.map((child) => (
              <ChildCard
                key={child.id}
                child={child}
              />
            ))}
          </div>
        )}

        {/* Summary Stats */}
        {children.length > 0 && (
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-purple-50 p-4">
              <p className="text-sm text-purple-600 font-medium">Total Children</p>
              <p className="text-2xl font-bold text-purple-900">{children.length}</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-4">
              <p className="text-sm text-blue-600 font-medium">Total Events</p>
              <p className="text-2xl font-bold text-blue-900">
                {children.reduce((sum, child) => sum + child.events.length, 0)}
              </p>
            </div>
            <div className="rounded-lg bg-green-50 p-4">
              <p className="text-sm text-green-600 font-medium">Data Source</p>
              <p className="text-lg font-bold text-green-900">AWS RDS</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
