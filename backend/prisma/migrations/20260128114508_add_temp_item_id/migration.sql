/*
  Warnings:

  - Added the required column `client_item_id` to the `bill_items` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "bill_items" ADD COLUMN     "client_item_id" TEXT NOT NULL;
