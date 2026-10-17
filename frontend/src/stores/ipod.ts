import { ref } from 'vue'
import { defineStore } from 'pinia'

/** Whether the iPod sheet is pulled up. Any component can open it (e.g. "Включить музыку"). */
export const useIpodStore = defineStore('ipod', () => {
  const isExpanded = ref(false)
  /** Cover Flow position, kept while views mount and unmount, like the real iPod. */
  const coverFlowIndex = ref<number | null>(null)
  /** The playing album Cover Flow last centered on, so it jumps to a new album only once. */
  const coverFlowAlbumId = ref<string | null>(null)

  const expand = () => (isExpanded.value = true)
  const collapse = () => (isExpanded.value = false)
  const toggle = () => (isExpanded.value = !isExpanded.value)

  return { isExpanded, coverFlowIndex, coverFlowAlbumId, expand, collapse, toggle }
})
