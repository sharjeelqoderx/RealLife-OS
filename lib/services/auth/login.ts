import type { LoginInput, LoginResponse } from "@/schemas/auth/login"
import { createClient } from "@/lib/supabase/server"
import { mapSupabaseAuthError } from "@/lib/services/auth/errors"

export async function loginUser(input: LoginInput): Promise<LoginResponse> {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  })

  if (error) {
    throw mapSupabaseAuthError(error)
  }

  return {
    success: true,
    message: "Login successful",
  }
}
