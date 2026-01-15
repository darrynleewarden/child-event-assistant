"use server"

import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { startOfWeek, endOfWeek } from "date-fns"

// ========== READ OPERATIONS ==========

export async function getMeals() {
  const session = await auth()

  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  const meals = await prisma.meal.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  return meals
}

export async function getMealTemplates() {
  const meals = await prisma.meal.findMany({
    where: {
      isTemplate: true,
    },
    orderBy: {
      name: "asc",
    },
  })

  return meals
}

export async function getActiveMealPlan() {
  const session = await auth()

  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  // Get all active meal plans for the user
  const mealPlans = await prisma.mealPlan.findMany({
    where: {
      userId: session.user.id,
      isActive: true,
    },
    include: {
      entries: {
        include: {
          meal: true,
        },
        orderBy: [{ dayOfWeek: "asc" }, { mealTime: "asc" }],
      },
      childPlans: {
        include: {
          child: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              allergies: true,
            },
          },
        },
      },
    },
    orderBy: {
      startDate: "desc",
    },
    take: 1,
  })

  return mealPlans[0] || null
}

export async function getMealPlanForWeek(date: Date) {
  const session = await auth()

  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  const weekStart = startOfWeek(date, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 })

  // Find meal plans that overlap with this week
  const mealPlan = await prisma.mealPlan.findFirst({
    where: {
      userId: session.user.id,
      startDate: {
        lte: weekEnd,
      },
      endDate: {
        gte: weekStart,
      },
    },
    include: {
      entries: {
        include: {
          meal: true,
        },
        orderBy: [{ dayOfWeek: "asc" }, { mealTime: "asc" }],
      },
      childPlans: {
        include: {
          child: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              allergies: true,
            },
          },
        },
      },
    },
    orderBy: {
      startDate: "desc",
    },
  })

  return mealPlan
}

export async function getMealPlan(planId: string) {
  const session = await auth()

  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  const mealPlan = await prisma.mealPlan.findFirst({
    where: {
      id: planId,
      userId: session.user.id,
    },
    include: {
      entries: {
        include: {
          meal: true,
        },
        orderBy: [{ dayOfWeek: "asc" }, { mealTime: "asc" }],
      },
      childPlans: {
        include: {
          child: true,
        },
      },
    },
  })

  if (!mealPlan) {
    throw new Error("Meal plan not found")
  }

  return mealPlan
}

export async function getWeeklyMeals(startDate: Date) {
  const session = await auth()

  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  const weekStart = startOfWeek(startDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(startDate, { weekStartsOn: 1 })

  const mealPlan = await prisma.mealPlan.findFirst({
    where: {
      userId: session.user.id,
      startDate: weekStart,
      endDate: weekEnd,
    },
    include: {
      entries: {
        include: {
          meal: true,
        },
      },
    },
  })

  return mealPlan
}

// ========== WRITE OPERATIONS ==========

export async function createMeal(data: {
  name: string
  description?: string
  ingredients?: string
  category: string
  allergyInfo?: string
  prepTime?: number
  isTemplate?: boolean
}) {
  const session = await auth()

  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  if (!data.name || data.name.trim().length === 0) {
    throw new Error("Meal name is required")
  }

  const meal = await prisma.meal.create({
    data: {
      ...data,
      userId: session.user.id,
    },
  })

  revalidatePath("/meals")
  return meal
}

export async function updateMeal(
  id: string,
  data: {
    name?: string
    description?: string
    ingredients?: string
    category?: string
    allergyInfo?: string
    prepTime?: number
    isTemplate?: boolean
  }
) {
  const session = await auth()

  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  // Verify the meal belongs to the user
  const existingMeal = await prisma.meal.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
  })

  if (!existingMeal) {
    throw new Error("Meal not found")
  }

  const meal = await prisma.meal.update({
    where: { id },
    data,
  })

  revalidatePath("/meals")
  return meal
}

export async function deleteMeal(id: string) {
  const session = await auth()

  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  // Verify the meal belongs to the user
  const existingMeal = await prisma.meal.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
  })

  if (!existingMeal) {
    throw new Error("Meal not found")
  }

  await prisma.meal.delete({
    where: { id },
  })

  revalidatePath("/meals")
}

export async function createMealPlan(startDate: Date) {
  const session = await auth()

  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  const weekStart = startOfWeek(startDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(startDate, { weekStartsOn: 1 })

  // Check if a meal plan already exists for this week
  const existing = await prisma.mealPlan.findFirst({
    where: {
      userId: session.user.id,
      startDate: weekStart,
      endDate: weekEnd,
    },
  })

  if (existing) {
    return existing
  }

  const mealPlan = await prisma.mealPlan.create({
    data: {
      userId: session.user.id,
      name: `Week of ${weekStart.toLocaleDateString()}`,
      startDate: weekStart,
      endDate: weekEnd,
      isActive: true,
    },
  })

  // Note: revalidatePath removed because this function is called during render
  return mealPlan
}

export async function addMealToDay(
  mealPlanId: string,
  mealId: string,
  dayOfWeek: number,
  mealTime: string
) {
  const session = await auth()

  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  // Verify the meal plan belongs to the user
  const mealPlan = await prisma.mealPlan.findFirst({
    where: {
      id: mealPlanId,
      userId: session.user.id,
    },
  })

  if (!mealPlan) {
    throw new Error("Meal plan not found")
  }

  // Check if an entry already exists for this day/time
  const existing = await prisma.mealPlanEntry.findUnique({
    where: {
      mealPlanId_dayOfWeek_mealTime: {
        mealPlanId,
        dayOfWeek,
        mealTime,
      },
    },
  })

  if (existing) {
    // Update existing entry
    const entry = await prisma.mealPlanEntry.update({
      where: { id: existing.id },
      data: { mealId },
      include: { meal: true },
    })
    revalidatePath("/meals")
    return entry
  }

  // Create new entry
  const entry = await prisma.mealPlanEntry.create({
    data: {
      mealPlanId,
      mealId,
      dayOfWeek,
      mealTime,
    },
    include: { meal: true },
  })

  revalidatePath("/meals")
  return entry
}

export async function removeMealFromDay(entryId: string) {
  const session = await auth()

  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  // Verify the entry belongs to a meal plan owned by the user
  const entry = await prisma.mealPlanEntry.findUnique({
    where: { id: entryId },
    include: {
      mealPlan: true,
    },
  })

  if (!entry || entry.mealPlan.userId !== session.user.id) {
    throw new Error("Meal plan entry not found")
  }

  await prisma.mealPlanEntry.delete({
    where: { id: entryId },
  })

  revalidatePath("/meals")
}
