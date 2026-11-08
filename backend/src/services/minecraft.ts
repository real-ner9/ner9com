import { randomBytes, timingSafeEqual } from 'node:crypto'
import type { PrismaClient } from '@prisma/client'
import type { FastifyBaseLogger } from 'fastify'
import { call, onCallbackQuery, telegramBot } from './telegram'

/**
 * Logins to the owner's Minecraft server (Fabric 1.21.1 in offline mode, so friends can play
 * through TLauncher; the server and its ner9-auth mod live in /root/projects/minecraft on the
 * VPS). The mod holds every player on the loading screen and asks here: a nickname registered on
 * /minecraft, from an address its owner already confirmed, goes straight in; anything else makes
 * the bot ask the owner "Is it you?" and the mod polls for the answer.
 */

export const NICKNAME = /^[A-Za-z0-9_]{3,16}$/
export const LANGUAGES = ['ru', 'uk', 'en'] as const
export type Language = (typeof LANGUAGES)[number]

/** The mod gives up after the same two minutes. */
const CONFIRM_MS = 2 * 60 * 1000
/** A confirmed address is trusted until it goes unused this long. */
export const TRUST_DAYS = 30
/** After "Not me" that address can't ask again for a while, so a stranger can't flood the bot. */
const DENY_COOLDOWN_MS = 10 * 60 * 1000

/** Where to connect and what to play on, for the page and the installer. */
export const minecraftServer = () => ({
  address: process.env.MINECRAFT_SERVER_ADDRESS || '207.180.218.99',
  version: '1.21.1',
  loader: 'Fabric'
})

/** The mod sends MINECRAFT_AUTH_SECRET in X-Minecraft-Secret; without one set, nobody gets in. */
export function modSecretMatches(header: unknown) {
  const secret = process.env.MINECRAFT_AUTH_SECRET
  if (!secret || typeof header !== 'string') return false
  const given = Buffer.from(header)
  const expected = Buffer.from(secret)
  return given.length === expected.length && timingSafeEqual(given, expected)
}

const TEXTS = {
  ru: {
    ask: (nick: string, ip: string) =>
      `🎮 Вход на Minecraft-сервер\nНик: ${nick}\nIP: ${ip}\n\nЭто ты? Без ответа через 2 минуты вход отменится.`,
    yes: '✅ Это я',
    no: '❌ Не я',
    approved: (nick: string, ip: string) =>
      `✅ Вход подтверждён: ${nick}, IP ${ip}. С этого адреса ${TRUST_DAYS} дней пускаем без вопросов.`,
    denied: (nick: string, ip: string) =>
      `❌ Вход под ником ${nick} с IP ${ip} отклонён. Без твоего подтверждения под ним никто не зайдёт.`,
    expired: (nick: string, ip: string) => `⌛ Вход под ником ${nick} с IP ${ip} не подтвердили вовремя.`,
    notMe: 'Владелец ника отклонил вход.',
    timedOut: 'Вход не подтвердили в Telegram за 2 минуты. Зайди ещё раз.',
    waiting: 'Этот ник уже ждёт подтверждения входа в Telegram.',
    cooldown: 'Вход с этого адреса недавно отклонили. Попробуй позже.',
    noBot: (bot: string) => `Бот не может тебе написать. Открой @${bot} в Telegram, нажми Start и зайди снова.`,
    spelling: (nick: string) => `Ник пишется так: ${nick}. Поменяй его в TLauncher.`,
    foreign: 'Это не твой вход.'
  },
  uk: {
    ask: (nick: string, ip: string) =>
      `🎮 Вхід на Minecraft-сервер\nНік: ${nick}\nIP: ${ip}\n\nЦе ти? Без відповіді за 2 хвилини вхід скасується.`,
    yes: '✅ Це я',
    no: '❌ Не я',
    approved: (nick: string, ip: string) =>
      `✅ Вхід підтверджено: ${nick}, IP ${ip}. З цієї адреси ${TRUST_DAYS} днів пускаємо без питань.`,
    denied: (nick: string, ip: string) =>
      `❌ Вхід під ніком ${nick} з IP ${ip} відхилено. Без твого підтвердження під ним ніхто не зайде.`,
    expired: (nick: string, ip: string) => `⌛ Вхід під ніком ${nick} з IP ${ip} не підтвердили вчасно.`,
    notMe: 'Власник ніка відхилив вхід.',
    timedOut: 'Вхід не підтвердили в Telegram за 2 хвилини. Зайди ще раз.',
    waiting: 'Цей нік уже чекає підтвердження входу в Telegram.',
    cooldown: 'Вхід з цієї адреси нещодавно відхилили. Спробуй пізніше.',
    noBot: (bot: string) => `Бот не може тобі написати. Відкрий @${bot} у Telegram, натисни Start і зайди знову.`,
    spelling: (nick: string) => `Нік пишеться так: ${nick}. Зміни його в TLauncher.`,
    foreign: 'Це не твій вхід.'
  },
  en: {
    ask: (nick: string, ip: string) =>
      `🎮 Minecraft server login\nNickname: ${nick}\nIP: ${ip}\n\nIs it you? Without an answer in 2 minutes the login is cancelled.`,
    yes: "✅ It's me",
    no: '❌ Not me',
    approved: (nick: string, ip: string) =>
      `✅ Login confirmed: ${nick}, IP ${ip}. This address gets in without asking for ${TRUST_DAYS} days.`,
    denied: (nick: string, ip: string) =>
      `❌ Login as ${nick} from IP ${ip} refused. Nobody gets in under it without your confirmation.`,
    expired: (nick: string, ip: string) => `⌛ The login as ${nick} from IP ${ip} wasn't confirmed in time.`,
    notMe: 'The owner of this nickname refused the login.',
    timedOut: "The login wasn't confirmed in Telegram within 2 minutes. Join again.",
    waiting: 'This nickname is already waiting for a login confirmation in Telegram.',
    cooldown: 'A login from this address was refused recently. Try again later.',
    noBot: (bot: string) => `The bot can't message you. Open @${bot} in Telegram, press Start and join again.`,
    spelling: (nick: string) => `Your nickname is spelled ${nick}. Change it in TLauncher.`,
    foreign: 'This is not your login.'
  }
}

