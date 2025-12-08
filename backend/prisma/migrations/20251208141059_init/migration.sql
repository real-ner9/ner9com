-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "instagramHandle" TEXT NOT NULL,
    "instagramSlug" TEXT NOT NULL,
    "lastSubmissionAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramHandle" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramHandle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Participant_instagramSlug_key" ON "Participant"("instagramSlug");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramHandle_slug_key" ON "TelegramHandle"("slug");

-- CreateIndex
CREATE INDEX "TelegramHandle_participantId_idx" ON "TelegramHandle"("participantId");

-- AddForeignKey
ALTER TABLE "TelegramHandle" ADD CONSTRAINT "TelegramHandle_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
