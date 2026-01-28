/*
  Warnings:

  - You are about to drop the column `participant_id` on the `bill_splits` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[bill_item_id,user_id]` on the table `bill_splits` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[bill_id,user_id]` on the table `participants` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `user_id` to the `bill_splits` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "bill_splits" DROP CONSTRAINT "bill_splits_participant_id_fkey";

-- DropIndex
DROP INDEX "bill_splits_bill_item_id_participant_id_key";

-- AlterTable
ALTER TABLE "bill_splits" DROP COLUMN "participant_id",
ADD COLUMN     "user_id" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "bill_splits_bill_item_id_user_id_key" ON "bill_splits"("bill_item_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "participants_bill_id_user_id_key" ON "participants"("bill_id", "user_id");

-- AddForeignKey
ALTER TABLE "bill_splits" ADD CONSTRAINT "bill_splits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
