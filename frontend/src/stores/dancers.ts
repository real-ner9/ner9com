import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { DANCE_ROWS } from '@/components/dancers/sprites'

// v2: dancers became on by default everywhere; older saved "off" choices are dropped once.
const STORAGE_KEY = 'ner9-dancers-v2'
const SETTINGS_KEY = 'ner9-dancers-settings'

export const MAX_DANCERS = 4
/** "auto" changes moves every two bars; otherwise every dancer does the chosen move. */
export type DanceMove = 'auto' | (typeof DANCE_ROWS)[number]

function readSaved(): boolean | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === null ? null : value === '1'
  } catch {
    return null
  }
}

export interface DancerSettings {
  enabled: boolean
  count: number
  /** One move per dancer slot, MAX_DANCERS long. */
  moves: DanceMove[]
}

const isMove = (value: unknown): value is DanceMove =>
  value === 'auto' || DANCE_ROWS.includes(value as string)

/** Fills in defaults and drops anything invalid (old saves, values from the backend). */
export function normalizeDancers(value: Partial<Record<keyof DancerSettings, unknown>> | null) {
  const count = Number(value?.count)
  const moves = Array.isArray(value?.moves) ? value.moves : []
  return {
    enabled: typeof value?.enabled === 'boolean' ? value.enabled : true,
    count: count >= 1 && count <= MAX_DANCERS ? count : 2,
    moves: Array.from({ length: MAX_DANCERS }, (_, i) => (isMove(moves[i]) ? moves[i] : 'auto')),
  } satisfies DancerSettings
}

function readSettings() {
  try {
    const value = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null')
    // Before per-dancer moves there was one `move` for everyone.
    if (value && !value.moves && isMove(value.move)) value.moves = Array(MAX_DANCERS).fill(value.move)
    return normalizeDancers({ ...value, enabled: readSaved() ?? true })
  } catch {
    return normalizeDancers(null)
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Private mode: the choice just isn't remembered.
  }
}

/**
 * The dancers: on/off (on by default so visitors see them), how many, and each one's move, like
 * the Fruity Dance plugin where a note picks the move. All remembered.
 */
export const useDancersStore = defineStore('dancers', () => {
  const settings = readSettings()
  const isEnabled = ref(settings.enabled)
  const count = ref(settings.count)
  const moves = ref<DanceMove[]>(settings.moves)

  watch(isEnabled, (enabled) => write(STORAGE_KEY, enabled ? '1' : '0'))
  watch(
    [count, moves],
    () => write(SETTINGS_KEY, JSON.stringify({ count: count.value, moves: moves.value })),
    { deep: true },
  )

  const toggle = () => (isEnabled.value = !isEnabled.value)
  /** 1 → 2 → … → MAX → 1, like an iPod setting row. */
  const cycleCount = () => (count.value = (count.value % MAX_DANCERS) + 1)

  function setMove(dancer: number, move: DanceMove) {
    moves.value = moves.value.map((current, i) => (i === dancer ? move : current))
  }

  /** The settings as one object, for saving elsewhere (the backend). */
  const snapshot = (): DancerSettings => ({
    enabled: isEnabled.value,
    count: count.value,
    moves: [...moves.value],
  })

  function apply(value: DancerSettings) {
    isEnabled.value = value.enabled
    count.value = value.count
    moves.value = [...value.moves]
  }

  return { isEnabled, count, moves, toggle, cycleCount, setMove, snapshot, apply }
})
