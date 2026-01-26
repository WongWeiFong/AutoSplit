/*
  Warnings:

  - You are about to drop the column `bill_id` on the `participants` table. All the data in the column will be lost.
  - You are about to drop the column `display_name` on the `participants` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `participants` table. All the data in the column will be lost.
  - You are about to drop the `split_rules` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `quantity` on table `bill_items` required. This step will fail if there are existing NULL values in that column.
  - Made the column `unit_price` on table `bill_items` required. This step will fail if there are existing NULL values in that column.
  - Made the column `total_price` on table `bill_items` required. This step will fail if there are existing NULL values in that column.
  - Made the column `discount` on table `bill_items` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `rounding` to the `bills` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subtotal` to the `bills` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tax` to the `bills` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalDiscount` to the `bills` table without a default value. This is not possible if the table is not empty.
  - Added the required column `billId` to the `participants` table without a default value. This is not possible if the table is not empty.
  - Added the required column `displayName` to the `participants` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "participants" DROP CONSTRAINT "participants_bill_id_fkey";

-- DropForeignKey
ALTER TABLE "participants" DROP CONSTRAINT "participants_user_id_fkey";

-- DropForeignKey
ALTER TABLE "split_rules" DROP CONSTRAINT "split_rules_bill_id_fkey";

-- DropForeignKey
ALTER TABLE "split_rules" DROP CONSTRAINT "split_rules_bill_item_id_fkey";

-- DropForeignKey
ALTER TABLE "split_rules" DROP CONSTRAINT "split_rules_participant_id_fkey";

-- AlterTable
ALTER TABLE "bill_items" ALTER COLUMN "quantity" SET NOT NULL,
ALTER COLUMN "unit_price" SET NOT NULL,
ALTER COLUMN "total_price" SET NOT NULL,
ALTER COLUMN "discount" SET NOT NULL;

-- AlterTable
ALTER TABLE "bills" ADD COLUMN     "rounding" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "subtotal" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "tax" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "totalDiscount" DECIMAL(65,30) NOT NULL;

-- AlterTable
ALTER TABLE "participants" DROP COLUMN "bill_id",
DROP COLUMN "display_name",
DROP COLUMN "user_id",
ADD COLUMN     "billId" TEXT NOT NULL,
ADD COLUMN     "displayName" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT;

-- DropTable
DROP TABLE "split_rules";

-- CreateTable
CREATE TABLE "bill_splits" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "billItemId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "bill_splits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bill_splits_billItemId_participantId_key" ON "bill_splits"("billItemId", "participantId");

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_billId_fkey" FOREIGN KEY ("billId") REFERENCES "bills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_splits" ADD CONSTRAINT "bill_splits_billId_fkey" FOREIGN KEY ("billId") REFERENCES "bills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_splits" ADD CONSTRAINT "bill_splits_billItemId_fkey" FOREIGN KEY ("billItemId") REFERENCES "bill_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_splits" ADD CONSTRAINT "bill_splits_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
