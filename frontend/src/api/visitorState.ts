import { apiGet, apiUrl } from '@/api/http'

// Every visitor gets a random id in a cookie (no account); the backend stores their settings
// under it. A cookie, not localStorage, so clearing localStorage doesn't lose the settings.
const COOKIE = 'ner9_visitor'
const COOKIE_MAX_AGE_S = 400 * 24 * 60 * 60 // the longest browsers keep a cookie

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function newId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  // Older browsers: a v4 UUID from random bytes.
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/** The visitor's id, created (and the cookie set) on the first visit. */
export function visitorId() {
  const saved = document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=([^;]+)`))?.[1]
  const id = saved && UUID.test(saved) ? saved : newId()
  // Rewritten every visit so the cookie keeps living as long as the visitor comes back.
  const secure = location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${COOKIE}=${id}; Max-Age=${COOKIE_MAX_AGE_S}; Path=/; SameSite=Lax${secure}`
  return id
}

/** The saved state, or null for a new visitor. */
export async function fetchVisitorState<T>(id: string): Promise<T | null> {
  try {
    const { state } = await apiGet<{ state: T | null }>(`/state/${id}`)
    return state
  } catch {
    // Backend unreachable: use what the browser has.
    return null
  }
}

/** `keepalive` lets the request finish while the page is closing. */
export async function saveVisitorState(id: string, state: object, keepalive = false) {
  await fetch(apiUrl(`/state/${id}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state }),
    keepalive,
  })
}
