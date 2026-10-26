import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Locale } from '@/i18n'
import { profile } from './profile'
import { resumeRu } from './resume.ru'
import { resumeEn } from './resume.en'
import { resumeUk } from './resume.uk'
import { showcase } from './projects'

const resume = { ru: resumeRu, uk: resumeUk, en: resumeEn } satisfies Record<Locale, unknown>

/** Site copy in the current language; switches together with the interface. */
export function useContent() {
  const { locale } = useI18n()
  const current = computed(() => locale.value as Locale)
  return {
    profile: computed(() => profile[current.value]),
    resume: computed(() => resume[current.value]),
    showcase: computed(() => showcase[current.value]),
  }
}
