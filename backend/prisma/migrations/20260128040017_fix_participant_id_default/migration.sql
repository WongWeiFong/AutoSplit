/*
  Warnings:

  - A unique constraint covering the columns `[bill_id,bill_item_id,user_id]` on the table `bill_splits` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "bill_splits" DROP CONSTRAINT "bill_splits_user_id_fkey";

-- DropIndex
DROP INDEX "bill_splits_bill_item_id_user_id_key";

-- CreateIndex
CREATE INDEX "bill_splits_bill_id_idx" ON "bill_splits"("bill_id");

-- CreateIndex
CREATE INDEX "bill_splits_user_id_idx" ON "bill_splits"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "bill_splits_bill_id_bill_item_id_user_id_key" ON "bill_splits"("bill_id", "bill_item_id", "user_id");

-- AddForeignKey
ALTER TABLE "bill_splits" ADD CONSTRAINT "bill_splits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
