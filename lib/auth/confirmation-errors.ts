export const AUTH_CONFIRM_ERRORS = {
  invalid_confirmation_link: "The confirmation link is invalid or has already been used.",
  email_confirmation_failed: "Email confirmation failed. Please try again or sign in.",
  recovery_confirmation_failed:
    "Password reset link is invalid or expired. Please request a new one.",
} as const

export type AuthConfirmErrorCode = keyof typeof AUTH_CONFIRM_ERRORS

export function getAuthConfirmErrorMessage(
  code: string | undefined
): string | null {
  if (!code) {
    return null
  }

  if (code in AUTH_CONFIRM_ERRORS) {
    return AUTH_CONFIRM_ERRORS[code as AuthConfirmErrorCode]
  }

  return "Authentication failed. Please try again."
}
