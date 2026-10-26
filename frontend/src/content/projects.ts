import type { Locale } from '@/i18n'
import type { ShowcaseProject } from '@/types/content'

const url = 'https://t.me/kleshnya_dev_bot'
const promoCode = 'HESOYAM'
// From the CV; the repo is private. TODO: the full stack, when the owner sends it.
const stack = ['Python', 'FastAPI', 'Telegram Bot API', 'TypeScript', 'Lottie']

// The owner's main project, shown first on the home and projects pages.
export const showcase: Record<Locale, ShowcaseProject> = {
  ru: {
    id: 'kleshnya',
    name: 'Клешня',
    tagline: 'Настоящий автомат с клешнёй — в Telegram',
    description:
      'Telegram-бот и веб-игра, в которой ты удалённо играешь в реальный автомат с клешнёй: управляешь настоящей клешнёй прямо с телефона. Проект целиком мой — от бэкенда до игрового интерфейса, и он уже в продакшене.',
    url,
    linkLabel: 'Играть в Telegram',
    promoCode,
    stack,
    status: 'В продакшене',
  },
  uk: {
    id: 'kleshnya',
    name: 'Клішня',
    tagline: 'Справжній автомат із клішнею — у Telegram',
    description:
      'Telegram-бот і вебгра, у якій ти віддалено граєш у реальний автомат із клішнею: керуєш справжньою клішнею просто з телефона. Проєкт повністю мій — від бекенду до ігрового інтерфейсу, і він уже в продакшені.',
    url,
    linkLabel: 'Грати в Telegram',
    promoCode,
    stack,
    status: 'У продакшені',
  },
  en: {
    id: 'kleshnya',
    name: 'Kleshnya',
    tagline: 'A real claw machine, in Telegram',
    description:
      'A Telegram bot and web game where you play a real claw machine remotely: you steer an actual claw right from your phone. The whole project is mine, from the backend to the game interface, and it is live in production.',
    url,
    linkLabel: 'Play in Telegram',
    promoCode,
    stack,
    status: 'In production',
  },
}

const cadryUrl = 'https://t.me/cadry_official_bot'
const cadryStack = ['TypeScript', 'React', 'Hono', 'Prisma', 'PostgreSQL', 'pgvector', 'grammY', 'Claude']

// Hiring in a Telegram Mini App. Copy follows the project's README.
const cadry: Record<Locale, ShowcaseProject> = {
  ru: {
    id: 'cadry',
    name: 'Cadry',
    tagline: 'Найм внутри Telegram',
    description:
      'Telegram Mini App для найма: кандидат знакомится видеокружком и резюме, а рекрутер ищет людей с помощью AI, ведёт вакансии и шортлист.',
    url: cadryUrl,
    linkLabel: 'Открыть в Telegram',
    stack: cadryStack,
    status: 'В разработке',
    inDevelopment: true,
  },
  uk: {
    id: 'cadry',
    name: 'Cadry',
    tagline: 'Найм усередині Telegram',
    description:
      'Telegram Mini App для найму: кандидат знайомиться відеокружком і резюме, а рекрутер шукає людей за допомогою AI, веде вакансії та шортлист.',
    url: cadryUrl,
    linkLabel: 'Відкрити в Telegram',
    stack: cadryStack,
    status: 'У розробці',
    inDevelopment: true,
  },
  en: {
    id: 'cadry',
    name: 'Cadry',
    tagline: 'Hiring inside Telegram',
    description:
      'A Telegram Mini App for hiring: candidates introduce themselves with a video note and a resume, recruiters find people with AI search and keep vacancies and a shortlist.',
    url: cadryUrl,
    linkLabel: 'Open in Telegram',
    stack: cadryStack,
    status: 'In development',
    inDevelopment: true,
  },
}

const tgHoundUrl = 'https://tg-hound.com'
const tgHoundStack = ['TypeScript', 'NestJS', 'Vue 3', 'Prisma', 'PostgreSQL', 'gramjs', 'grammY', 'Claude']

// Lead finder for Telegram chats. Copy follows the project's README.
const tgHound: Record<Locale, ShowcaseProject> = {
  ru: {
    id: 'tghound',
    name: 'TG Hound',
    tagline: 'Поиск клиентов в Telegram-чатах',
    description:
      'Подключаешь свой Telegram-аккаунт, выбираешь чаты и ключевые слова, а подходящие сообщения приходят от бота в личку и собираются в веб-кабинете. AI отсеивает лишнее.',
    url: tgHoundUrl,
    linkLabel: 'Открыть сайт',
    stack: tgHoundStack,
    status: 'В разработке',
    inDevelopment: true,
  },
  uk: {
    id: 'tghound',
    name: 'TG Hound',
    tagline: 'Пошук клієнтів у Telegram-чатах',
    description:
      'Підключаєш свій Telegram-акаунт, обираєш чати й ключові слова, а відповідні повідомлення надходять від бота в особисті та збираються у вебкабінеті. AI відсіює зайве.',
    url: tgHoundUrl,
    linkLabel: 'Відкрити сайт',
    stack: tgHoundStack,
    status: 'У розробці',
    inDevelopment: true,
  },
  en: {
    id: 'tghound',
    name: 'TG Hound',
    tagline: 'Finding leads in Telegram chats',
    description:
      'Connect your Telegram account, pick chats and keywords, and matching messages arrive from the bot in your DMs and gather in a web dashboard. AI filters out the noise.',
    url: tgHoundUrl,
    linkLabel: 'Open the site',
    stack: tgHoundStack,
    status: 'In development',
    inDevelopment: true,
  },
}

/** Every project for the projects page, the main one first. */
export const projects: Record<Locale, ShowcaseProject[]> = {
  ru: [showcase.ru, cadry.ru, tgHound.ru],
  uk: [showcase.uk, cadry.uk, tgHound.uk],
  en: [showcase.en, cadry.en, tgHound.en],
}
