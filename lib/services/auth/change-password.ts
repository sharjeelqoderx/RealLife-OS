import type {
  ChangePasswordInput,
  ChangePasswordResponse,
  ValidateResetTokenResponse,
} from "@/schemas/auth/change-password"
import { createClient } from "@/lib/supabase/server"
import { mapSupabaseAuthError } from "@/lib/services/auth/errors"

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

export async function validateRecoverySession(): Promise<ValidateResetTokenResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    if (
      error.message.toLowerCase().includes("expired") ||
      error.message.toLowerCase().includes("jwt")
    ) {
      throw new ResetTokenError(
        "This reset link has expired. Please request a new one.",
        "EXPIRED_TOKEN"
      )
    }

    throw new ResetTokenError(
      "This reset link is invalid. Please request a new one.",
      "INVALID_TOKEN"
    )
  }

  if (!user) {
    throw new ResetTokenError(
      "This reset link is invalid. Please request a new one.",
      "INVALID_TOKEN"
    )
  }

  return { valid: true }
}

export async function changePassword(
  input: ChangePasswordInput
): Promise<ChangePasswordResponse> {
  await validateRecoverySession()

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({
    password: input.password,
  })

  if (error) {
    throw mapSupabaseAuthError(error)
  }

  return {
    success: true,
    message: "Password changed successfully",
  }
}
