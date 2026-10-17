import type { Locale } from '@/i18n'
import type { ShowcaseProject } from '@/types/content'

const url = 'https://t.me/kleshnya_dev_bot'
const promoCode = 'HESOYAM'
// From the CV; the repo is private. TODO: the full stack, when the owner sends it.
const stack = ['Python', 'FastAPI', 'Telegram Bot API', 'TypeScript', 'Lottie']

// The owner's main project, shown first on the home and projects pages.
export const showcase: Record<Locale, ShowcaseProject> = {
  ru: {
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
  en: {
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
