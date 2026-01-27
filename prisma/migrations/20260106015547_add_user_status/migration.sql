/*
  Warnings:

  - You are about to drop the column `isActive` on the `users` table. All the data in the column will be lost.
  - Changed the type of `type` on the `attachments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "AttachmentType" AS ENUM ('PAYMENT', 'KTM', 'ARTICLE', 'LOA');

-- AlterTable
ALTER TABLE "attachments" DROP COLUMN "type",
ADD COLUMN     "type" "AttachmentType" NOT NULL;

-- AlterTable
ALTER TABLE "user_training_flows" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "trainingId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "isActive",
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "attachments_userId_type_idx" ON "attachments"("userId", "type");

-- CreateIndex
CREATE INDEX "user_training_flows_trainingId_idx" ON "user_training_flows"("trainingId");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_training_flows" ADD CONSTRAINT "user_training_flows_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_training_flows" ADD CONSTRAINT "user_training_flows_statusCode_fkey" FOREIGN KEY ("statusCode") REFERENCES "lookup_status"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_training_flows" ADD CONSTRAINT "user_training_flows_trainingId_fkey" FOREIGN KEY ("trainingId") REFERENCES "trainings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_training_flows" ADD CONSTRAINT "user_training_flows_ojsAccountId_fkey" FOREIGN KEY ("ojsAccountId") REFERENCES "ojs_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
