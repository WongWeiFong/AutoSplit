-- DropForeignKey
ALTER TABLE "bill_items" DROP CONSTRAINT "bill_items_bill_id_fkey";

-- DropForeignKey
ALTER TABLE "bill_splits" DROP CONSTRAINT "bill_splits_bill_id_fkey";

-- DropForeignKey
ALTER TABLE "bill_splits" DROP CONSTRAINT "bill_splits_bill_item_id_fkey";

-- DropForeignKey
ALTER TABLE "bills" DROP CONSTRAINT "bills_trip_id_fkey";

-- DropForeignKey
ALTER TABLE "participants" DROP CONSTRAINT "participants_bill_id_fkey";

-- DropForeignKey
ALTER TABLE "receipts" DROP CONSTRAINT "receipts_bill_id_fkey";

-- DropForeignKey
ALTER TABLE "trip_invite" DROP CONSTRAINT "trip_invite_trip_id_fkey";

-- DropForeignKey
ALTER TABLE "trip_member" DROP CONSTRAINT "trip_member_trip_id_fkey";

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_items" ADD CONSTRAINT "bill_items_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_splits" ADD CONSTRAINT "bill_splits_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_splits" ADD CONSTRAINT "bill_splits_bill_item_id_fkey" FOREIGN KEY ("bill_item_id") REFERENCES "bill_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_invite" ADD CONSTRAINT "trip_invite_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_member" ADD CONSTRAINT "trip_member_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
