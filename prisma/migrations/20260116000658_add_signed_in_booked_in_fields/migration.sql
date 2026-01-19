-- AlterTable
ALTER TABLE "child-details" ADD COLUMN     "bookedIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "signedIn" BOOLEAN NOT NULL DEFAULT false;
