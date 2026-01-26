/*
  Warnings:

  - You are about to drop the column `totalDiscount` on the `bills` table. All the data in the column will be lost.
  - Added the required column `totla_discount` to the `bills` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "bills" DROP COLUMN "totalDiscount",
ADD COLUMN     "totla_discount" DECIMAL(65,30) NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "password" TEXT NOT NULL;
