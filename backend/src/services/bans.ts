import type { FastifyInstance, FastifyRequest } from 'fastify'

/**
 * IP bans for SQL injection attempts in the review field. Permanent until the visitor lifts it
 * themselves ("follow on Instagram", on trust). Active bans are kept in memory, so the check on
 * every request (and nginx's check on every page) costs nothing.
 */
let banned: Set<string> | null = null

async function bannedIps(fastify: FastifyInstance) {
  if (!banned) {
    const rows = await fastify.prisma.ban.findMany({
      where: { unbannedAt: null },
      select: { ip: true }
    })
    banned = new Set(rows.map((row) => row.ip))
  }
  return banned
}

/**
 * The visitor's IP. The site sits behind Cloudflare, which puts it in CF-Connecting-IP; nginx's
 * X-Real-IP (Cloudflare's own address there) and the socket are fallbacks for local runs.
 */
export function clientIp(request: FastifyRequest) {
  const header = (name: string) => {
    const value = request.headers[name]
    return (Array.isArray(value) ? value[0] : value)?.trim() || null
  }
  return header('cf-connecting-ip') ?? header('x-real-ip') ?? request.ip
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Who is voting or uploading: the anonymous visitor id from the ner9_visitor cookie (set by the
 * frontend), or the IP when there is none. One vote per visitor rather than per IP, so people
 * sharing a mobile carrier's IP can all vote.
 */
export function visitorKey(request: FastifyRequest) {
  const cookie = request.headers.cookie?.match(/(?:^|;\s*)ner9_visitor=([^;]+)/)?.[1]
  return cookie && UUID.test(cookie) ? `v:${cookie}` : `ip:${clientIp(request)}`
}

export async function isBanned(fastify: FastifyInstance, ip: string) {
  return (await bannedIps(fastify)).has(ip)
}

export async function ban(fastify: FastifyInstance, ip: string, input: string) {
  await fastify.prisma.ban.create({ data: { ip, input: input.slice(0, 500) } })
  ;(await bannedIps(fastify)).add(ip)
}

export async function unban(fastify: FastifyInstance, ip: string) {
  await fastify.prisma.ban.updateMany({
    where: { ip, unbannedAt: null },
    data: { unbannedAt: new Date() }
  })
  ;(await bannedIps(fastify)).delete(ip)
}