/** Nobody to ask about a nickname that isn't registered, so this one is in Russian only. */
const unknownNickname = (nick: string) =>
  `Ник ${nick} не зарегистрирован. Зарегистрируй его на ner9.com/minecraft`
const UNAVAILABLE = 'Вход через Telegram сейчас не работает. Напиши владельцу сервера.'

const textsOf = (language: string) => TEXTS[language as Language] ?? TEXTS.ru

export type LoginAnswer =
  | { status: 'approved' }
  | { status: 'pending'; id: string }
  | { status: 'rejected'; message: string }

interface PendingLogin {
  accountId: number
  tgId: string
  nickname: string
  ip: string
  language: string
  answer: LoginAnswer
  /** The bot's question, edited once answered or expired. */
  question: { chatId: string; messageId: number } | null
}

/** In memory: a restart only cancels the logins in progress, and the mod then kicks the player. */
const logins = new Map<string, PendingLogin>()
/** `${accountId}:${ip}` refused with "Not me", until when. */
const refused = new Map<string, number>()

const rejected = (message: string): LoginAnswer => ({ status: 'rejected', message })

/** The mod asking whether `nickname` connecting from `ip` may come in. */
export async function startLogin(
  prisma: PrismaClient,
  log: FastifyBaseLogger,
  nickname: string,
  ip: string
): Promise<LoginAnswer> {
  const account = await prisma.minecraftAccount.findUnique({
    where: { nicknameKey: nickname.toLowerCase() }
  })
  if (!account) return rejected(unknownNickname(nickname))
  const texts = textsOf(account.language)
  // Another spelling is another player in offline mode, with its own inventory.
  if (account.nickname !== nickname) return rejected(texts.spelling(account.nickname))

  const trusted = await prisma.minecraftTrustedIp.findUnique({
    where: { accountId_ip: { accountId: account.id, ip } }
  })
  if (trusted && Date.now() - trusted.lastUsedAt.getTime() < TRUST_DAYS * 24 * 60 * 60 * 1000) {
    await prisma.minecraftTrustedIp.update({
      where: { id: trusted.id },
      data: { lastUsedAt: new Date() }
    })
    return { status: 'approved' }
  }

  const refusedUntil = refused.get(`${account.id}:${ip}`)
  if (refusedUntil && refusedUntil > Date.now()) return rejected(texts.cooldown)
  for (const [id, login] of logins) {
    if (login.accountId !== account.id || login.answer.status !== 'pending') continue
    // The same player reconnecting keeps waiting on the same question.
    if (login.ip === ip) return { status: 'pending', id }
    return rejected(texts.waiting)
  }

  const bot = telegramBot()
  if (!bot) return rejected(UNAVAILABLE)
  const id = randomBytes(16).toString('hex')
  let question: PendingLogin['question']
  try {
    const message = await call<{ message_id: number }>(bot.token, 'sendMessage', {
      chat_id: account.tgId,
      text: texts.ask(nickname, ip),
      reply_markup: {
        inline_keyboard: [
          [
            { text: texts.yes, callback_data: `mc:${id}:yes` },
            { text: texts.no, callback_data: `mc:${id}:no` }
          ]
        ]
      }
    })
    question = { chatId: account.tgId, messageId: message.message_id }
  } catch (error) {
    // Blocked the bot, or never pressed Start there.
    log.warn({ err: error, nickname }, 'Minecraft login question could not be sent')
    return rejected(texts.noBot(bot.username))
  }

  logins.set(id, {
    accountId: account.id,
    tgId: account.tgId,
    nickname,
    ip,
    language: account.language,
    answer: { status: 'pending', id },
    question
  })
  setTimeout(() => void expire(id, log), CONFIRM_MS)
  return { status: 'pending', id }
}

