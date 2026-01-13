import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getUserProfile } from "@/app/actions/users"
import { getChildren } from "@/app/actions/children"
import { UserProfileCard } from "@/app/components/UserProfileCard"
import { ChildCard } from "@/app/components/ChildCard"

export default async function ProfilePage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/auth/signin")
  }

  // Fetch user profile and children data
  const user = await getUserProfile()
  const children = await getChildren()

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Profile
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your account and linked children
          </p>
        </div>

        {/* Profile Section */}
        <div className="mb-8 mx-auto max-w-2xl">
          <UserProfileCard user={user} />
        </div>

        {/* Children Section */}
        <div>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Your Children
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Linked child accounts
            </p>
          </div>

          {children.length === 0 ? (
            <div className="rounded-lg bg-white p-8 shadow-sm text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <span className="text-3xl">👶</span>
              </div>
              <p className="text-gray-600 font-medium">No children linked yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Add a child to get started tracking events and activities
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {children.map((child) => (
                <ChildCard key={child.id} child={child} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
