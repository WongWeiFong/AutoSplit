/*
  Warnings:

  - You are about to drop the `Trip` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TripMember` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `paid_by` to the `bills` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Trip" DROP CONSTRAINT "Trip_created_by_fkey";

-- DropForeignKey
ALTER TABLE "TripMember" DROP CONSTRAINT "TripMember_trip_id_fkey";

-- DropForeignKey
ALTER TABLE "TripMember" DROP CONSTRAINT "TripMember_user_id_fkey";

-- DropForeignKey
ALTER TABLE "bills" DROP CONSTRAINT "bills_trip_id_fkey";

-- AlterTable
ALTER TABLE "bills" ADD COLUMN     "paid_by" TEXT NOT NULL;

-- DropTable
DROP TABLE "Trip";

-- DropTable
DROP TABLE "TripMember";

-- CreateTable
CREATE TABLE "trip" (
    "id" TEXT NOT NULL,
    "trip_name" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_member" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "trip_member_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trip_member_trip_id_user_id_key" ON "trip_member"("trip_id", "user_id");

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_paid_by_fkey" FOREIGN KEY ("paid_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip" ADD CONSTRAINT "trip_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_member" ADD CONSTRAINT "trip_member_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_member" ADD CONSTRAINT "trip_member_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
