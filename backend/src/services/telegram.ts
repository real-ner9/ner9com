import { randomBytes } from 'node:crypto'
import type { FastifyBaseLogger } from 'fastify'
import type { SessionUser } from '../plugins/session'
import { storeImage, imageUrls } from './reviewImages'
import { storageEnabled } from './storage'

/**
 * Signing in through the Telegram bot, like the owner's tg-hound: the site asks for a one-time
 * link (t.me/<bot>?start=login_<token>), the visitor presses Start in Telegram, the bot (long
 * polling, no webhook or public URL needed) confirms the token with the visitor's account, and
 * the site, polling meanwhile, gets the session. No domain has to be set for the bot, but one bot
 * can only be polled by one backend: local dev and production need a bot each.
 * Configured by TELEGRAM_BOT_TOKEN and TELEGRAM_BOT_USERNAME.
 */
export const telegramBot = () => {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const username = process.env.TELEGRAM_BOT_USERNAME
  return token && username ? { token, username } : null
}

// --- One-time login links -------------------------------------------------------------------

const LINK_TTL_MS = 10 * 60 * 1000
const MAX_PENDING = 1000

interface PendingLogin {
  expiresAt: number
  user: SessionUser | null
}

/** Kept in memory: a restart only cancels logins that are in progress. */
const pending = new Map<string, PendingLogin>()

function dropExpired() {
  const now = Date.now()
  for (const [token, login] of pending) if (login.expiresAt < now) pending.delete(token)
}

export function startLogin(botUsername: string) {
  dropExpired()
  if (pending.size >= MAX_PENDING) return null
  const token = randomBytes(16).toString('hex')
  pending.set(token, { expiresAt: Date.now() + LINK_TTL_MS, user: null })
  return { token, url: `https://t.me/${botUsername}?start=login_${token}` }
}

/** What the polling page gets: the user once (the link is used up), until then "pending". */
export function takeLogin(token: string): SessionUser | 'pending' | 'expired' {
  const login = pending.get(token)
  if (!login || login.expiresAt < Date.now()) return 'expired'
  if (!login.user) return 'pending'
  pending.delete(token)
  return login.user
}

function confirmLogin(token: string, user: SessionUser) {
  const login = pending.get(token)
  if (!login || login.expiresAt < Date.now() || login.user) return false
  login.user = user
  return true
}

// --- The bot ----------------------------------------------------------------------------------

interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
}

interface Update {
  update_id: number
  message?: {
    text?: string
    chat: { id: number; type: string }
    from?: TelegramUser
  }
}

class TelegramError extends Error {
  constructor(
    message: string,
    readonly code: number
  ) {
    super(message)
  }
}

async function call<T>(token: string, method: string, body: object, signal?: AbortSignal) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal
  })
  const data = (await response.json()) as {
    ok: boolean
    result: T
    description?: string
  }
  if (!data.ok) throw new TelegramError(data.description ?? method, response.status)
  return data.result
}

/** The account's current profile photo, stored like review images (the bot's file links carry its token). */
async function storeAvatar(token: string, userId: number, log: FastifyBaseLogger) {
  if (!storageEnabled()) {
    log.warn('S3 is off, so the Telegram photo is not stored')
    return null
  }
  try {
    const photos = await call<{
      photos: { file_id: string; width: number }[][]
    }>(token, 'getUserProfilePhotos', { user_id: userId, limit: 1 })
    const sizes = photos.photos[0]
    if (!sizes?.length) {
      log.info({ userId }, 'Telegram account has no profile photo the bot can see')
      return null
    }
    const size = sizes.find((s) => s.width >= 160) ?? sizes[sizes.length - 1]
    const file = await call<{ file_path: string }>(token, 'getFile', {
      file_id: size.file_id
    })
    const image = await fetch(`https://api.telegram.org/file/bot${token}/${file.file_path}`)
    if (!image.ok) throw new Error(`photo download ${image.status}`)
    const { id } = await storeImage(Buffer.from(await image.arrayBuffer()))
    return imageUrls(id).thumbUrl
  } catch (error) {
    log.warn({ err: error }, 'Telegram photo could not be stored')
    return null
  }
}

const TEXTS = {
  ru: {
    done: (name: string) => `Готово ✅ Ты вошёл на ner9.com как ${name}. Возвращайся на сайт.`,
    expired: 'Ссылка устарела. Нажми «Войти через Telegram» на сайте ещё раз.',
    hello: 'Это бот для входа на ner9.com. Нажми «Войти через Telegram» на сайте.'
  },
  uk: {
    done: (name: string) => `Готово ✅ Ти увійшов на ner9.com як ${name}. Повертайся на сайт.`,
    expired: 'Посилання застаріло. Натисни «Увійти через Telegram» на сайті ще раз.',
    hello: 'Це бот для входу на ner9.com. Натисни «Увійти через Telegram» на сайті.'
  },
  en: {
    done: (name: string) =>
      `Done ✅ You're signed in to ner9.com as ${name}. Head back to the site.`,
    expired: 'The link has expired. Press "Sign in with Telegram" on the site again.',
    hello: 'This bot signs you in to ner9.com. Press "Sign in with Telegram" on the site.'
  }
}

async function handle(token: string, update: Update, log: FastifyBaseLogger) {
  const message = update.message
  const from = message?.from
  if (!message?.text?.startsWith('/start') || message.chat.type !== 'private' || !from) return
  const language = from.language_code ?? ''
  const texts = language.startsWith('uk')
    ? TEXTS.uk
    : /^(ru|be|kk)/.test(language)
      ? TEXTS.ru
      : TEXTS.en
  const payload = message.text.split(/\s+/)[1] ?? ''
  let text = texts.hello
  if (payload.startsWith('login_')) {
    const name = [from.first_name, from.last_name].filter(Boolean).join(' ').slice(0, 40)
    const user: SessionUser = {
      id: String(from.id),
      name,
      username: from.username ?? null,
      photoUrl: await storeAvatar(token, from.id, log)
    }
    text = confirmLogin(payload.slice('login_'.length), user) ? texts.done(name) : texts.expired
  }
  await call(token, 'sendMessage', { chat_id: message.chat.id, text })
}

/** Long-polls the bot until `signal` aborts. */
export async function runBot(log: FastifyBaseLogger, signal: AbortSignal) {
  const bot = telegramBot()
  if (!bot) return
  let offset = 0
  log.info(`Telegram bot @${bot.username} is polling`)
  while (!signal.aborted) {
    try {
      const updates = await call<Update[]>(
        bot.token,
        'getUpdates',
        { offset, timeout: 25, allowed_updates: ['message'] },
        signal
      )
      for (const update of updates) {
        offset = update.update_id + 1
        await handle(bot.token, update, log).catch((error) =>
          log.warn({ err: error }, 'Telegram update failed')
        )
      }
    } catch (error) {
      if (signal.aborted) return
      // 409: another backend polls the same bot (local and prod sharing one).
      if (error instanceof TelegramError && error.code === 409) {
        log.warn('Telegram bot is polled by another backend; each needs its own bot')
      } else {
        log.warn({ err: error }, 'Telegram polling failed')
      }
      await new Promise((resolve) => setTimeout(resolve, 10_000))
    }
  }
}
