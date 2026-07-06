import { ApiError } from "@/lib/api/client"

const FORGET_PASSWORD_ERRORS: Record<string, string> = {
  EMAIL_SEND_FAILED:
    "We couldn't send the reset email right now. Please try again in a few minutes.",
  EMAIL_PROVIDER_DISABLED:
    "Password reset emails are temporarily unavailable. Please try again later.",
  RATE_LIMIT: "Too many attempts. Please wait a few minutes and try again.",
  INVALID_EMAIL: "Enter a valid email address.",
  VALIDATION_FAILED: "Please check your email and try again.",
  USER_NOT_FOUND: "No account found with this email address.",
  EMAIL_NOT_AUTHORIZED:
    "This email address cannot receive messages from us.",
  REDIRECT_NOT_ALLOWED:
    "Something went wrong. Please try again later.",
}

export function getForgetPasswordErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.code) {
    return (
      FORGET_PASSWORD_ERRORS[error.code] ??
      "Something went wrong. Please try again."
    )
  }

  return "Something went wrong. Please try again."
}
