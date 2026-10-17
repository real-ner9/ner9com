/*
  Warnings:

  - You are about to drop the `Participant` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TelegramHandle` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "TelegramHandle" DROP CONSTRAINT "TelegramHandle_participantId_fkey";

-- DropTable
DROP TABLE "Participant";

-- DropTable
DROP TABLE "TelegramHandle";
