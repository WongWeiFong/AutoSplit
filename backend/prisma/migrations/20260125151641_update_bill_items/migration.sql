-- AlterTable
ALTER TABLE "bill_items" ADD COLUMN     "discount" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;
