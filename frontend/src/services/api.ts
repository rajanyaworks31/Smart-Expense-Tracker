import type { ErrorResponse } from '../types/api'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'

type ApiRequestOptions = RequestInit & {
  skipJsonContentType?: boolean
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers)

  if (!options.skipJsonContentType && options.body !== undefined && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  })

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`

    try {
      const body = (await response.json()) as Partial<ErrorResponse> & { detail?: string }
      message = body.error?.detail ?? body.detail ?? message
    } catch {
      // Keep the HTTP status message when the server did not return JSON.
    }

    const error = new Error(message)
    Object.assign(error, { status: response.status })
    throw error
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export function getApiErrorStatus(error: unknown): number | null {
  if (typeof error !== 'object' || error === null || !('status' in error)) return null
  const status = (error as { status?: unknown }).status
  return typeof status === 'number' ? status : null
}
