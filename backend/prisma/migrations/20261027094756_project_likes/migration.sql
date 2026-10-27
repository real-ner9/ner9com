-- CreateTable
CREATE TABLE "ProjectLike" (
    "id" SERIAL NOT NULL,
    "project" VARCHAR(40) NOT NULL,
    "voter" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectLike_project_voter_key" ON "ProjectLike"("project", "voter");
