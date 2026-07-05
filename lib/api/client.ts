type ApiErrorBody = {
  error?: string | Record<string, string[] | undefined>
}

export class ApiError extends Error {
  status: number
  body: ApiErrorBody

  constructor(status: number, body: ApiErrorBody) {
    super(typeof body.error === "string" ? body.error : "Request failed")
    this.name = "ApiError"
    this.status = status
    this.body = body
  }
}

export async function apiClient<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  })

  const data: unknown = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new ApiError(response.status, data as ApiErrorBody)
  }

  return data as T
}
