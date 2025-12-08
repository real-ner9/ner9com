import fp from 'fastify-plugin'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { PrismaClient } from '@prisma/client'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }
}

const prismaPlugin = fp(async (fastify) => {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not defined')
  }

  const pool = new Pool({ connectionString: databaseUrl })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })
  await prisma.$connect()

  fastify.decorate('prisma', prisma)

  fastify.addHook('onClose', async (app) => {
    await app.prisma.$disconnect()
    await pool.end()
  })
})

export default prismaPlugin

