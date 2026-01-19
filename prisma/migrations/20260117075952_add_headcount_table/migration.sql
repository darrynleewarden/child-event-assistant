-- CreateTable
CREATE TABLE "headcounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "headcounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "headcount-children" (
    "id" TEXT NOT NULL,
    "headcountId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "headcount-children_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "headcount-children_headcountId_childId_key" ON "headcount-children"("headcountId", "childId");

-- AddForeignKey
ALTER TABLE "headcounts" ADD CONSTRAINT "headcounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "headcount-children" ADD CONSTRAINT "headcount-children_headcountId_fkey" FOREIGN KEY ("headcountId") REFERENCES "headcounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "headcount-children" ADD CONSTRAINT "headcount-children_childId_fkey" FOREIGN KEY ("childId") REFERENCES "child-details"("id") ON DELETE CASCADE ON UPDATE CASCADE;
