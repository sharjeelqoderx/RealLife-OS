import { createClient as createSupabaseClient } from "@supabase/supabase-js"

import {
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from "@/lib/env"
import type { Database } from "@/types/supabase"

export function createAdminClient() {
  return createSupabaseClient<Database>(
    getSupabaseUrl(),
    getSupabaseServiceRoleKey(),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
