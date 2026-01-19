-- CreateTable
CREATE TABLE "child-details" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gender" TEXT,
    "allergies" TEXT,
    "medicalInfo" TEXT,
    "notes" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "child-details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "child-events" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "child-events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT NOT NULL,
    "notes" TEXT,
    "userId" TEXT NOT NULL,
    "childId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ingredients" TEXT,
    "category" TEXT NOT NULL,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "allergyInfo" TEXT,
    "prepTime" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal-plans" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meal-plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal-plan-entries" (
    "id" TEXT NOT NULL,
    "mealPlanId" TEXT NOT NULL,
    "mealId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "mealTime" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meal-plan-entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "child-meal-plans" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "mealPlanId" TEXT NOT NULL,
    "preferences" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "child-meal-plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location-data" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "suburbName" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "medianHousePrice" DOUBLE PRECISION NOT NULL,
    "medianUnitPrice" DOUBLE PRECISION NOT NULL,
    "rentalPriceHouse" DOUBLE PRECISION NOT NULL,
    "rentalPriceUnit" DOUBLE PRECISION NOT NULL,
    "vacancyRate" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "location-data_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meal-plan-entries_mealPlanId_dayOfWeek_mealTime_key" ON "meal-plan-entries"("mealPlanId", "dayOfWeek", "mealTime");

-- CreateIndex
CREATE UNIQUE INDEX "child-meal-plans_childId_mealPlanId_key" ON "child-meal-plans"("childId", "mealPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "location-data_userId_suburbName_state_key" ON "location-data"("userId", "suburbName", "state");

-- AddForeignKey
ALTER TABLE "child-details" ADD CONSTRAINT "child-details_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child-events" ADD CONSTRAINT "child-events_childId_fkey" FOREIGN KEY ("childId") REFERENCES "child-details"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_childId_fkey" FOREIGN KEY ("childId") REFERENCES "child-details"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meals" ADD CONSTRAINT "meals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal-plans" ADD CONSTRAINT "meal-plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal-plan-entries" ADD CONSTRAINT "meal-plan-entries_mealPlanId_fkey" FOREIGN KEY ("mealPlanId") REFERENCES "meal-plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal-plan-entries" ADD CONSTRAINT "meal-plan-entries_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "meals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child-meal-plans" ADD CONSTRAINT "child-meal-plans_childId_fkey" FOREIGN KEY ("childId") REFERENCES "child-details"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child-meal-plans" ADD CONSTRAINT "child-meal-plans_mealPlanId_fkey" FOREIGN KEY ("mealPlanId") REFERENCES "meal-plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location-data" ADD CONSTRAINT "location-data_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
