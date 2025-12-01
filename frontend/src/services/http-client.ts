export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL

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
    return response.json()
  }

  return response.text()
}

