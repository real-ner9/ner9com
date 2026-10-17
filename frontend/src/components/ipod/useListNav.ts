import { inject, ref, watch } from 'vue'
import { IPOD_LIST_MEMORY, type IpodViewHandle } from '@/types/ipod'

/**
 * Wheel and center-button handling shared by the list screens: scrolling moves the highlight
 * (clamped to the list), the center button and a tap activate the row. Coming back to a menu
 * restores the row it was left on; `initial` is used the first time.
 */
export function useListNav(length: () => number, activate: (index: number) => void, initial = 0) {
  const memory = inject(IPOD_LIST_MEMORY, null)
  const depth = memory?.depth() ?? 0
  const selected = ref(memory?.get(depth) ?? initial)
  watch(selected, (index) => memory?.set(depth, index), { immediate: true })

  function choose(index: number) {
    selected.value = index
    activate(index)
  }

  const handle: IpodViewHandle = {
    scroll: (delta) => {
      selected.value = Math.min(Math.max(selected.value + delta, 0), Math.max(length() - 1, 0))
    },
    select: () => choose(selected.value),
  }

  return { selected, choose, handle }
}
