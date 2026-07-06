import { AuthServiceError } from "@/lib/services/auth/errors"
import { ResetTokenError } from "@/lib/services/auth/change-password"

export function handleAuthRouteError(error: unknown) {
  if (error instanceof AuthServiceError) {
    const body: {
      error: string
      code?: string
      details?: string
    } = {
      error: error.message,
      code: error.code,
    }

    if (process.env.NODE_ENV === "development" && error.details) {
      body.details = error.details
    }

    return Response.json(body, { status: error.status })
  }

  if (error instanceof ResetTokenError) {
    return Response.json(
      { error: error.message, code: error.code },
      { status: error.code === "EXPIRED_TOKEN" ? 410 : 404 }
    )
  }

  const message = error instanceof Error ? error.message : "Request failed"
  return Response.json({ error: message }, { status: 500 })
}
