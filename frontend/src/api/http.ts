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

export async function apiGet<T>(
  path: string,
  signal?: AbortSignal,
  headers?: Record<string, string>,
): Promise<T> {
  return request<T>(path, { method: 'GET', signal, headers })
}

/** Any method with a JSON body (or FormData, sent as is) and extra headers. */
export async function apiSend<T>(
  method: 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
): Promise<T> {
  const isForm = body instanceof FormData
  return request<T>(path, {
    method,
    headers: isForm || body === undefined ? headers : { 'Content-Type': 'application/json', ...headers },
    body: isForm ? body : body === undefined ? undefined : JSON.stringify(body),
  })
}

export async function apiPost<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
}

/** Where a banned visitor goes (nginx serves it for every page in production as well). */
export const BANNED_PAGE = '/banned.html'

/** Error with the HTTP status, so callers can tell a rate limit from a typo. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), init)
  if (!response.ok) {
    if (response.status === 403 && (await isBanResponse(response.clone()))) {
      window.location.assign(BANNED_PAGE)
    }
    throw new ApiError(await readErrorMessage(response), response.status)
  }
  // 204 No Content (deletes) has no body.
  return (response.status === 204 ? undefined : response.json()) as Promise<T>
}

/** The backend answers { banned: true } for an IP banned for an SQL injection attempt. */
async function isBanResponse(response: Response) {
  try {
    return (await response.json())?.banned === true
  } catch {
    return false
  }
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
