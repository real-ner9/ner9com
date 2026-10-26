-- AlterTable
ALTER TABLE "Reply" ADD COLUMN     "authorPhoto" VARCHAR(512),
ADD COLUMN     "authorTgId" VARCHAR(20),
ADD COLUMN     "authorUsername" VARCHAR(64);

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "authorPhoto" VARCHAR(512),
ADD COLUMN     "authorTgId" VARCHAR(20),
ADD COLUMN     "authorUsername" VARCHAR(64),
ADD COLUMN     "isOwner" BOOLEAN NOT NULL DEFAULT false;
