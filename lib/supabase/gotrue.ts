import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/env"
import {
  AuthServiceError,
  mapSupabaseAuthError,
} from "@/lib/services/auth/errors"

const API_VERSION = "2024-01-01"

type GoTrueErrorBody = {
  msg?: string
  message?: string
  error?: string
  error_description?: string
  error_code?: string
  code?: string | number
}

function getGoTrueHeaders(): Record<string, string> {
  const anonKey = getSupabaseAnonKey()

  return {
    "Content-Type": "application/json",
    "X-Supabase-Api-Version": API_VERSION,
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
  }
}

function extractErrorCode(body: GoTrueErrorBody): string | undefined {
  if (typeof body.error_code === "string") {
    return body.error_code
  }

  if (typeof body.code === "string") {
    return body.code
  }

  return undefined
}

function extractErrorMessage(body: GoTrueErrorBody): string | undefined {
  const message =
    body.msg ??
    body.message ??
    (typeof body.error === "string" ? body.error : undefined) ??
    body.error_description

  const trimmed = message?.trim()

  if (trimmed && trimmed !== "{}" && trimmed !== "[]") {
    return trimmed
  }

  return undefined
}

function formatErrorDetails(body: unknown): string | undefined {
  if (body === null || body === undefined) {
    return undefined
  }

  if (typeof body === "object" && Object.keys(body as object).length === 0) {
    return undefined
  }

  return typeof body === "string" ? body : JSON.stringify(body)
}

function parseGoTrueErrorBody(body: unknown, status: number): AuthServiceError {
  const details =
    process.env.NODE_ENV === "development"
      ? formatErrorDetails(body)
      : undefined

  if (typeof body !== "object" || body === null) {
    if (status >= 500) {
      const mapped = mapSupabaseAuthError({ code: "unexpected_failure", status })
      mapped.details = details
      return mapped
    }

    const mapped = mapSupabaseAuthError({
      message: "Authentication request failed",
      status,
    })
    mapped.details = details
    return mapped
  }

  const parsed = body as GoTrueErrorBody
  const code = extractErrorCode(parsed)
  const message = extractErrorMessage(parsed)

  if (!message && !code && status >= 500) {
    const mapped = mapSupabaseAuthError({ code: "unexpected_failure", status })
    mapped.details = details
    return mapped
  }

  const mapped = mapSupabaseAuthError({
    message,
    code,
    status,
  })
  mapped.details = details
  return mapped
}

export async function recoverPasswordForEmail(
  email: string,
  redirectTo: string
): Promise<void> {
  const query = new URLSearchParams({ redirect_to: redirectTo })

  const response = await fetch(
    `${getSupabaseUrl()}/auth/v1/recover?${query.toString()}`,
    {
      method: "POST",
      headers: getGoTrueHeaders(),
      body: JSON.stringify({ email }),
    }
  )

  if (response.ok) {
    return
  }

  let body: unknown = null

  try {
    body = await response.json()
  } catch {
    body = null
  }

  if (process.env.NODE_ENV === "development") {
    console.error("[auth/recover] failed", {
      status: response.status,
      redirectTo,
      body,
    })
  }

  throw parseGoTrueErrorBody(body, response.status)
}
