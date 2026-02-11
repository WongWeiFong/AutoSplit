-- AlterTable
ALTER TABLE "trip_member" ADD COLUMN     "left_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "trip_invite" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_invite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trip_invite_token_key" ON "trip_invite"("token");

-- AddForeignKey
ALTER TABLE "trip_invite" ADD CONSTRAINT "trip_invite_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
