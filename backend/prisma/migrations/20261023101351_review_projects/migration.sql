-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "project" VARCHAR(40) NOT NULL DEFAULT 'kleshnya';

-- CreateIndex
CREATE INDEX "Review_project_createdAt_idx" ON "Review"("project", "createdAt");
