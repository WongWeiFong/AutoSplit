/*
  Warnings:

  - You are about to drop the column `password` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "bills" ALTER COLUMN "total_amount" SET DEFAULT 0,
ALTER COLUMN "rounding" DROP NOT NULL,
ALTER COLUMN "rounding" SET DEFAULT 0,
ALTER COLUMN "subtotal" DROP NOT NULL,
ALTER COLUMN "subtotal" SET DEFAULT 0,
ALTER COLUMN "tax" DROP NOT NULL,
ALTER COLUMN "tax" SET DEFAULT 0,
ALTER COLUMN "totla_discount" DROP NOT NULL,
ALTER COLUMN "totla_discount" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "password";
