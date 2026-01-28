/*
  Warnings:

  - You are about to drop the column `billId` on the `bill_splits` table. All the data in the column will be lost.
  - You are about to drop the column `billItemId` on the `bill_splits` table. All the data in the column will be lost.
  - You are about to drop the column `participantId` on the `bill_splits` table. All the data in the column will be lost.
  - You are about to drop the column `totla_discount` on the `bills` table. All the data in the column will be lost.
  - You are about to drop the column `billId` on the `participants` table. All the data in the column will be lost.
  - You are about to drop the column `displayName` on the `participants` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `participants` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[bill_item_id,participant_id]` on the table `bill_splits` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `bill_id` to the `bill_splits` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bill_item_id` to the `bill_splits` table without a default value. This is not possible if the table is not empty.
  - Added the required column `participant_id` to the `bill_splits` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bill_id` to the `participants` table without a default value. This is not possible if the table is not empty.
  - Added the required column `display_name` to the `participants` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `participants` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "bill_splits" DROP CONSTRAINT "bill_splits_billId_fkey";

-- DropForeignKey
ALTER TABLE "bill_splits" DROP CONSTRAINT "bill_splits_billItemId_fkey";

-- DropForeignKey
ALTER TABLE "bill_splits" DROP CONSTRAINT "bill_splits_participantId_fkey";

-- DropForeignKey
ALTER TABLE "participants" DROP CONSTRAINT "participants_billId_fkey";

-- DropIndex
DROP INDEX "bill_splits_billItemId_participantId_key";

-- AlterTable
ALTER TABLE "bill_splits" DROP COLUMN "billId",
DROP COLUMN "billItemId",
DROP COLUMN "participantId",
ADD COLUMN     "bill_id" TEXT NOT NULL,
ADD COLUMN     "bill_item_id" TEXT NOT NULL,
ADD COLUMN     "participant_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "bills" DROP COLUMN "totla_discount",
ADD COLUMN     "total_discount" DECIMAL(65,30) DEFAULT 0;

-- AlterTable
ALTER TABLE "participants" DROP COLUMN "billId",
DROP COLUMN "displayName",
DROP COLUMN "userId",
ADD COLUMN     "bill_id" TEXT NOT NULL,
ADD COLUMN     "display_name" TEXT NOT NULL,
ADD COLUMN     "user_id" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "bill_splits_bill_item_id_participant_id_key" ON "bill_splits"("bill_item_id", "participant_id");

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_splits" ADD CONSTRAINT "bill_splits_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_splits" ADD CONSTRAINT "bill_splits_bill_item_id_fkey" FOREIGN KEY ("bill_item_id") REFERENCES "bill_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_splits" ADD CONSTRAINT "bill_splits_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
