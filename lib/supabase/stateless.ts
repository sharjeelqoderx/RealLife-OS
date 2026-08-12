import { createClient as createSupabaseClient } from "@supabase/supabase-js"

import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/env"
import type { Database } from "@/types/supabase"

export function createStatelessClient() {
  return createSupabaseClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      flowType: "implicit",
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}
