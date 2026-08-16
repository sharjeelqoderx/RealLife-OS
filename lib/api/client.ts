type ApiErrorBody = {
  error?:
    | string
    | Record<string, string[] | undefined>
    | { code?: string; message?: string }
  code?: string
  details?: string
  success?: boolean
}

export class ApiError extends Error {
  status: number
  body: ApiErrorBody
  code?: string
  details?: string

  constructor(status: number, body: ApiErrorBody) {
    const nestedMessage =
      body.error &&
      typeof body.error === "object" &&
      "message" in body.error &&
      typeof body.error.message === "string"
        ? body.error.message
        : undefined
    super(
      typeof body.error === "string"
        ? body.error
        : nestedMessage ?? "Request failed"
    )
    this.name = "ApiError"
    this.status = status
    this.body = body
    this.code =
      typeof body.error === "object" &&
      body.error &&
      "code" in body.error &&
      typeof body.error.code === "string"
        ? body.error.code
        : body.code
    this.details = body.details
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
