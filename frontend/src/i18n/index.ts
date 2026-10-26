import { createI18n } from 'vue-i18n'
import { ru } from './messages/ru'
import { en } from './messages/en'
import { uk } from './messages/uk'

// In the order the header button cycles through them.
export const LOCALES = ['ru', 'uk', 'en'] as const
export type Locale = (typeof LOCALES)[number]

const STORAGE_KEY = 'ner9-locale'

// Ukrainian browsers get Ukrainian, languages whose speakers most likely read Russian get it,
// everyone else gets English.
const RUSSIAN_READERS = ['ru', 'be', 'kk', 'ky', 'uz', 'tg', 'hy', 'az', 'ka']

function savedLocale(): Locale | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return LOCALES.includes(saved as Locale) ? (saved as Locale) : null
  } catch {
    return null
  }
}

/** The browser language, unless the visitor picked one on the site. */
function initialLocale(): Locale {
  const saved = savedLocale()
  if (saved) return saved
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language]
  for (const language of languages) {
    const base = language.toLowerCase().split('-')[0]
    if (base === 'en') return 'en'
    if (base === 'uk') return 'uk'
    if (base && RUSSIAN_READERS.includes(base)) return 'ru'
  }
  return 'en'
}

// Russian and Ukrainian have three plural forms: 1 трек, 2 трека, 5 треков. Messages list them
// in that order.
function slavicPlural(choice: number) {
  const n = Math.abs(choice) % 100
  const last = n % 10
  if (n > 10 && n < 20) return 2
  if (last === 1) return 0
  if (last >= 2 && last <= 4) return 1
  return 2
}

export const i18n = createI18n({
  legacy: false,
  locale: initialLocale(),
  fallbackLocale: 'en',
  messages: { ru, uk, en },
  pluralRules: { ru: slavicPlural, uk: slavicPlural },
})

document.documentElement.lang = i18n.global.locale.value

/** Switches the site language and remembers the choice. */
export function setLocale(locale: Locale) {
  i18n.global.locale.value = locale
  document.documentElement.lang = locale
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // Private mode: the choice just isn't remembered.
  }
}

/** Shorthand for code outside components (stores, router). */
export const t = i18n.global.t
