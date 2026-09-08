import { AUTH_ROLES, isAdminRole, type AuthRole } from "@/lib/auth/roles"
import {
  AdminServiceError,
  requireAdminUser,
} from "@/lib/services/admin/require-admin"
import { createAdminClient } from "@/lib/supabase/admin"

export type AdminListedUser = {
  id: string
  email: string
  fullName: string | null
  role: AuthRole
  createdAt: string
  lastSignInAt: string | null
}

function mapAuthUser(row: {
  id: string
  email?: string
  created_at: string
  last_sign_in_at?: string | null
  app_metadata?: Record<string, unknown>
  user_metadata?: Record<string, unknown>
}): AdminListedUser | null {
  if (!row.email) return null
  const fullName = row.user_metadata?.full_name
  return {
    id: row.id,
    email: row.email,
    fullName: typeof fullName === "string" ? fullName : null,
    role: isAdminRole(row) ? AUTH_ROLES.ADMIN : AUTH_ROLES.USER,
    createdAt: row.created_at,
    lastSignInAt: row.last_sign_in_at ?? null,
  }
}

async function listAllAuthUsers(): Promise<AdminListedUser[]> {
  const admin = createAdminClient()
  const users: AdminListedUser[] = []
  let page = 1
  const perPage = 100

  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) {
      throw new AdminServiceError(error.message, 500, "LIST_USERS_FAILED")
    }

    for (const row of data.users) {
      const mapped = mapAuthUser(row)
      if (mapped) users.push(mapped)
    }

    if (data.users.length < perPage) break
    page += 1
    if (page > 50) break
  }

  return users
}

export async function listAdminUsers(): Promise<AdminListedUser[]> {
  await requireAdminUser()
  const users = await listAllAuthUsers()
  users.sort((a, b) => a.email.localeCompare(b.email))
  return users
}

export async function setAuthUserRole(
  targetUserId: string,
  role: AuthRole
): Promise<AdminListedUser> {
  const actor = await requireAdminUser()

  if (role !== AUTH_ROLES.USER && role !== AUTH_ROLES.ADMIN) {
    throw new AdminServiceError("Invalid role", 400, "INVALID_ROLE")
  }

  if (targetUserId === actor.id && role !== AUTH_ROLES.ADMIN) {
    throw new AdminServiceError(
      "You cannot remove your own ADMIN role",
      400,
      "CANNOT_DEMOTE_SELF"
    )
  }

  const admin = createAdminClient()
  const { data: existing, error: getError } =
    await admin.auth.admin.getUserById(targetUserId)

  if (getError || !existing.user?.email) {
    throw new AdminServiceError("User not found", 404, "USER_NOT_FOUND")
  }

  if (role === AUTH_ROLES.USER && isAdminRole(existing.user)) {
    const all = await listAllAuthUsers()
    const otherAdmins = all.filter(
      (u) => u.role === AUTH_ROLES.ADMIN && u.id !== targetUserId
    )
    if (otherAdmins.length === 0) {
      throw new AdminServiceError(
        "Cannot remove the last ADMIN",
        400,
        "LAST_ADMIN"
      )
    }
  }

  const { data: updated, error: updateError } =
    await admin.auth.admin.updateUserById(targetUserId, {
      app_metadata: {
        ...existing.user.app_metadata,
        role,
      },
      user_metadata: {
        ...existing.user.user_metadata,
        role: role === AUTH_ROLES.ADMIN ? AUTH_ROLES.ADMIN : AUTH_ROLES.USER,
      },
    })

  if (updateError || !updated.user?.email) {
    throw new AdminServiceError(
      updateError?.message ?? "Failed to update role",
      500,
      "UPDATE_ROLE_FAILED"
    )
  }

  await admin.from("audit_log").insert({
    user_id: actor.id,
    action:
      role === AUTH_ROLES.ADMIN ? "ADMIN_PROMOTED_USER" : "ADMIN_DEMOTED_USER",
    resource_type: "auth_user",
    resource_id: targetUserId,
    metadata: { role, email: updated.user.email },
  })

  const mapped = mapAuthUser(updated.user)
  if (!mapped) {
    throw new AdminServiceError("Failed to update role", 500, "UPDATE_ROLE_FAILED")
  }
  return mapped
}
