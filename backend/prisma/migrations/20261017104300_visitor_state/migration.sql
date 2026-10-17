-- CreateTable
CREATE TABLE "VisitorState" (
    "id" UUID NOT NULL,
    "state" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisitorState_pkey" PRIMARY KEY ("id")
);
