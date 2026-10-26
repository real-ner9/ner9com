import { apiGet, apiSend, apiUrl } from '@/api/http'

/** Signed in with Telegram (backend routes/auth); the session is an httpOnly cookie. */
export interface AuthUser {
  name: string
  username: string | null
  photoUrl: string | null
}

export interface AuthState {
  user: AuthUser | null
  /** Signed in as the site's owner. */
  owner: boolean
  /** The sign-in bot's username; null when sign-in isn't set up. */
  bot: string | null
}

/** Avatars are stored by the backend (`/media/...`). */
const withPhoto = (user: AuthUser | null) =>
  user && { ...user, photoUrl: user.photoUrl && apiUrl(user.photoUrl) }

export async function fetchAuth() {
  const state = await apiGet<AuthState>('/auth/me')
  return { ...state, user: withPhoto(state.user) }
}

/** A one-time link to the bot; pressing Start there signs this page in. */
export const startTelegramLogin = () =>
  apiSend<{ token: string; url: string }>('POST', '/auth/telegram/start')

/** "ok" also sets the session cookie. */
export const pollTelegramLogin = (token: string) =>
  apiGet<{ status: 'pending' | 'expired' | 'ok' }>(`/auth/telegram/${token}`)

export const signOut = () => apiSend<{ user: null }>('POST', '/auth/logout')
