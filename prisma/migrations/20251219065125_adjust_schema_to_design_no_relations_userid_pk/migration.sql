/*
  Warnings:

  - The primary key for the `user_training_flows` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `user_training_flows` table. All the data in the column will be lost.
  - The `trainingId` column on the `user_training_flows` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'UPDATE';

-- DropForeignKey
ALTER TABLE "attachments" DROP CONSTRAINT "attachments_userId_fkey";

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_userId_fkey";

-- DropForeignKey
ALTER TABLE "feedbacks" DROP CONSTRAINT "feedbacks_userId_fkey";

-- DropForeignKey
ALTER TABLE "profiles" DROP CONSTRAINT "profiles_userId_fkey";

-- DropForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_userId_fkey";

-- DropForeignKey
ALTER TABLE "user_training_flows" DROP CONSTRAINT "user_training_flows_ojsAccountId_fkey";

-- DropForeignKey
ALTER TABLE "user_training_flows" DROP CONSTRAINT "user_training_flows_statusCode_fkey";

-- DropForeignKey
ALTER TABLE "user_training_flows" DROP CONSTRAINT "user_training_flows_trainingId_fkey";

-- DropForeignKey
ALTER TABLE "user_training_flows" DROP CONSTRAINT "user_training_flows_userId_fkey";

-- DropIndex
DROP INDEX "user_training_flows_userId_key";

-- AlterTable
ALTER TABLE "user_training_flows" DROP CONSTRAINT "user_training_flows_pkey",
DROP COLUMN "id",
DROP COLUMN "trainingId",
ADD COLUMN     "trainingId" INTEGER,
ALTER COLUMN "isLocked" DROP NOT NULL,
ADD CONSTRAINT "user_training_flows_pkey" PRIMARY KEY ("userId");