/** What the mod's polling gets. */
export function loginAnswer(id: string): LoginAnswer {
  return logins.get(id)?.answer ?? rejected(TEXTS.ru.timedOut)
}

async function expire(id: string, log: FastifyBaseLogger) {
  const login = logins.get(id)
  if (!login) return
  // Kept a little longer, so a poll that is under way still reads the answer.
  setTimeout(() => logins.delete(id), 60_000)
  if (login.answer.status !== 'pending') return
  const texts = textsOf(login.language)
  login.answer = rejected(texts.timedOut)
  await editQuestion(login, texts.expired(login.nickname, login.ip)).catch((error) =>
    log.warn({ err: error }, 'Minecraft login question could not be edited')
  )
}

async function editQuestion(login: PendingLogin, text: string) {
  const bot = telegramBot()
  if (!bot || !login.question) return
  await call(bot.token, 'editMessageText', {
    chat_id: login.question.chatId,
    message_id: login.question.messageId,
    text
  })
}

/** "It's me" / "Not me" under the bot's question; callback data `<id>:yes|no`. */
export function registerMinecraftButtons(prisma: PrismaClient, log: FastifyBaseLogger) {
  onCallbackQuery('mc:', async (query, data) => {
    const bot = telegramBot()
    if (!bot) return
    const [id, choice] = data.split(':')
    const login = logins.get(id)
    const texts = textsOf(login?.language ?? 'ru')
    const answerButton = (text?: string) =>
      call(bot.token, 'answerCallbackQuery', { callback_query_id: query.id, text })

    if (!login || login.answer.status !== 'pending') {
      await answerButton(texts.timedOut)
      return
    }
    if (String(query.from.id) !== login.tgId) {
      await answerButton(texts.foreign)
      return
    }

    if (choice === 'yes') {
      await prisma.minecraftTrustedIp.upsert({
        where: { accountId_ip: { accountId: login.accountId, ip: login.ip } },
        create: { accountId: login.accountId, ip: login.ip },
        update: { lastUsedAt: new Date() }
      })
      login.answer = { status: 'approved' }
      log.info({ nickname: login.nickname, ip: login.ip }, 'Minecraft login confirmed')
    } else {
      login.answer = rejected(texts.notMe)
      refused.set(`${login.accountId}:${login.ip}`, Date.now() + DENY_COOLDOWN_MS)
      log.info({ nickname: login.nickname, ip: login.ip }, 'Minecraft login refused')
    }
    await answerButton()
    await editQuestion(
      login,
      choice === 'yes'
        ? texts.approved(login.nickname, login.ip)
        : texts.denied(login.nickname, login.ip)
    )
  })
}
