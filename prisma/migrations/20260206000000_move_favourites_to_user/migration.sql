-- AlterTable
ALTER TABLE "User" ADD COLUMN     "favourites" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "location-data" DROP COLUMN "isFavorite";
