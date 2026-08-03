import type { CloudflareAuth } from "@/lib/cloudflare/config"

export const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4"

export type CloudflareApiErrorItem = {
  code?: number
  message?: string
  documentation_url?: string
  source?: { pointer?: string }
}

export type CloudflareApiResponse<T> = {
  success?: boolean
  result?: T
  errors?: CloudflareApiErrorItem[]
  messages?: CloudflareApiErrorItem[]
  result_info?: unknown
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
  if (auth.mode === "apiToken") {
    return { Authorization: `Bearer ${auth.token}` }
  }

  return {
    "X-Auth-Email": auth.email,
    "X-Auth-Key": auth.apiKey,
  }
}

export type CloudflareRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  path: string
  auth: CloudflareAuth
  body?: unknown
  searchParams?: Record<string, string | number | undefined>
}

export async function cloudflareRequest<T>(
  options: CloudflareRequestOptions
): Promise<T> {
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

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(auth),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
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

  if (!res.ok || data.success === false) {
    const message =
      data.errors?.[0]?.message ??
      `Cloudflare API request failed (${res.status})`
    console.error("Cloudflare API error:", method, path, res.status, data)
    throw new CloudflareApiError(message, res.status, data.errors ?? [])
  }

  return data.result as T
}
