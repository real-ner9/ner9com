import { computed, type ComputedRef } from 'vue'
import { useColorMode } from '@vueuse/core'

const THEME_OPTIONS = ['light', 'dark'] as const
type ThemeOption = (typeof THEME_OPTIONS)[number]

interface UseTheme {
  mode: ReturnType<typeof useColorMode>
  availableThemes: readonly ThemeOption[]
  setTheme: (theme: ThemeOption | 'auto') => void
  cycleTheme: () => void
  isAuto: ComputedRef<boolean>
}

export function useTheme(): UseTheme {
  const mode = useColorMode({
    attribute: 'data-theme',
    storageKey: 'ner9-theme',
    emitAuto: true
  })

  const availableThemes = THEME_OPTIONS

  function setTheme(theme: ThemeOption | 'auto') {
    mode.value = theme
  }

  function cycleTheme() {
    const currentIndex = THEME_OPTIONS.indexOf(mode.value as ThemeOption)
    if (currentIndex === -1 || currentIndex === THEME_OPTIONS.length - 1) {
      mode.value = THEME_OPTIONS[0]
      return
    }

    mode.value = THEME_OPTIONS[currentIndex + 1]
  }

  const isAuto = computed(() => mode.value === 'auto')

  return {
    mode,
    availableThemes,
    setTheme,
    cycleTheme,
    isAuto
  }
}
