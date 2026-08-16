import type { CloudflareAuth } from "@/lib/cloudflare/config"

export const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4"

export type CloudflareApiErrorItem = {
  code?: number
  message?: string
  documentation_url?: string
  source?: { pointer?: string }
}

export type CloudflareApiResponse<T> = {
  success: boolean
  result: T
  errors: CloudflareApiErrorItem[]
  messages: CloudflareApiErrorItem[]
  result_info?: CloudflarePagination
}

export type CloudflarePagination = {
  cursor?: string
  page?: number
  per_page?: number
  total_count?: number
}

export type CloudflareResult<T> = {
  result: T
  resultInfo?: CloudflarePagination
}

export class CloudflareApiError extends Error {
  readonly status: number
  readonly errors: CloudflareApiErrorItem[]

  constructor(
    message: string,
    status: number,
    errors: CloudflareApiErrorItem[] = []
  ) {
    super(message)
    this.name = "CloudflareApiError"
    this.status = status
    this.errors = errors
  }
}

function authHeaders(auth: CloudflareAuth): Record<string, string> {
  return { Authorization: `Bearer ${auth.token}` }
}

export type CloudflareRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  path: string
  auth: CloudflareAuth
  body?: unknown
  searchParams?: Record<string, string | number | undefined>
}

const REQUEST_TIMEOUT_MS = 10_000
const TRANSIENT_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504])

function retryDelay(attempt: number): number {
  return 250 * 2 ** attempt
}

async function requestCloudflare<T>(
  options: CloudflareRequestOptions
): Promise<CloudflareApiResponse<T>> {
  const { method = "GET", path, auth, body, searchParams } = options
  const url = new URL(
    path.startsWith("http") ? path : `${CLOUDFLARE_API_BASE}${path}`
  )

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value))
      }
    }
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(auth),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: "no-store",
        signal: controller.signal,
      })

      let data: CloudflareApiResponse<T>
      try {
        data = (await res.json()) as CloudflareApiResponse<T>
      } catch {
        throw new CloudflareApiError(
          `Cloudflare API returned non-JSON (${res.status})`,
          res.status
        )
      }

      if (res.ok && data.success) {
        return data
      }

      const message =
        data.errors?.[0]?.message ??
        `Cloudflare API request failed (${res.status})`

      if (
        method !== "POST" &&
        attempt < 2 &&
        TRANSIENT_STATUS_CODES.has(res.status)
      ) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay(attempt)))
        continue
      }

      console.error("Cloudflare API request failed", {
        method,
        path,
        status: res.status,
        errorCodes: data.errors?.map((error) => error.code),
      })
      throw new CloudflareApiError(message, res.status, data.errors ?? [])
    } catch (error) {
      if (
        method !== "POST" &&
        attempt < 2 &&
        (error instanceof DOMException ||
          (error instanceof CloudflareApiError &&
            TRANSIENT_STATUS_CODES.has(error.status)))
      ) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay(attempt)))
        continue
      }
      throw error
    } finally {
      clearTimeout(timeout)
    }
  }

  throw new CloudflareApiError("Cloudflare API request failed", 502)
}

export async function cloudflareRequest<T>(
  options: CloudflareRequestOptions
): Promise<T> {
  return (await requestCloudflare<T>(options)).result
}

export async function cloudflareRequestWithPagination<T>(
  options: CloudflareRequestOptions
): Promise<CloudflareResult<T>> {
  const data = await requestCloudflare<T>(options)
  return { result: data.result, resultInfo: data.result_info }
}
