import type { LogoutResponse } from "@/schemas/auth/logout"
import { createClient } from "@/lib/supabase/server"
import { mapSupabaseAuthError } from "@/lib/services/auth/errors"

export async function logoutUser(): Promise<LogoutResponse> {
  const supabase = await createClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    throw mapSupabaseAuthError(error)
  }

  return {
    success: true,
    message: "Logged out successfully",
  }
}
