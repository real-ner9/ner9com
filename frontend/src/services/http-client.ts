export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL

export interface RequestOptions {
  readonly signal?: AbortSignal
}

export async function apiGet<TResponse = unknown>(
  path: string,
  options: RequestOptions = {}
) {
  const response = await fetch(buildUrl(path), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
    signal: options.signal
  })

  return handleResponse<TResponse>(response)
}

export async function apiPost<TBody extends object, TResponse = unknown>(
  path: string,
  body: TBody,
  options: RequestOptions = {}
) {
  const response = await fetch(buildUrl(path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body),
    signal: options.signal
  })

  return handleResponse<TResponse>(response)
}

function buildUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${apiBaseUrl}${normalizedPath}`
}

async function handleResponse<TResponse>(response: Response): Promise<TResponse> {
  if (!response.ok) {
    const fallback = `Request failed with status ${response.status}`
    const errorText = await response.text().catch(() => '')
    throw new Error(errorText || fallback)
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return response.json()
  }

  return response.text() as TResponse
}

