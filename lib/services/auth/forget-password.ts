import type {

  ForgetPasswordInput,

  ForgetPasswordResponse,

} from "@/schemas/auth/forget-password"

import { getPasswordRecoveryConfirmUrl } from "@/lib/env"
import { recoverPasswordForEmail } from "@/lib/supabase/gotrue"
import { AuthServiceError } from "@/lib/services/auth/errors"
import { getUserByEmail } from "@/lib/services/auth/get-user-by-email"

export async function requestPasswordReset(
  input: ForgetPasswordInput
): Promise<ForgetPasswordResponse> {
  const user = await getUserByEmail(input.email)

  if (!user) {
    throw new AuthServiceError(
      "No account found with this email address",
      404,
      "USER_NOT_FOUND"
    )
  }

  await recoverPasswordForEmail(
    input.email,
    getPasswordRecoveryConfirmUrl()
  )



  return {

    success: true,

    message: "Password reset link sent to your email",

  }

}

