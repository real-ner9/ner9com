import { t } from '@/i18n'
/**
 * Thin fetch wrapper. Every backend call goes through here so the base URL lives in one place:
 * in dev VITE_API_BASE_URL is "/api", which the Vite server proxies to the backend.
 */
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? ''

/** Prefixes a backend path ("/library/...") with the API base. Absolute URLs pass through. */
export function apiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path
  return `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`
}

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  return request<T>(path, { method: 'GET', signal })
}

export async function apiPost<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), init)
  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }
  return response.json() as Promise<T>
}

/** Fastify errors look like { message }; fall back to the status line. */
async function readErrorMessage(response: Response) {
  try {
    const body = await response.json()
    if (typeof body?.message === 'string') return body.message
  } catch {
    // Not JSON.
  }
  return t('errors.request', { status: response.status })
}
