import { createClient } from "@/lib/supabase/server"

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

function configuredAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? ""
  return new Set(
    raw
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  )
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

  const admins = configuredAdminEmails()
  if (!admins.has(user.email.trim().toLowerCase())) {
    throw new AdminServiceError("Administrator access required", 403, "FORBIDDEN")
  }

  return { id: user.id, email: user.email }
}
