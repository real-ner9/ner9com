import { watch } from 'vue'
import { fetchVisitorState, saveVisitorState, visitorId } from '@/api/visitorState'
import { i18n, LOCALES, setLocale, type Locale } from '@/i18n'
import { normalizeDancers, useDancersStore, type DancerSettings } from '@/stores/dancers'
import {
  REPEAT_MODES,
  usePlayerStore,
  writeSavedSession,
  type RepeatMode,
  type SavedSession,
} from '@/stores/player'
import { useIpodStore } from '@/stores/ipod'
import { THEMES, useThemeStore, type ThemeId } from '@/stores/theme'

/**
 * Keeps the visitor's settings on the backend (theme, language, dancers, shuffle/repeat and the
 * track to resume), under the anonymous id from their cookie. localStorage stays the fast local
 * copy the page starts from; whichever side changed last wins, by `savedAt`.
 */
interface VisitorState {
  savedAt: number
  theme: ThemeId
  locale: Locale
  dancers: DancerSettings
  ipodVisible: boolean
  player: { shuffle: boolean; repeat: RepeatMode; session: SavedSession | null }
}

const SAVED_AT_KEY = 'ner9-state-at'
/** Settings changes are sent after this quiet period. */
const DEBOUNCE_MS = 1000
/** The playing position is sent this often (and when the page closes), not on every update. */
const POSITION_EVERY_MS = 15_000
/** Startup waits this long at most for the backend before going on without it. */
const LOAD_TIMEOUT_MS = 2000

function readSavedAt() {
  try {
    return Number(localStorage.getItem(SAVED_AT_KEY)) || 0
  } catch {
    return 0
  }
}

function writeSavedAt(time: number) {
  try {
    localStorage.setItem(SAVED_AT_KEY, String(time))
  } catch {
    // Private mode.
  }
}

let resolveReady: () => void
/** Settles once the backend state is applied (or skipped); the intro track waits for it. */
export const visitorStateReady = new Promise<void>((resolve) => (resolveReady = resolve))

export function startVisitorSync() {
  const id = visitorId()
  const theme = useThemeStore()
  const dancers = useDancersStore()
  const player = usePlayerStore()
  const ipod = useIpodStore()

  const snapshot = (): VisitorState => ({
    savedAt: Date.now(),
    theme: theme.theme,
    locale: i18n.global.locale.value as Locale,
    dancers: dancers.snapshot(),
    ipodVisible: ipod.isVisible,
    player: { shuffle: player.shuffle, repeat: player.repeat, session: player.session() },
  })

  function apply(state: Partial<VisitorState>) {
    if (THEMES.some((t) => t.id === state.theme)) theme.setTheme(state.theme!)
    if (LOCALES.includes(state.locale as Locale)) setLocale(state.locale!)
    if (state.dancers) dancers.apply(normalizeDancers(state.dancers))
    if (typeof state.ipodVisible === 'boolean') ipod.setVisible(state.ipodVisible)
    const saved = state.player
    if (saved) {
      if (typeof saved.shuffle === 'boolean') player.shuffle = saved.shuffle
      if (REPEAT_MODES.includes(saved.repeat)) player.repeat = saved.repeat
      // Only for the resume on startup; never interrupts music already chosen.
      if (!player.currentTrack) writeSavedSession(saved.session ?? null)
    }
  }

  let timer: ReturnType<typeof setTimeout> | undefined
  function save(keepalive = false) {
    clearTimeout(timer)
    const state = snapshot()
    writeSavedAt(state.savedAt)
    void saveVisitorState(id, state, keepalive).catch(() => {
      // Offline: the browser copy is still there; the next change retries.
    })
  }
  const saveSoon = () => {
    clearTimeout(timer)
    timer = setTimeout(save, DEBOUNCE_MS)
  }

  async function load() {
    const remote = await fetchVisitorState<Partial<VisitorState>>(id)
    if (remote && Number(remote.savedAt) > readSavedAt()) apply(remote)
    else save() // a new visitor, or this browser changed things since: the backend catches up
  }

  void Promise.race([load(), new Promise((resolve) => setTimeout(resolve, LOAD_TIMEOUT_MS))])
    .catch(() => {})
    .finally(() => {
      resolveReady()
      // Start watching only now, so applying the backend state doesn't echo it straight back.
      watch(
        () => [
          theme.theme,
          i18n.global.locale.value,
          dancers.snapshot(),
          ipod.isVisible,
          player.shuffle,
          player.repeat,
          player.currentTrack?.id,
          player.wantsToPlay,
        ],
        saveSoon,
        { deep: true },
      )
      setInterval(() => player.isPlaying && save(), POSITION_EVERY_MS)
      window.addEventListener('pagehide', () => save(true))
    })
}
