import type {
  ChangePasswordInput,
  ChangePasswordResponse,
  ValidateResetTokenResponse,
} from "@/schemas/auth/change-password"

export class ResetTokenError extends Error {
  code: "INVALID_TOKEN" | "EXPIRED_TOKEN"

  constructor(
    message: string,
    code: "INVALID_TOKEN" | "EXPIRED_TOKEN"
  ) {
    super(message)
    this.name = "ResetTokenError"
    this.code = code
  }
}

export async function validateResetToken(
  id: string
): Promise<ValidateResetTokenResponse> {
  if (id === "expired-reset-id") {
    throw new ResetTokenError(
      "This reset link has expired. Please request a new one.",
      "EXPIRED_TOKEN"
    )
  }

  if (id === "valid-reset-id") {
    return { valid: true }
  }

  throw new ResetTokenError(
    "This reset link is invalid. Please request a new one.",
    "INVALID_TOKEN"
  )
}

export async function changePassword(
  input: ChangePasswordInput
): Promise<ChangePasswordResponse> {
  await validateResetToken(input.id)

  return {
    success: true,
    message: "Password changed successfully",
  }
}
