-- CreateTable
CREATE TABLE "Review" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(40) NOT NULL,
    "text" VARCHAR(1000) NOT NULL,
    "rating" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ban" (
    "id" SERIAL NOT NULL,
    "ip" VARCHAR(64) NOT NULL,
    "input" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unbannedAt" TIMESTAMP(3),

    CONSTRAINT "Ban_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Ban_ip_idx" ON "Ban"("ip");
