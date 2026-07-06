export class AuthServiceError extends Error {
  status: number
  code?: string
  details?: string

  constructor(
    message: string,
    status = 400,
    code?: string,
    details?: string
  ) {
    super(message)
    this.name = "AuthServiceError"
    this.status = status
    this.code = code
    this.details = details
  }
}

type SupabaseAuthError = {
  message?: string
  code?: string
  status?: number
  name?: string
}

const ERROR_CODE_MESSAGES: Record<
  string,
  { message: string; status: number; code: string }
> = {
  email_provider_disabled: {
    message:
      "Password reset emails are not enabled. Configure email in your Supabase project.",
    status: 503,
    code: "EMAIL_PROVIDER_DISABLED",
  },
  over_email_send_rate_limit: {
    message: "Too many reset emails sent. Please try again later.",
    status: 429,
    code: "RATE_LIMIT",
  },
  over_request_rate_limit: {
    message: "Too many requests. Please try again later.",
    status: 429,
    code: "RATE_LIMIT",
  },
  email_address_invalid: {
    message: "Enter a valid email address",
    status: 400,
    code: "INVALID_EMAIL",
  },
  validation_failed: {
    message: "Invalid request. Please check your email and try again.",
    status: 400,
    code: "VALIDATION_FAILED",
  },
  user_not_found: {
    message: "No account found with this email address",
    status: 404,
    code: "USER_NOT_FOUND",
  },
  unexpected_failure: {
    message: "Failed to send password reset email",
    status: 500,
    code: "EMAIL_SEND_FAILED",
  },
  hook_timeout: {
    message:
      "Password reset email timed out. Check Supabase Auth hooks and email settings.",
    status: 504,
    code: "EMAIL_SEND_FAILED",
  },
  hook_timeout_after_retry: {
    message:
      "Password reset email timed out. Check Supabase Auth hooks and email settings.",
    status: 504,
    code: "EMAIL_SEND_FAILED",
  },
  email_address_not_authorized: {
    message:
      "This email address is not authorized to receive messages from this project.",
    status: 403,
    code: "EMAIL_NOT_AUTHORIZED",
  },
}

function getSupabaseErrorMessage(error: SupabaseAuthError): string {
  const message = error.message?.trim()

  if (message && message !== "{}" && message !== "[]") {
    return message
  }

  if (error.code && ERROR_CODE_MESSAGES[error.code]) {
    return ERROR_CODE_MESSAGES[error.code].message
  }

  if (error.code) {
    return error.code.replace(/_/g, " ")
  }

  return "Authentication request failed"
}

function hasSpecificMessage(message: string | undefined): message is string {
  const trimmed = message?.trim()
  return (
    !!trimmed &&
    trimmed !== "{}" &&
    trimmed !== "[]" &&
    trimmed !== "Authentication request failed"
  )
}

export function mapSupabaseAuthError(error: SupabaseAuthError): AuthServiceError {
  const rawMessage = getSupabaseErrorMessage(error)
  const message = rawMessage.toLowerCase()

  if (error.code && ERROR_CODE_MESSAGES[error.code]) {
    const mapped = ERROR_CODE_MESSAGES[error.code]
    return new AuthServiceError(
      hasSpecificMessage(error.message) ? error.message.trim() : mapped.message,
      mapped.status,
      mapped.code
    )
  }

  if (
    rawMessage === "Authentication request failed" &&
    error.status &&
    error.status >= 500
  ) {
    return new AuthServiceError(
      "Failed to send password reset email. Check Supabase Auth logs for details.",
      500,
      "EMAIL_SEND_FAILED"
    )
  }

  if (message.includes("invalid login credentials")) {
    return new AuthServiceError(
      "Invalid email or password",
      401,
      "INVALID_CREDENTIALS"
    )
  }

  if (message.includes("email not confirmed")) {
    return new AuthServiceError(
      "Please confirm your email before signing in",
      403,
      "EMAIL_NOT_CONFIRMED"
    )
  }

  if (
    message.includes("user already registered") ||
    message.includes("already been registered") ||
    message.includes("already exists") ||
    message.includes("already in use")
  ) {
    return new AuthServiceError(
      "An account with this email already exists",
      409,
      "EMAIL_ALREADY_EXISTS"
    )
  }

  if (message.includes("otp expired") || message.includes("expired")) {
    return new AuthServiceError(
      "This link has expired. Please request a new one.",
      410,
      "EXPIRED_TOKEN"
    )
  }

  if (
    message === "error sending recovery email" ||
    message === "error sending confirmation email"
  ) {
    return new AuthServiceError(
      "We couldn't send the reset email right now. Please try again in a few minutes.",
      500,
      "EMAIL_SEND_FAILED"
    )
  }

  if (
    message.includes("redirect") ||
    message.includes("not allowed") ||
    message.includes("url")
  ) {
    return new AuthServiceError(
      "Password reset redirect URL is not allowed. Add your site URL in Supabase Auth settings.",
      400,
      "REDIRECT_NOT_ALLOWED"
    )
  }

  if (
    message.includes("invalid") ||
    message.includes("token") ||
    message.includes("auth session missing")
  ) {
    return new AuthServiceError(
      "This link is invalid. Please try again.",
      404,
      "INVALID_TOKEN"
    )
  }

  return new AuthServiceError(
    rawMessage,
    error.status ?? 400,
    error.code
  )
}
