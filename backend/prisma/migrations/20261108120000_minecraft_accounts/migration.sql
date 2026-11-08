-- CreateTable
CREATE TABLE "MinecraftAccount" (
    "id" SERIAL NOT NULL,
    "tgId" VARCHAR(20) NOT NULL,
    "nickname" VARCHAR(16) NOT NULL,
    "nicknameKey" VARCHAR(16) NOT NULL,
    "language" VARCHAR(2) NOT NULL DEFAULT 'ru',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MinecraftAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MinecraftTrustedIp" (
    "id" SERIAL NOT NULL,
    "accountId" INTEGER NOT NULL,
    "ip" VARCHAR(64) NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MinecraftTrustedIp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MinecraftAccount_tgId_key" ON "MinecraftAccount"("tgId");

-- CreateIndex
CREATE UNIQUE INDEX "MinecraftAccount_nicknameKey_key" ON "MinecraftAccount"("nicknameKey");

-- CreateIndex
CREATE UNIQUE INDEX "MinecraftTrustedIp_accountId_ip_key" ON "MinecraftTrustedIp"("accountId", "ip");

-- AddForeignKey
ALTER TABLE "MinecraftTrustedIp" ADD CONSTRAINT "MinecraftTrustedIp_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "MinecraftAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
