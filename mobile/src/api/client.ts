import { ApiError, normalizeApiError } from './errors'

type SessionProvider = () => string | null
type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown, timeoutMs?: number }

const apiBaseUrl = (process.env.EXPO_PUBLIC_API_BASE_URL || '').replace(/\/$/, '')
const defaultTimeoutMs = 12_000

function requestId() {
  return `mobile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export class MobileApiClient {
  private readonly getSession: SessionProvider

  constructor(getSession: SessionProvider = () => null) {
    this.getSession = getSession
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    if (!apiBaseUrl) throw new ApiError('The mobile service address is not configured.', { code: 'SERVICE_UNAVAILABLE' })
    const controller = new AbortController()
    const callerSignal = options.signal
    let timedOut = false
    const abortFromCaller = () => controller.abort()
    if (callerSignal?.aborted) controller.abort()
    else callerSignal?.addEventListener('abort', abortFromCaller, { once: true })
    const timeout = setTimeout(() => { timedOut = true; controller.abort() }, options.timeoutMs ?? defaultTimeoutMs)
    const headers = new Headers(options.headers)
    headers.set('accept', 'application/json')
    headers.set('x-request-id', requestId())
    const session = this.getSession()
    if (session) headers.set('x-nuxt-session', session)
    if (options.body !== undefined) headers.set('content-type', 'application/json')

    try {
      const response = await fetch(`${apiBaseUrl}${path}`, {
        ...options,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller.signal,
      })
      const text = await response.text()
      let body: unknown = null
      try { body = text ? JSON.parse(text) : null } catch { body = null }
      if (!response.ok) throw normalizeApiError(response.status, body)
      return (body ?? {}) as T
    } catch (error) {
      if (error instanceof ApiError) throw error
      if (error instanceof Error && error.name === 'AbortError') {
        if (callerSignal?.aborted && !timedOut) throw error
        throw new ApiError('The request timed out. Check your connection and try again.', { code: 'TIMEOUT' })
      }
      throw new ApiError('The service is unavailable. Check your connection and try again.', { code: 'NETWORK_ERROR' })
    } finally {
      clearTimeout(timeout)
      callerSignal?.removeEventListener('abort', abortFromCaller)
    }
  }

  async getArrayBuffer(path: string, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<ArrayBuffer> {
    if (!apiBaseUrl) throw new ApiError('The mobile service address is not configured.', { code: 'SERVICE_UNAVAILABLE' })
    const controller = new AbortController()
    const callerSignal = options.signal
    let timedOut = false
    const abortFromCaller = () => controller.abort()
    if (callerSignal?.aborted) controller.abort()
    else callerSignal?.addEventListener('abort', abortFromCaller, { once: true })
    const timeout = setTimeout(() => { timedOut = true; controller.abort() }, options.timeoutMs ?? defaultTimeoutMs)
    const headers = new Headers(options.headers)
    headers.set('accept', 'model/gltf-binary')
    headers.set('x-request-id', requestId())
    const session = this.getSession()
    if (session) headers.set('x-nuxt-session', session)

    try {
      const response = await fetch(`${apiBaseUrl}${path}`, { ...options, headers, signal: controller.signal })
      if (!response.ok) {
        const text = await response.text()
        let body: unknown = null
        try { body = text ? JSON.parse(text) : null } catch { body = null }
        throw normalizeApiError(response.status, body)
      }
      return await response.arrayBuffer()
    } catch (error) {
      if (error instanceof ApiError) throw error
      if (error instanceof Error && error.name === 'AbortError') {
        if (callerSignal?.aborted && !timedOut) throw error
        throw new ApiError('The request timed out. Check your connection and try again.', { code: 'TIMEOUT' })
      }
      throw new ApiError('The service is unavailable. Check your connection and try again.', { code: 'NETWORK_ERROR' })
    } finally {
      clearTimeout(timeout)
      callerSignal?.removeEventListener('abort', abortFromCaller)
    }
  }

  get<T>(path: string, options?: Omit<RequestOptions, 'method'>) { return this.request<T>(path, { ...options, method: 'GET' }) }
  post<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) { return this.request<T>(path, { ...options, method: 'POST', body }) }
  delete<T>(path: string, options?: Omit<RequestOptions, 'method'>) { return this.request<T>(path, { ...options, method: 'DELETE' }) }
}
