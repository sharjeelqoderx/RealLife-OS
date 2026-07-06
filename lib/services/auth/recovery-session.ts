import type {
  RecoverySessionInput,
  RecoverySessionResponse,
} from "@/schemas/auth/recovery-session"
import { createClient } from "@/lib/supabase/server"
import { mapSupabaseAuthError } from "@/lib/services/auth/errors"

export async function establishRecoverySession(
  input: RecoverySessionInput
): Promise<RecoverySessionResponse> {
  const supabase = await createClient()

  const { error } = await supabase.auth.setSession({
    access_token: input.access_token,
    refresh_token: input.refresh_token,
  })

  if (error) {
    throw mapSupabaseAuthError(error)
  }

  return { success: true }
}
