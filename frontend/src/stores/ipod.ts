import { ref } from 'vue'
import { defineStore } from 'pinia'

const VISIBLE_KEY = 'ner9-ipod-visible'

function readVisible() {
  try {
    return localStorage.getItem(VISIBLE_KEY) !== 'false'
  } catch {
    return true
  }
}

/** Whether the iPod sheet is pulled up. Any component can open it (e.g. "Включить музыку"). */
export const useIpodStore = defineStore('ipod', () => {
  /**
   * The visitor can hide the player altogether (header button); the music stops and the page gets
   * an ordinary footer. Remembered in localStorage and synced like the other settings.
   */
  const isVisible = ref(readVisible())
  const isExpanded = ref(false)
  /** Cover Flow position, kept while views mount and unmount, like the real iPod. */
  const coverFlowIndex = ref<number | null>(null)
  /** The playing album Cover Flow last centered on, so it jumps to a new album only once. */
  const coverFlowAlbumId = ref<string | null>(null)

  const expand = () => (isExpanded.value = true)
  const collapse = () => (isExpanded.value = false)
  const toggle = () => (isExpanded.value = !isExpanded.value)

  function setVisible(visible: boolean) {
    isVisible.value = visible
    if (!visible) isExpanded.value = false
    try {
      localStorage.setItem(VISIBLE_KEY, String(visible))
    } catch {
      // Private mode: the choice just isn't remembered.
    }
  }

  return {
    isVisible,
    isExpanded,
    coverFlowIndex,
    coverFlowAlbumId,
    expand,
    collapse,
    toggle,
    setVisible,
  }
})
