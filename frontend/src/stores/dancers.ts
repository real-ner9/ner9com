import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

// v2: dancers became on by default everywhere; older saved "off" choices are dropped once.
const STORAGE_KEY = 'ner9-dancers-v2'

function readSaved(): boolean | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === null ? null : value === '1'
  } catch {
    return null
  }
}

/** Whether the dancers are on. On by default so visitors see them; the choice is remembered. */
export const useDancersStore = defineStore('dancers', () => {
  const isEnabled = ref(readSaved() ?? true)

  watch(isEnabled, (enabled) => {
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0')
    } catch {
      // Private mode: the choice just isn't remembered.
    }
  })

  const toggle = () => (isEnabled.value = !isEnabled.value)

  return { isEnabled, toggle }
})
