import { randomBytes } from 'node:crypto'
import fp from 'fastify-plugin'
import cookie from '@fastify/cookie'
import type { FastifyReply, FastifyRequest } from 'fastify'

/**
 * Who is signed in (through Telegram, routes/auth): a signed `ner9_session` cookie holding the
 * Telegram user, no server-side session store. SESSION_SECRET signs it; without one a random
 * secret is used, so sessions only last until the next restart.
 */
export interface SessionUser {
  /** Telegram user id, as a string (it can exceed 2^31). */
  id: string
  name: string
  username: string | null
  photoUrl: string | null
}

declare module 'fastify' {
  interface FastifyRequest {
    user: SessionUser | null
  }
}

const COOKIE = 'ner9_session'
const MAX_AGE_S = 365 * 24 * 60 * 60

export function setSession(reply: FastifyReply, user: SessionUser) {
  reply.setCookie(COOKIE, JSON.stringify(user), {
    signed: true,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_S
  })
}

export function clearSession(reply: FastifyReply) {
  reply.clearCookie(COOKIE, { path: '/' })
}

/** The site's owner: signed in with the Telegram account in OWNER_TELEGRAM_ID. */
export const isOwner = (request: FastifyRequest) =>
  Boolean(request.user && request.user.id === process.env.OWNER_TELEGRAM_ID)

export default fp(async (fastify) => {
  let secret = process.env.SESSION_SECRET
  if (!secret) {
    secret = randomBytes(32).toString('hex')
    fastify.log.warn('SESSION_SECRET is not set: sign-ins last until the next restart')
  }
  await fastify.register(cookie, { secret })

  fastify.decorateRequest('user', null)
  fastify.addHook('onRequest', async (request) => {
    const raw = request.cookies[COOKIE]
    if (!raw) return
    const unsigned = request.unsignCookie(raw)
    if (!unsigned.valid || !unsigned.value) return
    try {
      request.user = JSON.parse(unsigned.value) as SessionUser
    } catch {
      // A broken cookie is just no session.
    }
  })
})
