import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  fetchAuth,
  pollTelegramLogin,
  signOut as apiSignOut,
  startTelegramLogin,
  type AuthState,
} from '@/api/auth'

const POLL_MS = 2000
/** A login link the page was waiting on, so it survives the page being reloaded meanwhile. */
const PENDING_KEY = 'ner9-login'

function remember(token: string | null) {
  try {
    if (token) sessionStorage.setItem(PENDING_KEY, token)
    else sessionStorage.removeItem(PENDING_KEY)
  } catch {
    // Private mode: a reload just cancels the login.
  }
}

function remembered() {
  try {
    return sessionStorage.getItem(PENDING_KEY)
  } catch {
    return null
  }
}

/**
 * Who is signed in (optional, through the Telegram bot): the header button and the reviews read
 * it. Signing in opens a one-time link to the bot; pressing Start there confirms it, and this
 * page, polling meanwhile, gets the session cookie.
 */
export const useAuthStore = defineStore('auth', () => {
  const state = ref<AuthState>({ user: null, owner: false, bot: null })
  /** The bot link while waiting for Start, shown in case the new tab didn't open. */
  const link = ref<string | null>(null)
  const error = ref<string | null>(null)

  const user = computed(() => state.value.user)
  const owner = computed(() => state.value.owner)
  const available = computed(() => Boolean(state.value.bot))

  let timer = 0

  function stopWaiting() {
    clearInterval(timer)
    timer = 0
    link.value = null
    remember(null)
  }

  function wait(token: string) {
    clearInterval(timer)
    remember(token)
    timer = window.setInterval(async () => {
      try {
        const { status } = await pollTelegramLogin(token)
        if (status === 'pending') return
        stopWaiting()
        if (status === 'ok') await load()
      } catch {
        // A network blip: try again on the next tick.
      }
    }, POLL_MS)
  }

  async function load() {
    try {
      state.value = await fetchAuth()
    } catch {
      // Without the backend there is no sign-in; the button stays hidden.
    }
    const token = remembered()
    if (token && !state.value.user && !timer) wait(token)
  }

  async function signIn() {
    error.value = null
    // Opened inside the click, or the browser blocks it; pointed at the bot once the link is in.
    const tab = window.open('', '_blank')
    try {
      const { token, url } = await startTelegramLogin()
      link.value = url
      if (tab) tab.location.href = url
      wait(token)
    } catch (e) {
      tab?.close()
      error.value = e instanceof Error ? e.message : String(e)
    }
  }

  async function signOut() {
    await apiSignOut().catch(() => {})
    await load()
  }

  return { state, user, owner, available, link, error, load, signIn, signOut, stopWaiting }
})
