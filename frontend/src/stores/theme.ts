import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

export type ThemeId = 'apple' | 'fl' | 'win98'

export interface ThemeInfo {
  id: ThemeId
  label: string
  /** Swatches for the picker preview: page, card, accent. */
  colors: [bg: string, surface: string, accent: string]
}

/** Keep in sync with styles/theme.scss. */
export const THEMES: ThemeInfo[] = [
  { id: 'apple', label: 'Apple 2007', colors: ['#c5ccd4', '#ffffff', '#2f6fd6'] },
  { id: 'fl', label: 'FL Studio', colors: ['#34424a', '#2e393f', '#ff8c1a'] },
  { id: 'win98', label: 'Windows 98', colors: ['#008080', '#c0c0c0', '#000080'] },
]

const STORAGE_KEY = 'ner9-theme'
const isThemeId = (value: unknown): value is ThemeId => THEMES.some((t) => t.id === value)

/** Anything unknown falls back to Apple. */
function readSaved(): ThemeId {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return isThemeId(value) ? value : 'apple'
  } catch {
    return 'apple'
  }
}

/**
 * Site theme. Writes data-theme on <html> (read by styles/theme.scss) and the browser UI colour
 * (<meta name="theme-color">). index.html applies the saved theme before the app loads.
 */
export const useThemeStore = defineStore('theme', () => {
  const theme = ref<ThemeId>(readSaved())
  const info = computed(() => THEMES.find((t) => t.id === theme.value)!)

  watch(
    theme,
    (id) => {
      document.documentElement.dataset.theme = id
      let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
      if (!meta) {
        meta = document.createElement('meta')
        meta.name = 'theme-color'
        document.head.append(meta)
      }
      meta.content = info.value.colors[0]
    },
    { immediate: true },
  )

  function setTheme(next: ThemeId) {
    theme.value = next
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Not remembered in private mode.
    }
  }

  return { theme, info, setTheme }
})
