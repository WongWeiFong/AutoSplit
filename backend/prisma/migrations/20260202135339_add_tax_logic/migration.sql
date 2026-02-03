/*
  Warnings:

  - Added the required column `tax` to the `bill_items` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "bill_items" ADD COLUMN     "tax" DECIMAL(65,30) NOT NULL;

-- AlterTable
ALTER TABLE "bills" ADD COLUMN     "tax_percentage" DECIMAL(65,30) DEFAULT 0;
