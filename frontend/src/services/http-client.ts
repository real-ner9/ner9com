const DEFAULT_API_BASE_URL = '/api'

/**
 * Normalize the provided base URL by trimming the trailing slash.
 * @param rawValue Base URL supplied via environment variables.
 * @returns Sanitized base URL without a trailing slash.
 */
function normalizeBaseUrl(rawValue: string | undefined) {
  if (!rawValue) return DEFAULT_API_BASE_URL
  return rawValue.endsWith('/') ? rawValue.slice(0, -1) : rawValue
}

export const apiBaseUrl = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL)

/**
 * Optional configuration for API requests.
 */
export interface RequestOptions {
  readonly signal?: AbortSignal
}

export async function apiGet<TResponse = unknown>(
  path: string,
  options: RequestOptions = {}
) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  const response = await fetch(`${apiBaseUrl}${normalizedPath}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
    signal: options.signal
  })

  if (!response.ok) {
    const fallback = `Request failed with status ${response.status}`
    const errorText = await response.text().catch(() => '')
    throw new Error(errorText || fallback)
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return (await response.json()) as TResponse
  }

  return (await response.text()) as TResponse
}

