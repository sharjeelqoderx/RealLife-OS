import { createClient } from "@/lib/supabase/server"
import { AUTH_ROLES, isAdminRole } from "@/lib/auth/roles"
import { createAdminClient } from "@/lib/supabase/admin"

export class AdminServiceError extends Error {
  readonly status: number
  readonly code: string

  constructor(message: string, status = 403, code = "FORBIDDEN") {
    super(message)
    this.name = "AdminServiceError"
    this.status = status
    this.code = code
  }
}

/**
 * Bootstrap / first ADMIN only. Sign-up never creates ADMIN.
 * ADMIN_EMAILS lets the platform owner open admin once, then promote others
 * via app_metadata.role = ADMIN.
 */
function configuredBootstrapAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? ""
  return new Set(
    raw
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  )
}

async function syncBootstrapAdminRole(userId: string): Promise<void> {
  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.getUserById(userId)
  if (error || !data.user) return
  if (isAdminRole(data.user)) return

  await admin.auth.admin.updateUserById(userId, {
    app_metadata: {
      ...data.user.app_metadata,
      role: AUTH_ROLES.ADMIN,
    },
  })
}

export async function requireAdminUser(): Promise<{
  id: string
  email: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    throw new AdminServiceError("Unauthorized", 401, "UNAUTHORIZED")
  }

  if (isAdminRole(user)) {
    return { id: user.id, email: user.email }
  }

  const email = user.email.trim().toLowerCase()
  if (configuredBootstrapAdminEmails().has(email)) {
    await syncBootstrapAdminRole(user.id)
    return { id: user.id, email: user.email }
  }

  throw new AdminServiceError("Administrator access required", 403, "FORBIDDEN")
}
