import type { SignUpInput, SignUpResponse } from "@/schemas/auth/sign-up"
import { getAuthConfirmUrl } from "@/lib/env"
import { createClient } from "@/lib/supabase/server"
import { mapSupabaseAuthError, AuthServiceError } from "@/lib/services/auth/errors"

export async function signUpUser(input: SignUpInput): Promise<SignUpResponse> {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        full_name: input.fullName,
      },
      emailRedirectTo: getAuthConfirmUrl("/dashboard"),
    },
  })

  if (error) {
    throw mapSupabaseAuthError(error)
  }

  if (data.user && data.user.identities?.length === 0) {
    throw new AuthServiceError(
      "An account with this email already exists",
      409,
      "EMAIL_ALREADY_EXISTS"
    )
  }

  const needsEmailConfirmation = !data.session

  return {
    success: true,
    message: needsEmailConfirmation
      ? "Please check your email to confirm your account"
      : "Account created successfully",
  }
}
