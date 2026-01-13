"use client"

// Helper function to format date
function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-AU", {
    month: "long",
    year: "numeric",
  })
}

interface UserProfileCardProps {
  user: {
    id: string
    name: string | null
    email: string
    emailVerified: Date | null
    image: string | null
    createdAt: Date
    updatedAt: Date
  }
}

export function UserProfileCard({ user }: UserProfileCardProps) {
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n.charAt(0))
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email.charAt(0).toUpperCase()

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 text-purple-600 font-semibold text-2xl flex-shrink-0">
          {user.image ? (
            <img
              src={user.image}
              alt={user.name || "User avatar"}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            initials
          )}
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-gray-900">
            {user.name || "User"}
          </h2>
          <p className="text-gray-600 mt-1">{user.email}</p>

          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Email Status:</span>
              {user.emailVerified ? (
                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                  ✓ Verified
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                  Pending
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Member Since:</span>
              <span className="text-gray-900 font-medium">
                {formatDate(user.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
